const sections = [
  { id: "basics", label: "基础信息" },
  { id: "education", label: "教育经历" },
  { id: "skills", label: "专业技能" },
  { id: "experience", label: "实习经历" },
  { id: "projects", label: "项目&科研经历" },
  { id: "awards", label: "竞赛获奖" },
  { id: "certifications", label: "其它证书和荣誉" },
  { id: "format", label: "格式设置" },
  { id: "jd", label: "岗位 JD" },
  { id: "library", label: "简历库" },
];

const defaultFormat = () => ({
  body_east_asia_font: "DengXian",
  body_latin_font: "Calibri",
  heading_east_asia_font: "Microsoft YaHei",
  heading_latin_font: "Calibri",
  body_size: 9.7,
  detail_size: 9,
  bullet_size: 9.2,
  name_size: 17,
  section_size: 10.8,
  line_spacing: 1,
  top_margin: 0.45,
  bottom_margin: 0.45,
  left_margin: 0.55,
  right_margin: 0.55,
});

const emptyEducation = () => ({
  school: "",
  degree: "本科",
  major: "",
  start: "",
  end: "",
  gpa: "",
  rank: "",
  courses: [],
  honors: [],
});

const emptyExperience = () => ({
  organization: "",
  role: "",
  location: "",
  start: "",
  end: "",
  content: "",
  responsibilities: [],
  results: [],
  bullets: [],
});

const emptyProject = () => ({
  name: "",
  role: "",
  technologies: [],
  start: "",
  end: "",
  content: "",
  responsibilities: [],
  results: [],
  bullets: [],
});

const emptyAward = () => ({
  name: "",
  level: "",
  date: "",
  content: "",
  responsibilities: [],
  results: [],
});

let state = {
  section: "basics",
  data: null,
  jd: "",
  photoFile: null,
  versionTitle: "",
  lastSavedTitle: "",
  busy: "",
  library: { settings: { max_versions: 30 }, versions: [] },
  quality: { errors: [], warnings: [] },
};

const nav = document.getElementById("sectionNav");
const body = document.getElementById("sectionBody");
const saveState = document.getElementById("saveState");
const draftMeta = document.getElementById("draftMeta");
const previewName = document.getElementById("previewName");
const previewRole = document.getElementById("previewRole");
const previewContact = document.getElementById("previewContact");
const previewDocument = document.getElementById("previewDocument");
const qualityBox = document.getElementById("qualityBox");

document.getElementById("loadSampleBtn").addEventListener("click", loadSample);
document.getElementById("analyzeBtn").addEventListener("click", analyzeResume);
document.getElementById("saveVersionBtn").addEventListener("click", saveVersion);
document.getElementById("generateBtn").addEventListener("click", generateWord);

init();

async function init() {
  const draft = localStorage.getItem("resume-generator-draft");
  if (draft) {
    try {
      const parsed = JSON.parse(draft);
      state.data = parsed.data;
      state.jd = parsed.jd || "";
      state.versionTitle = parsed.versionTitle || "";
      state.lastSavedTitle = parsed.lastSavedTitle || "";
    } catch {
      await loadSample();
      return;
    }
  } else {
    await loadSample();
    return;
  }
  ensureShape();
  await loadLibrary();
  render();
}

async function loadSample() {
  const response = await fetch("/api/sample");
  state.data = await response.json();
  state.jd = "";
  state.photoFile = null;
  state.versionTitle = "";
  state.quality = { errors: [], warnings: [] };
  ensureShape();
  await loadLibrary();
  persist("已载入示例");
  render();
}

function ensureShape() {
  const data = state.data;
  data.basics ||= {};
  data.basics.links ||= [
    { label: "GitHub", url: "" },
    { label: "作品集", url: "" },
  ];
  data.basics.photo ||= { enabled: true, path: "" };
  data.education ||= [emptyEducation()];
  data.skills ||= { 编程语言: [], 后端与中间件: [], 工程与部署: [] };
  data.experience ||= [];
  data.projects ||= [];
  data.awards ||= [];
  data.certifications ||= [];
  data.format = { ...defaultFormat(), ...(data.format || {}) };
  data.experience = data.experience.map(normalizeExperienceEntry);
  data.projects = data.projects.map(normalizeExperienceEntry);
  data.awards = data.awards.map(normalizeAwardEntry);
}

function normalizeExperienceEntry(entry) {
  return {
    ...entry,
    content: entry.content || "",
    responsibilities: entry.responsibilities || [],
    results: entry.results || [],
    bullets: entry.bullets || [],
  };
}

