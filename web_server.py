"""Local web app for filling resume content and downloading Word resumes."""

from __future__ import annotations

import cgi
import copy
import json
import mimetypes
import shutil
import tempfile
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import unquote, urlparse

import resume_generator as rg

ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "web"
DATA_ROOT = ROOT / "data"
PHOTO_ROOT = DATA_ROOT / "photos"
LIBRARY_FILE = DATA_ROOT / "resume_library.json"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
DEFAULT_MAX_VERSIONS = 30
MAX_ALLOWED_VERSIONS = 300

JSONDict = dict[str, Any]


@dataclass(frozen=True)
class GeneratedDocx:
    filename: str
    content: bytes


class PayloadValidationError(ValueError):
    def __init__(self, errors: list[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = errors


class NotFoundError(ValueError):
    pass


def validate_payload(data: JSONDict) -> list[str]:
    basics = data.get("basics", {})
    checks = [
        ("name", "姓名不能为空"),
        ("phone", "手机号不能为空"),
        ("target_role", "目标岗位不能为空"),
    ]
    errors = [message for field, message in checks if not str(basics.get(field, "")).strip()]
    if not str(basics.get("phone", "")).strip() and not str(basics.get("email", "")).strip():
        errors.append("手机号或邮箱至少填写一个")
    if not data.get("education"):
        errors.append("至少需要一条教育经历")
    if not data.get("projects") and not data.get("experience"):
        errors.append("至少需要一段项目经历或实习经历")
    return errors


def merge_photo_upload(data: JSONDict, photo_path: Path) -> JSONDict:
    merged = copy.deepcopy(data)
    merged.setdefault("basics", {})["photo"] = {
        "enabled": True,
        "path": str(photo_path),
    }
    return merged


def default_library() -> JSONDict:
    return {
        "settings": {"max_versions": DEFAULT_MAX_VERSIONS},
        "versions": [],
    }


def load_library(library_path: Path = LIBRARY_FILE) -> JSONDict:
    if not library_path.exists():
        return default_library()

    raw = json.loads(library_path.read_text(encoding="utf-8"))
    raw.setdefault("settings", {})
    raw["settings"]["max_versions"] = normalize_max_versions(
        raw["settings"].get("max_versions", DEFAULT_MAX_VERSIONS)
    )
    raw.setdefault("versions", [])
    return raw


def write_library(library: JSONDict, library_path: Path = LIBRARY_FILE) -> None:
    library_path.parent.mkdir(parents=True, exist_ok=True)
    library_path.write_text(
        json.dumps(library, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def normalize_max_versions(value: Any) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = DEFAULT_MAX_VERSIONS
    return max(1, min(parsed, MAX_ALLOWED_VERSIONS))


def summarize_version(version: JSONDict) -> JSONDict:
    return {
        "id": version["id"],
        "created_at": version["created_at"],
        "title": version.get("title", ""),
        "name": version.get("name", ""),
        "target_role": version.get("target_role", ""),
        "school": version.get("school", ""),
        "has_jd": bool(version.get("jd")),
        "has_photo": bool(version.get("data", {}).get("basics", {}).get("photo", {}).get("path")),
    }


def list_resume_versions(library_path: Path = LIBRARY_FILE) -> JSONDict:
    library = load_library(library_path)
    return {
        "settings": library["settings"],
        "versions": [summarize_version(version) for version in library["versions"]],
    }


def get_resume_version(version_id: str, library_path: Path = LIBRARY_FILE) -> JSONDict:
    library = load_library(library_path)
    for version in library["versions"]:
        if version.get("id") == version_id:
            return version
    raise NotFoundError(f"版本不存在: {version_id}")


def update_library_settings(max_versions: Any, library_path: Path = LIBRARY_FILE) -> JSONDict:
    library = load_library(library_path)
    library["settings"]["max_versions"] = normalize_max_versions(max_versions)
    prune_library(library)
    write_library(library, library_path)
    return list_resume_versions(library_path)


def save_resume_version(
    data: JSONDict,
    jd_text: str = "",
    title: str = "",
    photo_path: Path | None = None,
    library_path: Path = LIBRARY_FILE,
    photo_root: Path = PHOTO_ROOT,
) -> JSONDict:
    errors = validate_payload(data)
    if errors:
        raise PayloadValidationError(errors)

    library = load_library(library_path)
    version_id = build_version_id()
    resume_data = copy.deepcopy(data)
    if photo_path is not None:
        stored_photo = persist_photo(photo_path, version_id, photo_root)
        resume_data = merge_photo_upload(resume_data, stored_photo)

    basics = resume_data.get("basics", {})
    education = resume_data.get("education") or []
    school = education[0].get("school", "") if education else ""
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    title_text = build_version_title(
        basics,
        created_at,
        title=title,
        school=school,
        version_number=len(library.get("versions", [])) + 1,
    )
    version = {
        "id": version_id,
        "created_at": created_at,
        "title": ensure_unique_title(title_text, library),
        "name": basics.get("name", ""),
        "target_role": basics.get("target_role", ""),
        "school": school,
        "jd": jd_text,
        "data": resume_data,
    }

    library["versions"].insert(0, version)
    prune_library(library, photo_root=photo_root)
    write_library(library, library_path)
    return version


def build_version_id() -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"{timestamp}_{uuid.uuid4().hex[:8]}"


def build_version_title(
    basics: JSONDict,
    created_at: str,
    title: str = "",
    school: str = "",
    version_number: int = 1,
) -> str:
    """Build a human-readable title that changes on every save."""
    timestamp = format_title_time(created_at)
    base_title = title.strip()
    if not base_title:
        role = normalize_title_part(str(basics.get("target_role", "简历")).split("/")[0])
        parts = [
            normalize_title_part(str(basics.get("name", "未命名"))),
            role or "简历",
            normalize_title_part(school),
        ]
        base_title = "｜".join(part for part in parts if part)
    return f"{base_title}｜{timestamp}｜v{max(1, version_number):02d}"


def format_title_time(created_at: str) -> str:
    try:
        parsed = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now().strftime("%Y-%m-%d %H%M")
    return parsed.astimezone().strftime("%Y-%m-%d %H%M")


def normalize_title_part(value: str) -> str:
    return " ".join(value.replace("|", " ").replace("｜", " ").split())


def ensure_unique_title(title: str, library: JSONDict) -> str:
    existing = {str(version.get("title", "")) for version in library.get("versions", [])}
    if title not in existing:
        return title

    suffix = 2
    candidate = f"{title}（{suffix}）"
    while candidate in existing:
        suffix += 1
        candidate = f"{title}（{suffix}）"
    return candidate


def persist_photo(photo_path: Path, version_id: str, photo_root: Path) -> Path:
    photo_root.mkdir(parents=True, exist_ok=True)
    suffix = photo_path.suffix or ".jpg"
    destination = photo_root / f"{version_id}{suffix}"
    shutil.copyfile(photo_path, destination)
    return destination.resolve()


def prune_library(library: JSONDict, photo_root: Path = PHOTO_ROOT) -> None:
    max_versions = normalize_max_versions(library.get("settings", {}).get("max_versions"))
    versions = library.get("versions", [])
    kept = versions[:max_versions]
    removed = versions[max_versions:]
    for version in removed:
        delete_version_photo(version, photo_root)
    library["versions"] = kept


def delete_version_photo(version: JSONDict, photo_root: Path) -> None:
    photo = version.get("data", {}).get("basics", {}).get("photo", {})
    raw_path = photo.get("path") if isinstance(photo, dict) else ""
    if not raw_path:
        return
    path = Path(raw_path)
    try:
        resolved_photo = path.resolve()
        resolved_root = photo_root.resolve()
    except OSError:
        return
    if resolved_photo == resolved_root or resolved_root not in resolved_photo.parents:
        return
    resolved_photo.unlink(missing_ok=True)


def generate_docx_bytes(
    data: JSONDict,
    jd_text: str = "",
    photo_path: Path | None = None,
    no_photo: bool = False,
) -> GeneratedDocx:
    errors = validate_payload(data)
    if errors:
        raise PayloadValidationError(errors)

    resume_data = copy.deepcopy(data)
    if photo_path is not None:
        resume_data = merge_photo_upload(resume_data, photo_path)
    if no_photo:
        resume_data.setdefault("basics", {})["photo"] = {"enabled": False, "path": ""}

    filename = rg.build_output_filename(resume_data)
    with tempfile.TemporaryDirectory() as temp_dir:
        output_path = Path(temp_dir) / filename
        rg.generate_resume_docx(resume_data, output_path, jd_text=jd_text)
        return GeneratedDocx(filename=filename, content=output_path.read_bytes())


@contextmanager
def temporary_docx(content: bytes) -> Iterator[Path]:
    with tempfile.TemporaryDirectory() as temp_dir:
        path = Path(temp_dir) / "resume.docx"
        path.write_bytes(content)
        yield path


class ResumeAppHandler(BaseHTTPRequestHandler):
    server_version = "ResumeGenerator/1.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/":
            self.serve_static(WEB_ROOT / "index.html")
            return
        if path == "/api/sample":
            self.send_json(rg.load_resume_data(ROOT / "candidate.example.json"))
            return
        if path == "/api/library":
            self.send_json(list_resume_versions())
            return
        if path.startswith("/api/library/"):
            version_id = unquote(path.removeprefix("/api/library/"))
            self.handle_get_version(version_id)
            return

        static_path = (WEB_ROOT / unquote(path.lstrip("/"))).resolve()
        if WEB_ROOT in static_path.parents and static_path.is_file():
            self.serve_static(static_path)
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/analyze":
            self.handle_analyze()
            return
        if parsed.path == "/api/generate":
            self.handle_generate()
            return
        if parsed.path == "/api/library/save":
            self.handle_save_version()
            return
        if parsed.path == "/api/library/settings":
            self.handle_library_settings()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def handle_get_version(self, version_id: str) -> None:
        try:
            self.send_json(get_resume_version(version_id))
        except NotFoundError as exc:
            self.send_json({"ok": False, "errors": [str(exc)]}, status=404)

    def handle_analyze(self) -> None:
        try:
            payload = self.read_json_body()
            data = payload.get("data", payload)
            errors = validate_payload(data)
            warnings = rg.analyze_resume(data)
            self.send_json({"ok": not errors, "errors": errors, "warnings": warnings})
        except Exception as exc:
            self.send_json({"ok": False, "errors": [str(exc)], "warnings": []}, status=400)

    def handle_generate(self) -> None:
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                data, jd_text, photo_path, no_photo = self.read_generate_form(Path(temp_dir))
                docx = generate_docx_bytes(data, jd_text=jd_text, photo_path=photo_path, no_photo=no_photo)
                encoded_name = docx.filename.encode("utf-8").decode("latin-1", errors="ignore")
                self.send_response(HTTPStatus.OK)
                self.send_header(
                    "Content-Type",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
                self.send_header("Content-Length", str(len(docx.content)))
                self.send_header("Content-Disposition", f'attachment; filename="{encoded_name}"')
                self.end_headers()
                self.wfile.write(docx.content)
        except PayloadValidationError as exc:
            self.send_json({"ok": False, "errors": exc.errors}, status=400)
        except Exception as exc:
            self.send_json({"ok": False, "errors": [str(exc)]}, status=500)

    def handle_save_version(self) -> None:
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                data, jd_text, title, photo_path = self.read_save_form(Path(temp_dir))
                version = save_resume_version(data, jd_text=jd_text, title=title, photo_path=photo_path)
                self.send_json({
                    "ok": True,
                    "version": summarize_version(version),
                    "library": list_resume_versions(),
                })
        except PayloadValidationError as exc:
            self.send_json({"ok": False, "errors": exc.errors}, status=400)
        except Exception as exc:
            self.send_json({"ok": False, "errors": [str(exc)]}, status=500)

    def handle_library_settings(self) -> None:
        try:
            payload = self.read_json_body()
            library = update_library_settings(payload.get("max_versions"))
            self.send_json({"ok": True, "library": library})
        except Exception as exc:
            self.send_json({"ok": False, "errors": [str(exc)]}, status=400)

    def read_generate_form(self, temp_dir: Path) -> tuple[JSONDict, str, Path | None, bool]:
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            payload = self.read_json_body()
            return payload["data"], payload.get("jd", ""), None, bool(payload.get("no_photo"))

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": content_type,
                "CONTENT_LENGTH": self.headers.get("Content-Length", "0"),
            },
        )
        raw_data = form.getfirst("data", "{}")
        data = json.loads(raw_data)
        jd_text = form.getfirst("jd", "")
        no_photo = form.getfirst("no_photo", "false") == "true"

        photo_path: Path | None = None
        photo_item = form["photo"] if "photo" in form else None
        if photo_item is not None and getattr(photo_item, "filename", ""):
            suffix = Path(photo_item.filename).suffix or ".jpg"
            photo_path = temp_dir / f"photo{suffix}"
            photo_path.write_bytes(photo_item.file.read())

        return data, jd_text, photo_path, no_photo

    def read_save_form(self, temp_dir: Path) -> tuple[JSONDict, str, str, Path | None]:
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            payload = self.read_json_body()
            return payload["data"], payload.get("jd", ""), payload.get("title", ""), None

        form = self.read_multipart_form(content_type)
        raw_data = form.getfirst("data", "{}")
        data = json.loads(raw_data)
        jd_text = form.getfirst("jd", "")
        title = form.getfirst("title", "")
        photo_path = self.extract_photo_upload(form, temp_dir)
        return data, jd_text, title, photo_path

    def read_multipart_form(self, content_type: str) -> cgi.FieldStorage:
        return cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": content_type,
                "CONTENT_LENGTH": self.headers.get("Content-Length", "0"),
            },
        )

    def extract_photo_upload(self, form: cgi.FieldStorage, temp_dir: Path) -> Path | None:
        photo_item = form["photo"] if "photo" in form else None
        if photo_item is None or not getattr(photo_item, "filename", ""):
            return None

        suffix = Path(photo_item.filename).suffix or ".jpg"
        photo_path = temp_dir / f"photo{suffix}"
        photo_path.write_bytes(photo_item.file.read())
        return photo_path

    def read_json_body(self) -> JSONDict:
        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length)
        return json.loads(raw_body.decode("utf-8"))

    def serve_static(self, path: Path) -> None:
        content = path.read_bytes()
        content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        if path.suffix == ".js":
            content_type = "text/javascript; charset=utf-8"
        elif path.suffix in {".html", ".css"}:
            content_type = f"text/{path.suffix[1:]}; charset=utf-8"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, payload: Any, status: int = 200) -> None:
        content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format: str, *args: Any) -> None:
        return


def run_server(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> None:
    server = ThreadingHTTPServer((host, port), ResumeAppHandler)
    print(f"简历生成器已启动: http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    run_server()
