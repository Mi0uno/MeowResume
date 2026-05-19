import copy
import tempfile
import unittest
from pathlib import Path

from docx import Document

import resume_generator as rg
import web_server


class WebServerTests(unittest.TestCase):
    def test_generate_docx_bytes_returns_openable_word_document(self):
        data = rg.load_resume_data(Path("candidate.example.json"))

        payload = web_server.generate_docx_bytes(data, jd_text="")

        self.assertTrue(payload.filename.endswith(".docx"))
        self.assertGreater(len(payload.content), 10_000)
        with web_server.temporary_docx(payload.content) as docx_path:
            document = Document(docx_path)
            text = "\n".join(paragraph.text for paragraph in document.paragraphs)
            self.assertIn("教育经历", text)

    def test_validate_payload_requires_name_and_one_contact_method(self):
        data = copy.deepcopy(rg.load_resume_data(Path("candidate.example.json")))
        data["basics"]["name"] = ""
        data["basics"]["phone"] = ""
        data["basics"]["email"] = ""

        errors = web_server.validate_payload(data)

        self.assertIn("姓名不能为空", errors)
        self.assertIn("手机号不能为空", errors)
        self.assertIn("手机号或邮箱至少填写一个", errors)

    def test_validate_payload_allows_phone_without_email(self):
        data = copy.deepcopy(rg.load_resume_data(Path("candidate.example.json")))
        data["basics"]["email"] = ""

        errors = web_server.validate_payload(data)

        self.assertNotIn("邮箱不能为空", errors)
        self.assertNotIn("手机号或邮箱至少填写一个", errors)

    def test_merge_photo_upload_enables_photo_slot(self):
        data = copy.deepcopy(rg.load_resume_data(Path("candidate.example.json")))
        data["basics"]["photo"] = {"enabled": False, "path": ""}

        merged = web_server.merge_photo_upload(data, Path("photo.jpg"))

        self.assertTrue(merged["basics"]["photo"]["enabled"])
        self.assertEqual(merged["basics"]["photo"]["path"], "photo.jpg")

    def test_save_resume_version_keeps_every_saved_version(self):
        data = rg.load_resume_data(Path("candidate.example.json"))

        with tempfile.TemporaryDirectory() as tmp:
            library_path = Path(tmp) / "library.json"
            first = web_server.save_resume_version(data, "JD A", library_path=library_path)
            data["basics"]["target_role"] = "安全工程师"
            second = web_server.save_resume_version(data, "JD B", library_path=library_path)

            library = web_server.load_library(library_path)

        self.assertNotEqual(first["id"], second["id"])
        self.assertEqual(len(library["versions"]), 2)
        self.assertEqual(library["versions"][0]["data"]["basics"]["target_role"], "安全工程师")
        self.assertEqual(library["versions"][1]["jd"], "JD A")
        self.assertRegex(library["versions"][0]["title"], r"v02")
        self.assertRegex(library["versions"][1]["title"], r"v01")

    def test_save_resume_version_auto_appends_unique_timestamp_and_counter(self):
        data = rg.load_resume_data(Path("candidate.example.json"))

        with tempfile.TemporaryDirectory() as tmp:
            library_path = Path(tmp) / "library.json"
            first = web_server.save_resume_version(data, "", title="投递版", library_path=library_path)
            second = web_server.save_resume_version(data, "", title="投递版", library_path=library_path)

        self.assertNotEqual(first["title"], second["title"])
        self.assertIn("投递版", first["title"])
        self.assertIn("v01", first["title"])
        self.assertIn("v02", second["title"])

    def test_max_versions_prunes_oldest_versions(self):
        data = rg.load_resume_data(Path("candidate.example.json"))

        with tempfile.TemporaryDirectory() as tmp:
            library_path = Path(tmp) / "library.json"
            web_server.update_library_settings(2, library_path=library_path)
            for index in range(4):
                data["basics"]["name"] = f"候选人{index}"
                web_server.save_resume_version(data, "", library_path=library_path)
            library = web_server.load_library(library_path)

        names = [version["data"]["basics"]["name"] for version in library["versions"]]
        self.assertEqual(library["settings"]["max_versions"], 2)
        self.assertEqual(names, ["候选人3", "候选人2"])

    def test_get_resume_version_returns_saved_payload(self):
        data = rg.load_resume_data(Path("candidate.example.json"))

        with tempfile.TemporaryDirectory() as tmp:
            library_path = Path(tmp) / "library.json"
            saved = web_server.save_resume_version(data, "JD", library_path=library_path)
            loaded = web_server.get_resume_version(saved["id"], library_path=library_path)

        self.assertEqual(loaded["data"]["basics"]["name"], data["basics"]["name"])
        self.assertEqual(loaded["jd"], "JD")


if __name__ == "__main__":
    unittest.main()