function normalizeAwardEntry(entry) {
  if (typeof entry === "string") {
    const compact = splitDisplayItem(entry);
    const meta = splitCompactParts(compact.right);
    const singleMetaIsDate = meta.length === 1 && isLikelyDate(meta[0]);
    return {
      ...emptyAward(),
      name: compact.left,
      level: singleMetaIsDate ? "" : meta[0] || "",
      date: singleMetaIsDate ? meta[0] : meta.slice(1).join(" | "),
    };
  }

  return {
    ...emptyAward(),
    ...entry,
    content: entry.content || "",
    responsibilities: entry.responsibilities || [],
    results: entry.results || [],
  };
}

function isLikelyDate(value) {
  return /\b(19|20)\d{2}\b|至今|现在|present/i.test(String(value || ""));
}

function render() {
  renderNav();
  renderTopbar();
  renderSection();
  renderPreview();
  renderQuality();
}

function renderTopbar() {
  draftMeta.textContent = buildDraftMeta();
  document.getElementById("analyzeBtn").disabled = state.busy === "analyze";
  document.getElementById("saveVersionBtn").disabled = state.busy === "save";
  document.getElementById("generateBtn").disabled = state.busy === "generate";
  document.getElementById("analyzeBtn").textContent = state.busy === "analyze" ? "检查中" : "检查质量";
  document.getElementById("saveVersionBtn").textContent = state.busy === "save" ? "保存中" : "保存版本";
  document.getElementById("generateBtn").textContent = state.busy === "generate" ? "生成中" : "生成 Word";
}

function buildDraftMeta() {
  const basics = state.data?.basics || {};
  const values = [basics.name, basics.target_role, state.jd ? "含 JD" : ""].filter(Boolean);
  return values.join(" / ");
}

function renderNav() {
  nav.innerHTML = sections
    .map(
      (section) =>
        `<button class="nav-item ${section.id === state.section ? "active" : ""}" data-section="${section.id}" type="button"><span>${section.label}</span>${navBadge(section.id)}</button>`,
    )
    .join("");
  nav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.section = button.dataset.section;
      render();
    });
  });
}

function navBadge(sectionId) {
  if (!state.data) return "";
  const countMap = {
    education: state.data.education?.length || 0,
    experience: state.data.experience?.length || 0,
    projects: state.data.projects?.length || 0,
    awards: state.data.awards?.length || 0,
    certifications: state.data.certifications?.length || 0,
    library: state.library?.versions?.length || 0,
  };
  const count = countMap[sectionId];
  return count ? `<small>${count}</small>` : "";
}

function renderSection() {
  const renderers = {
    basics: renderBasics,
    education: renderEducation,
    skills: renderSkills,
    experience: () => renderExperienceList("experience"),
    projects: () => renderExperienceList("projects"),
    awards: renderAwards,
    certifications: () => renderLineList("certifications", "其它证书和荣誉"),
    format: renderFormat,
    jd: renderJd,
    library: renderLibrary,
  };
  body.innerHTML = renderers[state.section]();
  bindInputs(body);
}

function sectionHeader(title, actions = "") {
  return `<div class="section-title"><div><h1>${title}</h1>${sectionHint(title)}</div><div class="inline-controls">${actions}</div></div>`;
}

function sectionHint(title) {
  const hints = {
    基础信息: "顶部信息会直接影响 Word 文件名和简历库识别。",
    教育经历: "应届生建议保留学校、专业、学历和时间。",
    专业技能: "每行一个技能，生成时会自动压缩成 ATS 友好的关键词行。",
    实习经历: "按工作内容、负责工作、工作成果拆开写，读起来更像正式经历。",
    "项目&科研经历": "优先放最能证明岗位能力的 2-4 个项目。",
    竞赛获奖: "可以写成结构化条目，也可以只写一行荣誉。",
    其它证书和荣誉: "一行一个证书或荣誉。",
    格式设置: "这里会真正影响 Word 输出，不只是预览样式。",
    "岗位 JD": "粘贴岗位描述后，生成 Word 时会优先排序相关技能。",
    简历库: "每次保存都会自动追加时间和版本号，避免重名混淆。",
  };
  return hints[title] ? `<p>${hints[title]}</p>` : "";
}

function renderBasics() {
  const basics = state.data.basics;
  const links = basics.links || [];
  return `
    ${sectionHeader("基础信息")}
    <div class="form-grid">
      ${field("姓名", "basics.name", basics.name || "")}
      ${field("目标岗位", "basics.target_role", basics.target_role || "")}
      ${field("手机号", "basics.phone", basics.phone || "")}
      ${field("邮箱", "basics.email", basics.email || "")}
      ${field("城市", "basics.city", basics.city || "")}
      ${field("GitHub", "basics.links.0.url", links[0]?.url || "")}
      ${field("作品集", "basics.links.1.url", links[1]?.url || "")}
      <div class="field">
        <label>证件照</label>
        <label class="checkbox-row">
          <input type="checkbox" data-path="basics.photo.enabled" ${basics.photo?.enabled ? "checked" : ""} />
          使用右上角照片位
        </label>
      </div>
      <div class="field full">
        <label for="photoInput">上传证件照</label>
        <input type="file" id="photoInput" name="photoInput" accept="image/png,image/jpeg,image/jpg" />
      </div>
    </div>
  `;
}

function renderEducation() {
  const actions = `<button class="small" data-action="add-education" type="button">添加教育</button>`;
  const entries = state.data.education || [];
  return `
    ${sectionHeader("教育经历", actions)}
    <div class="entry-list">
      ${entries.map((entry, index) => renderEducationEntry(entry, index)).join("") || emptyNote("暂无教育经历")}
    </div>
  `;
}

function renderEducationEntry(entry, index) {
  return `
    <div class="entry">
      <div class="entry-head">
        <span>教育经历 ${index + 1}</span>
        <button class="small danger" data-action="remove-education" data-index="${index}" type="button">删除</button>
      </div>
      <div class="form-grid">
        ${field("学校", `education.${index}.school`, entry.school || "")}
        ${field("专业", `education.${index}.major`, entry.major || "")}
        ${field("学历", `education.${index}.degree`, entry.degree || "")}
        ${field("时间", `education.${index}.start`, entry.start || "", "开始时间")}
        ${field("结束", `education.${index}.end`, entry.end || "")}
        ${field("GPA", `education.${index}.gpa`, entry.gpa || "")}
        ${field("排名", `education.${index}.rank`, entry.rank || "")}
        ${textarea("相关课程", `education.${index}.courses`, joinLines(entry.courses), "full")}
        ${textarea("荣誉", `education.${index}.honors`, joinLines(entry.honors), "full")}
      </div>
    </div>
  `;
}

function renderSkills() {
  const skills = state.data.skills || {};
  const actions = `<button class="small" data-action="add-skill-category" type="button">添加类别</button>`;
  return `
    ${sectionHeader("专业技能", actions)}
    <div class="entry-list">
      ${Object.entries(skills)
        .map(([category, values], index) => renderSkillCategory(category, values, index))
        .join("")}
    </div>
  `;
}

function renderSkillCategory(category, values, index) {
  return `
    <div class="entry">
      <div class="entry-head">
        <span>技能类别 ${index + 1}</span>
        <button class="small danger" data-action="remove-skill-category" data-category="${escapeAttr(category)}" type="button">删除</button>
      </div>
      <div class="form-grid one">
        ${field("类别", `skills_category.${index}`, category)}
        ${textarea("技能", `skills.${category}`, joinLines(values))}
      </div>
    </div>
  `;
}

function renderExperienceList(type) {
  const isProject = type === "projects";
  const title = isProject ? "项目&科研经历" : "实习经历";
  const action = isProject ? "add-project" : "add-experience";
  const entries = state.data[type] || [];
  const actions = `<button class="small" data-action="${action}" type="button">添加${isProject ? "项目/科研" : "实习"}</button>`;
  return `
    ${sectionHeader(title, actions)}
    <div class="entry-list">
      ${entries.map((entry, index) => renderExperienceEntry(type, entry, index)).join("") || emptyNote(`暂无${title}`)}
    </div>
  `;
}

function renderExperienceEntry(type, entry, index) {
  const isProject = type === "projects";
  const removeAction = isProject ? "remove-project" : "remove-experience";
  const title = isProject ? `项目/科研 ${index + 1}` : `实习 ${index + 1}`;
  const nameField = isProject
    ? field("项目/科研名称", `${type}.${index}.name`, entry.name || "")
    : field("公司/组织", `${type}.${index}.organization`, entry.organization || "");
  const techField = isProject
    ? textarea("技术栈", `${type}.${index}.technologies`, joinLines(entry.technologies), "full")
    : "";
  return `
    <div class="entry">
      <div class="entry-head">
        <span>${title}</span>
        <button class="small danger" data-action="${removeAction}" data-index="${index}" type="button">删除</button>
      </div>
      <div class="form-grid">
        ${nameField}
        ${field("角色", `${type}.${index}.role`, entry.role || "")}
        ${field("地点", `${type}.${index}.location`, entry.location || "")}
        ${field("开始", `${type}.${index}.start`, entry.start || "")}
        ${field("结束", `${type}.${index}.end`, entry.end || "")}
        ${techField}
        ${textarea(isProject ? "内容" : "工作内容", `${type}.${index}.content`, entry.content || "", "full")}
        ${textarea("负责工作", `${type}.${index}.responsibilities`, joinLines(entry.responsibilities || entry.bullets), "full")}
        ${textarea(isProject ? "所获成果" : "工作成果", `${type}.${index}.results`, joinLines(entry.results), "full")}
        ${textarea("补充 bullet", `${type}.${index}.bullets`, joinLines(entry.bullets), "full")}
      </div>
    </div>
  `;
}

function renderAwards() {
  const entries = state.data.awards || [];
  const actions = `<button class="small" data-action="add-award" type="button">添加竞赛</button>`;
  return `
    ${sectionHeader("竞赛获奖", actions)}
    <div class="entry-list">
      ${entries.map((entry, index) => renderAwardEntry(entry, index)).join("") || emptyNote("暂无竞赛获奖")}
    </div>
  `;
}

function renderAwardEntry(entry, index) {
  if (typeof entry === "string") {
    entry = { name: entry, level: "", date: "", content: "", responsibilities: [], results: [] };
    state.data.awards[index] = entry;
  }
  return `
    <div class="entry">
      <div class="entry-head">
        <span>竞赛 ${index + 1}</span>
        <button class="small danger" data-action="remove-award" data-index="${index}" type="button">删除</button>
      </div>
      <div class="form-grid">
        ${field("竞赛名称", `awards.${index}.name`, entry.name || "")}
        ${field("奖项等级", `awards.${index}.level`, entry.level || "")}
        ${field("时间", `awards.${index}.date`, entry.date || "")}
        ${textarea("内容", `awards.${index}.content`, entry.content || "", "full")}
        ${textarea("负责工作", `awards.${index}.responsibilities`, joinLines(entry.responsibilities), "full")}
        ${textarea("所获成果", `awards.${index}.results`, joinLines(entry.results), "full")}
      </div>
    </div>
  `;
}

function renderLineList(key, title) {
  return `
    ${sectionHeader(title)}
    <div class="form-grid one">
      ${textarea(title, key, joinLines(state.data[key]), "full")}
    </div>
  `;
}

function renderFormat() {
  const format = state.data.format || defaultFormat();
  return `
    ${sectionHeader("格式设置", `<button class="small" data-action="reset-format" type="button">恢复默认</button>`)}
    <div class="entry-list">
      <div class="entry">
        <div class="entry-head">
          <span>字体</span>
        </div>
        <div class="form-grid">
          ${selectField("中文正文字体", "format.body_east_asia_font", format.body_east_asia_font, ["DengXian", "Microsoft YaHei", "SimSun", "SimHei", "KaiTi"])}
          ${selectField("英文正文字体", "format.body_latin_font", format.body_latin_font, ["Calibri", "Arial", "Times New Roman", "Aptos"])}
          ${selectField("中文标题字体", "format.heading_east_asia_font", format.heading_east_asia_font, ["Microsoft YaHei", "DengXian", "SimHei", "SimSun", "KaiTi"])}
          ${selectField("英文标题字体", "format.heading_latin_font", format.heading_latin_font, ["Calibri", "Arial", "Times New Roman", "Aptos"])}
        </div>
      </div>
      <div class="entry">
        <div class="entry-head">
          <span>字号与行距</span>
        </div>
        <div class="form-grid">
          ${numberField("姓名字号", "format.name_size", format.name_size, 14, 24, 0.5)}
          ${numberField("栏目标题字号", "format.section_size", format.section_size, 9.5, 14, 0.1)}
          ${numberField("正文字号", "format.body_size", format.body_size, 8, 12, 0.1)}
          ${numberField("小字字号", "format.detail_size", format.detail_size, 7.5, 11, 0.1)}
          ${numberField("项目 bullet 字号", "format.bullet_size", format.bullet_size, 8, 11.5, 0.1)}
          ${numberField("行间距", "format.line_spacing", format.line_spacing, 0.9, 1.35, 0.05)}
        </div>
      </div>
      <div class="entry">
        <div class="entry-head">
          <span>页边距（英寸）</span>
        </div>
        <div class="form-grid">
          ${numberField("上边距", "format.top_margin", format.top_margin, 0.25, 0.9, 0.05)}
          ${numberField("下边距", "format.bottom_margin", format.bottom_margin, 0.25, 0.9, 0.05)}
          ${numberField("左边距", "format.left_margin", format.left_margin, 0.35, 0.9, 0.05)}
          ${numberField("右边距", "format.right_margin", format.right_margin, 0.35, 0.9, 0.05)}
        </div>
      </div>
    </div>
  `;
}

function renderJd() {
  return `
    ${sectionHeader("岗位 JD")}
    <div class="form-grid one">
      ${textarea("岗位描述", "jd", state.jd, "full")}
    </div>
  `;
}

function renderLibrary() {
  const library = state.library || { settings: { max_versions: 30 }, versions: [] };
  const versions = library.versions || [];
  const nextTitle = buildNextVersionTitle();
  return `
    ${sectionHeader("简历库", `<button class="small" data-action="refresh-library" type="button">刷新</button>`)}
    <div class="entry-list">
      <div class="entry">
        <div class="entry-head">
          <span>保存当前版本</span>
          <button class="small" data-action="save-version" type="button">保存版本</button>
        </div>
        <div class="save-preview">
          <span>下一次保存名</span>
          <strong id="nextVersionTitle">${escapeHtml(nextTitle)}</strong>
        </div>
        <div class="form-grid">
          ${field("版本标题前缀", "versionTitle", state.versionTitle || "", "留空则使用姓名/岗位/学校")}
          ${field("最大留存数量", "library.settings.max_versions", library.settings?.max_versions || 30)}
        </div>
        ${state.lastSavedTitle ? `<div class="save-confirm">最近保存：${escapeHtml(state.lastSavedTitle)}</div>` : ""}
      </div>
      <div class="entry">
        <div class="entry-head">
          <span>历史版本 ${versions.length} / ${library.settings?.max_versions || 30}</span>
        </div>
        <div class="version-list">
          ${versions.map(renderVersionItem).join("") || emptyNote("还没有保存过版本")}
        </div>
      </div>
    </div>
  `;
}

function renderVersionItem(version, index) {
  const tags = [
    version.has_jd ? "JD" : "",
    version.has_photo ? "照片" : "",
  ].filter(Boolean);
  const displayTitle = buildVersionDisplayTitle(version, index);
  return `
    <div class="version-item">
      <div class="version-main">
        <strong>${escapeHtml(displayTitle)}</strong>
        <span>${escapeHtml([version.name, version.target_role, version.school].filter(Boolean).join(" | "))}</span>
        <small>${escapeHtml(formatTime(version.created_at))}</small>
      </div>
      <div class="version-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <button class="small" data-action="load-version" data-version-id="${escapeAttr(version.id)}" type="button">载入</button>
    </div>
  `;
}

function buildVersionDisplayTitle(version, index) {
  const title = version.title || "未命名版本";
  if (/｜\d{4}-\d{2}-\d{2}\s\d{4}｜v\d+/u.test(title)) return title;
  return `${title}｜${formatCompactTime(version.created_at)}｜#${String(index + 1).padStart(2, "0")}`;
}

function buildNextVersionTitle() {
  const versions = state.library?.versions || [];
  const basics = state.data?.basics || {};
  const education = state.data?.education || [];
  const school = education[0]?.school || "";
  const prefix = state.versionTitle.trim() || [basics.name || "未命名", (basics.target_role || "简历").split("/")[0].trim(), school]
    .filter(Boolean)
    .join("｜");
  const next = versions.length + 1;
  return `${prefix || "未命名简历"}｜${formatCompactNow()}｜v${String(next).padStart(2, "0")}`;
}

function field(label, path, value, placeholder = "") {
  const id = inputId(path);
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" name="${id}" data-path="${escapeAttr(path)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" />
    </div>
  `;
}

function numberField(label, path, value, min, max, step) {
  const id = inputId(path);
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <input id="${id}" name="${id}" type="number" min="${min}" max="${max}" step="${step}" data-path="${escapeAttr(path)}" value="${escapeAttr(value)}" />
    </div>
  `;
}

function selectField(label, path, value, options) {
  const id = inputId(path);
  const optionHtml = options
    .map((option) => `<option value="${escapeAttr(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`)
    .join("");
  return `
    <div class="field">
      <label for="${id}">${label}</label>
      <select id="${id}" name="${id}" data-path="${escapeAttr(path)}">${optionHtml}</select>
    </div>
  `;
}

function textarea(label, path, value, extraClass = "") {
  const id = inputId(path);
  return `
    <div class="field ${extraClass}">
      <label for="${id}">${label}</label>
      <textarea id="${id}" name="${id}" data-path="${escapeAttr(path)}">${escapeHtml(value)}</textarea>
    </div>
  `;
}

function bindInputs(scope) {
  scope.querySelectorAll("[data-path]").forEach((input) => {
    const eventName = input.type === "checkbox" ? "change" : "input";
    input.addEventListener(eventName, () => {
      updatePath(input.dataset.path, input.type === "checkbox" ? input.checked : input.value);
      persist();
      renderTopbar();
      renderPreview();
      renderNextVersionTitle();
    });
  });
  scope.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset));
  });
  const photoInput = document.getElementById("photoInput");
  if (photoInput) {
    photoInput.addEventListener("change", () => {
      state.photoFile = photoInput.files?.[0] || null;
      state.data.basics.photo.enabled = true;
      persist("照片已选择");
      renderPreview();
    });
  }
}

function updatePath(path, value) {
  if (path === "jd") {
    state.jd = value;
    return;
  }
  if (path === "versionTitle") {
    state.versionTitle = value;
    return;
  }
  if (path === "library.settings.max_versions") {
    updateMaxVersions(value);
    return;
  }
  if (path.startsWith("skills_category.")) {
    renameSkillCategory(Number(path.split(".")[1]), value);
    render();
    return;
  }
  if (path.startsWith("skills.")) {
    const category = path.slice("skills.".length);
    state.data.skills[category] = splitLines(value);
    return;
  }
  if (path.startsWith("format.")) {
    const key = path.slice("format.".length);
    state.data.format[key] = shouldBeNumber(path) ? Number(value) : value;
    return;
  }

  const parts = path.split(".");
  let target = state.data;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = normalizeKey(parts[i]);
    target = target[key];
  }
  const key = normalizeKey(parts.at(-1));
  target[key] = shouldBeList(path) ? splitLines(value) : value;
}

function normalizeKey(key) {
  return /^\d+$/.test(key) ? Number(key) : key;
}

function shouldBeList(path) {
  return /\.(courses|honors|bullets|technologies|responsibilities|results)$/.test(path) || ["certifications"].includes(path);
}

function shouldBeNumber(path) {
  return /^format\.(body_size|detail_size|bullet_size|name_size|section_size|line_spacing|top_margin|bottom_margin|left_margin|right_margin)$/.test(path);
}

function handleAction(action, dataset) {
  const index = Number(dataset.index);
  if (action === "refresh-library") {
    loadLibrary().then(() => {
      persist("简历库已刷新");
      render();
    });
    return;
  }
  if (action === "save-version") {
    saveVersion();
    return;
  }
  if (action === "load-version") {
    loadVersion(dataset.versionId);
    return;
  }
  if (action === "reset-format") state.data.format = defaultFormat();
  if (action === "add-education") state.data.education.push(emptyEducation());
  if (action === "remove-education") state.data.education.splice(index, 1);
  if (action === "add-experience") state.data.experience.push(emptyExperience());
  if (action === "remove-experience") state.data.experience.splice(index, 1);
  if (action === "add-project") state.data.projects.push(emptyProject());
  if (action === "remove-project") state.data.projects.splice(index, 1);
  if (action === "add-award") state.data.awards.push(emptyAward());
  if (action === "remove-award") state.data.awards.splice(index, 1);
  if (action === "add-skill-category") addSkillCategory();
  if (action === "remove-skill-category") delete state.data.skills[dataset.category];
  persist();
  render();
}

function addSkillCategory() {
  let index = Object.keys(state.data.skills).length + 1;
  let name = `技能类别${index}`;
  while (state.data.skills[name]) {
    index += 1;
    name = `技能类别${index}`;
  }
  state.data.skills[name] = [];
}

function renameSkillCategory(index, newName) {
  const entries = Object.entries(state.data.skills);
  const oldName = entries[index]?.[0];
  if (!oldName || !newName.trim() || oldName === newName) return;
  const next = {};
  entries.forEach(([category, values], entryIndex) => {
    next[entryIndex === index ? newName.trim() : category] = values;
  });
  state.data.skills = next;
}

function renderPreview() {
  const data = state.data;
  const basics = data.basics || {};
  applyPreviewFormat(data.format || defaultFormat());
  previewName.textContent = basics.name || "姓名";
  previewRole.textContent = basics.target_role || "目标岗位";
  previewContact.textContent = [basics.phone, basics.email, basics.city].filter(Boolean).join(" | ");
  previewDocument.innerHTML = [
    previewEducation(data.education),
    previewSkills(data.skills),
    previewExperience("实习经历", data.experience),
    previewProjects(data.projects),
    previewAwards(data.awards),
    previewSimple("其它证书和荣誉", data.certifications),
  ].join("");
}

function applyPreviewFormat(format) {
  const resolved = { ...defaultFormat(), ...(format || {}) };
  previewDocument.style.fontFamily = `${resolved.body_east_asia_font}, ${resolved.body_latin_font}, sans-serif`;
  previewDocument.style.fontSize = `${resolved.body_size}px`;
  previewDocument.style.lineHeight = String(resolved.line_spacing);
  previewDocument.style.padding = `${resolved.top_margin * 32}px ${resolved.right_margin * 32}px ${resolved.bottom_margin * 32}px ${resolved.left_margin * 32}px`;
  previewName.style.fontFamily = `${resolved.heading_east_asia_font}, ${resolved.heading_latin_font}, sans-serif`;
  previewName.style.fontSize = `${Math.max(18, resolved.name_size + 5)}px`;
  previewDocument.style.setProperty("--preview-section-size", `${resolved.section_size + 3}px`);
  previewDocument.style.setProperty("--preview-detail-size", `${resolved.detail_size + 3}px`);
  previewDocument.style.setProperty("--preview-bullet-size", `${resolved.bullet_size + 3}px`);
}

function previewEducation(entries = []) {
  return previewSection(
    "教育经历",
    entries
      .map(
        (entry) => `
        <div class="preview-entry">
          <div class="preview-entry-title">
            <span>${escapeHtml([entry.school, entry.major, entry.degree].filter(Boolean).join(" | "))}</span>
            <span>${escapeHtml([entry.start, entry.end].filter(Boolean).join(" - "))}</span>
          </div>
          <p>${escapeHtml([entry.gpa && `GPA: ${entry.gpa}`, entry.rank && `排名: ${entry.rank}`].filter(Boolean).join(" | "))}</p>
          <p>${escapeHtml((entry.courses || []).join("、"))}</p>
        </div>`,
      )
      .join(""),
  );
}

function previewSkills(skills = {}) {
  const content = Object.entries(skills)
    .map(([category, values]) => `<p><strong>${escapeHtml(category)}:</strong> ${escapeHtml((values || []).join(" | "))}</p>`)
    .join("");
  return previewSection("专业技能", content);
}

function previewExperience(title, entries = []) {
  return previewSection(
    title,
    entries
      .map(
        (entry) => `
        <div class="preview-entry">
          <div class="preview-entry-title">
            <span>${escapeHtml([entry.organization, entry.role, entry.location].filter(Boolean).join(" | "))}</span>
            <span>${escapeHtml([entry.start, entry.end].filter(Boolean).join(" - "))}</span>
          </div>
          ${previewStructuredDetails(entry, "工作内容", "负责工作", "工作成果")}
        </div>`,
      )
      .join(""),
  );
}

function previewProjects(entries = []) {
  return previewSection(
    "项目&科研经历",
    entries
      .map(
        (entry) => `
        <div class="preview-entry">
          <div class="preview-entry-title">
            <span>${escapeHtml([entry.name, entry.role, (entry.technologies || []).join(" / ")].filter(Boolean).join(" | "))}</span>
            <span>${escapeHtml([entry.start, entry.end].filter(Boolean).join(" - "))}</span>
          </div>
          ${previewStructuredDetails(entry, "内容", "负责工作", "所获成果")}
        </div>`,
      )
      .join(""),
  );
}

function previewAwards(entries = []) {
  return previewSection(
    "竞赛获奖",
    (entries || [])
      .map((entry) => {
        if (typeof entry === "string") {
          return previewCompactRow(splitDisplayItem(entry));
        }
        return `
        <div class="preview-entry">
          <div class="preview-entry-title preview-compact-row">
            <span class="preview-compact-main">${escapeHtml(entry.name || "")}</span>
            <span class="preview-compact-meta">${escapeHtml([entry.level, entry.date].filter(Boolean).join(" | "))}</span>
          </div>
          ${previewStructuredDetails(entry, "内容", "负责工作", "所获成果", false)}
        </div>`;
      })
      .join(""),
  );
}

function previewSimple(title, values = []) {
  const content = (values || [])
    .map((value) => {
      if (value && typeof value === "object") {
        return previewCompactRow({
          left: [value.name, value.issuer].filter(Boolean).join(" | "),
          right: [value.level, value.date].filter(Boolean).join(" | "),
        });
      }
      return previewCompactRow(splitDisplayItem(value));
    })
    .join("");
  return previewSection(title, content);
}

function splitDisplayItem(value) {
  const text = String(value || "").trim();
  const parts = splitCompactParts(text);
  if (parts.length <= 1) return { left: text, right: "" };
  return { left: parts[0], right: parts.slice(1).join(" | ") };
}

function splitCompactParts(value) {
  return String(value || "")
    .split(/\s*[|｜]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function previewCompactRow(item) {
  if (!item.left && !item.right) return "";
  return `
    <div class="preview-entry compact">
      <div class="preview-compact-row">
        <span class="preview-compact-main">${escapeHtml(item.left)}</span>
        ${item.right ? `<span class="preview-compact-meta">${escapeHtml(item.right)}</span>` : ""}
      </div>
    </div>`;
}

function previewSection(title, content) {
  return `<section class="preview-section"><h2>${title}</h2>${content || emptyNote("暂无内容")}</section>`;
}

function previewBullets(bullets = []) {
  if (!bullets?.length) return emptyNote("暂无 bullet");
  return `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`;
}

function previewStructuredDetails(entry, contentLabel, responsibilitiesLabel, resultsLabel, showEmpty = true) {
  const parts = [];
  if (entry.content) {
    parts.push(`<p><strong>${contentLabel}：</strong>${escapeHtml(entry.content)}</p>`);
  }
  if (entry.responsibilities?.length) {
    parts.push(`<p><strong>${responsibilitiesLabel}：</strong></p>${previewBullets(entry.responsibilities)}`);
  }
  if (entry.results?.length) {
    parts.push(`<p><strong>${resultsLabel}：</strong></p>${previewBullets(entry.results)}`);
  }
  if (!parts.length && entry.bullets?.length) {
    parts.push(previewBullets(entry.bullets));
  } else if (entry.bullets?.length) {
    parts.push(`<p><strong>补充：</strong></p>${previewBullets(entry.bullets)}`);
  }
  return parts.join("") || (showEmpty ? emptyNote("暂无内容") : "");
}

async function analyzeResume() {
  state.busy = "analyze";
  persist("检查中");
  renderTopbar();
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: state.data }),
  });
  state.quality = await response.json();
  state.busy = "";
  renderQuality();
  persist(response.ok ? "检查完成" : "检查失败");
  renderTopbar();
}

async function loadLibrary() {
  const response = await fetch("/api/library");
  if (!response.ok) return;
  state.library = await response.json();
}

async function updateMaxVersions(value) {
  const maxVersions = Number(value);
  if (!Number.isFinite(maxVersions)) return;
  const response = await fetch("/api/library/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ max_versions: maxVersions }),
  });
  const payload = await response.json();
  if (response.ok) {
    state.library = payload.library;
    persist("留存设置已保存");
    render();
  } else {
    state.quality = { errors: payload.errors || ["保存留存设置失败"], warnings: [] };
    renderQuality();
  }
}

async function saveVersion() {
  if (state.busy) return;
  state.busy = "save";
  persist("保存版本中");
  renderTopbar();
  const form = buildResumeForm();
  form.append("title", state.versionTitle || "");
  const response = await fetch("/api/library/save", { method: "POST", body: form });
  const payload = await response.json();
  if (!response.ok) {
    state.quality = { errors: payload.errors || ["保存版本失败"], warnings: [] };
    state.busy = "";
    renderQuality();
    persist("保存版本失败");
    renderTopbar();
    return;
  }
  state.library = payload.library;
  state.lastSavedTitle = payload.version?.title || "";
  state.versionTitle = "";
  state.section = "library";
  state.busy = "";
  persist(state.lastSavedTitle ? `已保存：${state.lastSavedTitle}` : "版本已保存");
  render();
}

async function loadVersion(versionId) {
  const response = await fetch(`/api/library/${encodeURIComponent(versionId)}`);
  const payload = await response.json();
  if (!response.ok) {
    state.quality = { errors: payload.errors || ["载入版本失败"], warnings: [] };
    renderQuality();
    return;
  }
  state.data = payload.data;
  state.jd = payload.jd || "";
  state.versionTitle = "";
  state.lastSavedTitle = payload.title || "";
  state.photoFile = null;
  state.quality = { errors: [], warnings: [] };
  ensureShape();
  state.section = "basics";
  persist("版本已载入");
  render();
}

function renderQuality() {
  const errors = state.quality.errors || [];
  const warnings = state.quality.warnings || [];
  const items = [
    ...errors.map((text) => `<div class="quality-item error">${escapeHtml(text)}</div>`),
    ...warnings.slice(0, 8).map((text) => `<div class="quality-item">${escapeHtml(text)}</div>`),
  ];
  qualityBox.innerHTML = items.join("");
}

async function generateWord() {
  if (state.busy) return;
  state.busy = "generate";
  persist("生成中");
  renderTopbar();
  const form = buildResumeForm();

  const response = await fetch("/api/generate", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json();
    state.quality = { errors: payload.errors || ["生成失败"], warnings: [] };
    state.busy = "";
    renderQuality();
    persist("生成失败");
    renderTopbar();
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFilename();
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  state.busy = "";
  persist("已生成");
  renderTopbar();
}

function buildResumeForm() {
  const form = new FormData();
  form.append("data", JSON.stringify(state.data));
  form.append("jd", state.jd || "");
  form.append("no_photo", String(!state.data.basics.photo?.enabled));
  if (state.photoFile && state.data.basics.photo?.enabled) {
    form.append("photo", state.photoFile);
  }
  return form;
}

function safeFilename() {
  const basics = state.data.basics || {};
  const parts = [basics.name || "resume", basics.target_role || "简历"];
  return `${parts.join("_").replace(/[<>:"/\\|?*\s]+/g, "_")}.docx`;
}

function persist(label = "已保存") {
  saveState.textContent = label;
  localStorage.setItem(
    "resume-generator-draft",
    JSON.stringify({
      data: state.data,
      jd: state.jd,
      versionTitle: state.versionTitle,
      lastSavedTitle: state.lastSavedTitle,
    }),
  );
}

function renderNextVersionTitle() {
  const node = document.getElementById("nextVersionTitle");
  if (node) node.textContent = buildNextVersionTitle();
}

function formatCompactNow() {
  const date = new Date();
  return formatDateCompact(date);
}

function formatCompactTime(value) {
  if (!value) return formatCompactNow();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDateCompact(date);
}

function formatDateCompact(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function splitLines(value) {
  return String(value || "")
    .split(/\r?\n|[；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value) {
  return (value || []).join("\n");
}

function emptyNote(text) {
  return `<div class="empty-note">${escapeHtml(text)}</div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function inputId(path) {
  let hash = 0;
  const text = String(path);
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return `field-${hash.toString(36)}`;
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
