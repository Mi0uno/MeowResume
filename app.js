const sections = [
  ["basics", "基础信息"],
  ["education", "教育经历"],
  ["skills", "专业技能"],
  ["experience", "实习经历"],
  ["projects", "项目&科研"],
  ["awards", "竞赛获奖"],
  ["certifications", "证书荣誉"],
  ["library", "简历库"],
];

const sampleData = {
  basics: {
    name: "张三",
    target_role: "后端开发工程师",
    phone: "138-0000-0000",
    email: "zhangsan@example.com",
    city: "北京",
  },
  education: [
    {
      school: "清华大学",
      degree: "本科",
      major: "计算机科学与技术",
      start: "2022.09",
      end: "2026.06",
      gpa: "3.82/4.00",
      rank: "专业前 10%",
      courses: ["数据结构", "操作系统", "计算机网络", "数据库系统"],
      honors: ["国家奖学金", "校级优秀学生干部"],
    },
  ],
  skills: {
    编程语言: ["Python", "Java", "Go", "SQL"],
    后端与中间件: ["FastAPI", "Spring Boot", "Redis", "MySQL", "Kafka"],
    工程与部署: ["Linux", "Docker", "Git", "CI/CD"],
  },
  experience: [
    {
      organization: "某互联网公司",
      role: "后端开发实习生",
      location: "北京",
      start: "2025.07",
      end: "2025.10",
      content: "参与内容审核任务分发与稳定性建设，围绕任务领取、消费失败、接口超时等核心链路进行优化。",
      responsibilities: [
        "重构任务分发接口，基于 Redis Stream 与批量写入减少重复查询",
        "设计核心埋点与异常告警规则，覆盖任务积压、消费失败和接口超时场景",
      ],
      results: ["接口 P95 延迟从 420ms 降至 260ms，平均定位时间缩短约 35%"],
    },
  ],
  projects: [
    {
      name: "校园二手交易平台",
      role: "后端负责人",
      technologies: ["FastAPI", "MySQL", "Redis", "Docker"],
      start: "2025.03",
      end: "2025.06",
      content: "面向校内二手交易场景，完成商品发布、搜索、订单和消息等核心模块开发。",
      responsibilities: [
        "主导商品发布、搜索、订单和消息 4 个核心模块设计",
        "引入 Redis 缓存热门商品与搜索结果，优化首页和搜索接口响应",
      ],
      results: [
        "支撑 1200+ 名校内用户完成 3500+ 次商品浏览",
        "首页接口平均响应时间从 310ms 降至 95ms，数据库读请求减少 62%",
      ],
    },
  ],
  awards: [
    { name: "全国大学生信息安全竞赛区域赛", level: "二等奖", date: "2025", responsibilities: [], results: [] },
    { name: "蓝桥杯 Python 组", level: "省级一等奖", date: "2024", responsibilities: [], results: [] },
  ],
  certifications: ["大学英语六级 CET-6 532", "华为 HCIA-Datacom"],
};

let state = {
  section: "basics",
  data: readJson("meowresume-draft", sampleData),
  versions: normalizeVersions(readJson("meowresume-versions", [])),
  activeVersionId: localStorage.getItem("meowresume-active-version-id") || "",
  maxVersions: Number(localStorage.getItem("meowresume-max") || 30),
};

const nav = document.getElementById("sectionNav");
const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const statusText = document.getElementById("statusText");

document.getElementById("loadSampleBtn").addEventListener("click", () => {
  state.data = structuredClone(sampleData);
  state.activeVersionId = "";
  persistDraft("已载入示例");
  render();
});
document.getElementById("saveBtn").addEventListener("click", saveVersion);
document.getElementById("saveAsBtn").addEventListener("click", saveAsVersion);
document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
document.getElementById("importJsonInput").addEventListener("change", importJson);
document.getElementById("generateBtn").addEventListener("click", generateWord);

ensureShape();
render();

function ensureShape() {
  const data = state.data;
  data.basics ||= {};
  data.education ||= [];
  data.skills ||= {};
  data.experience ||= [];
  data.projects ||= [];
  data.awards ||= [];
  data.certifications ||= [];
}

function render() {
  renderNav();
  renderEditor();
  renderPreview();
}

function renderNav() {
  nav.innerHTML = sections
    .map(([id, label]) => `<button class="${id === state.section ? "active" : ""}" data-section="${id}" type="button">${label}</button>`)
    .join("");
  nav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.section = button.dataset.section;
      render();
    });
  });
}

function renderEditor() {
  const renderers = {
    basics: renderBasics,
    education: () => renderEntryList("education", "教育经历", emptyEducation, renderEducationEntry),
    skills: renderSkills,
    experience: () => renderEntryList("experience", "实习经历", emptyExperience, renderExperienceEntry),
    projects: () => renderEntryList("projects", "项目&科研经历", emptyProject, renderProjectEntry),
    awards: () => renderEntryList("awards", "竞赛获奖", emptyAward, renderAwardEntry),
    certifications: renderCertifications,
    library: renderLibrary,
  };
  editor.innerHTML = `<div class="panel">${renderers[state.section]()}</div>`;
  bindEditor();
}

function renderBasics() {
  const basics = state.data.basics;
  return `
    ${sectionHead("基础信息")}
    <div class="form-grid">
      ${field("姓名", "basics.name", basics.name)}
      ${field("目标岗位", "basics.target_role", basics.target_role)}
      ${field("手机号", "basics.phone", basics.phone)}
      ${field("邮箱", "basics.email", basics.email)}
      ${field("城市", "basics.city", basics.city)}
    </div>
    <p class="hint">Pages 版会在 Word 顶部保留证件照占位；真实照片嵌入请使用本地 Python 版。</p>
  `;
}

function renderSkills() {
  const skills = state.data.skills;
  const keys = Object.keys(skills);
  return `
    ${sectionHead("专业技能", `<button data-action="add-skill" type="button">添加类别</button>`)}
    <div class="entry-list">
      ${
        keys
          .map(
            (key) => `
          <div class="entry">
            <div class="entry-head">
              <span>${escapeHtml(key)}</span>
              <button class="danger" data-action="remove-skill" data-key="${escapeAttr(key)}" type="button">删除</button>
            </div>
            <div class="form-grid">
              ${field("类别名", `skills_key.${key}`, key)}
              ${textarea("技能项（换行或分号分隔）", `skills.${key}`, joinLines(skills[key]), "full")}
            </div>
          </div>`,
          )
          .join("") || emptyNote("暂无技能类别")
      }
    </div>
  `;
}

function renderEntryList(key, title, factory, renderer) {
  const entries = state.data[key] || [];
  return `
    ${sectionHead(title, `<button data-action="add-entry" data-key="${key}" type="button">添加</button>`)}
    <div class="entry-list">
      ${entries.map((entry, index) => renderer(entry, index)).join("") || emptyNote(`暂无${title}`)}
    </div>
  `;
}

function renderEducationEntry(entry, index) {
  return `
    <div class="entry">
      ${entryHead(`教育 ${index + 1}`, "education", index)}
      <div class="form-grid">
        ${field("学校", `education.${index}.school`, entry.school)}
        ${field("专业", `education.${index}.major`, entry.major)}
        ${field("学历", `education.${index}.degree`, entry.degree)}
        ${field("时间", `education.${index}.period`, period(entry))}
        ${field("GPA", `education.${index}.gpa`, entry.gpa)}
        ${field("排名", `education.${index}.rank`, entry.rank)}
        ${textarea("相关课程", `education.${index}.courses`, joinLines(entry.courses), "full")}
        ${textarea("荣誉", `education.${index}.honors`, joinLines(entry.honors), "full")}
      </div>
    </div>`;
}

function renderExperienceEntry(entry, index) {
  return `
    <div class="entry">
      ${entryHead(`实习 ${index + 1}`, "experience", index)}
      <div class="form-grid">
        ${field("公司/组织", `experience.${index}.organization`, entry.organization)}
        ${field("角色", `experience.${index}.role`, entry.role)}
        ${field("地点", `experience.${index}.location`, entry.location)}
        ${field("时间", `experience.${index}.period`, period(entry))}
        ${textarea("内容", `experience.${index}.content`, entry.content, "full")}
        ${textarea("负责工作", `experience.${index}.responsibilities`, joinLines(entry.responsibilities), "full")}
        ${textarea("工作成果", `experience.${index}.results`, joinLines(entry.results), "full")}
      </div>
    </div>`;
}

function renderProjectEntry(entry, index) {
  return `
    <div class="entry">
      ${entryHead(`项目 ${index + 1}`, "projects", index)}
      <div class="form-grid">
        ${field("项目名称", `projects.${index}.name`, entry.name)}
        ${field("角色", `projects.${index}.role`, entry.role)}
        ${field("时间", `projects.${index}.period`, period(entry))}
        ${textarea("技术栈", `projects.${index}.technologies`, joinLines(entry.technologies), "full")}
        ${textarea("内容", `projects.${index}.content`, entry.content, "full")}
        ${textarea("负责工作", `projects.${index}.responsibilities`, joinLines(entry.responsibilities), "full")}
        ${textarea("所获成果", `projects.${index}.results`, joinLines(entry.results), "full")}
      </div>
    </div>`;
}

function renderAwardEntry(entry, index) {
  return `
    <div class="entry">
      ${entryHead(`奖项 ${index + 1}`, "awards", index)}
      <div class="form-grid">
        ${field("名称", `awards.${index}.name`, entry.name)}
        ${field("等级", `awards.${index}.level`, entry.level)}
        ${field("时间", `awards.${index}.date`, entry.date)}
        ${textarea("负责工作", `awards.${index}.responsibilities`, joinLines(entry.responsibilities), "full")}
        ${textarea("成果", `awards.${index}.results`, joinLines(entry.results), "full")}
      </div>
    </div>`;
}

function renderCertifications() {
  return `
    ${sectionHead("其它证书和荣誉")}
    <div class="form-grid">
      ${textarea("证书/荣誉（换行或分号分隔）", "certifications", joinLines(state.data.certifications), "full")}
    </div>
  `;
}

function renderLibrary() {
  const versions = state.versions || [];
  const activeVersion = findActiveVersion();
  return `
    ${sectionHead("简历库", `<button data-action="save-as-version" type="button">另存为新版本</button><button data-action="clear-versions" type="button">清空历史</button>`)}
    <div class="save-preview">
      <span>当前编辑</span>
      <strong>${escapeHtml(activeVersion ? activeVersion.title : "未保存草稿")}</strong>
    </div>
    <div class="form-grid">
      ${field("最大留存数量", "maxVersions", state.maxVersions)}
    </div>
    <p class="hint">点“保存当前版本”会更新当前编辑版本；点“另存为新版本”才会新增历史。历史版本保存在当前浏览器，不会同步到 GitHub。</p>
    <div class="version-list">
      ${
        versions
          .map(
            (version, index) => `
          <div class="version-item ${version.id === state.activeVersionId ? "active" : ""}">
            <div>
              <strong>${escapeHtml(version.title)}${version.id === state.activeVersionId ? "（正在编辑）" : ""}</strong>
              <span>${escapeHtml([`创建 ${version.created_at}`, version.updated_at ? `更新 ${version.updated_at}` : ""].filter(Boolean).join(" · "))}</span>
            </div>
            <button data-action="load-version" data-index="${index}" type="button">载入</button>
          </div>`,
          )
          .join("") || emptyNote("还没有保存过版本")
      }
    </div>
  `;
}

function bindEditor() {
  editor.querySelectorAll("[data-path]").forEach((input) => {
    input.addEventListener("input", () => {
      updatePath(input.dataset.path, input.value);
      persistDraft("已自动保存");
      renderPreview();
    });
  });
  editor.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset));
  });
}

function handleAction(dataset) {
  const action = dataset.action;
  if (action === "add-entry") state.data[dataset.key].push(factoryFor(dataset.key)());
  if (action === "remove-entry") state.data[dataset.key].splice(Number(dataset.index), 1);
  if (action === "add-skill") addSkill();
  if (action === "remove-skill") delete state.data.skills[dataset.key];
  if (action === "save-as-version") {
    saveAsVersion();
    return;
  }
  if (action === "load-version") {
    const version = state.versions[Number(dataset.index)];
    state.data = structuredClone(version.data);
    state.activeVersionId = version.id;
    ensureShape();
  }
  if (action === "clear-versions" && confirm("确定清空当前浏览器里的历史版本吗？")) {
    state.versions = [];
    state.activeVersionId = "";
    localStorage.setItem("meowresume-versions", "[]");
    localStorage.removeItem("meowresume-active-version-id");
  }
  persistDraft("已更新");
  render();
}

function updatePath(path, rawValue) {
  if (path === "maxVersions") {
    state.maxVersions = clampNumber(rawValue, 1, 300, 30);
    localStorage.setItem("meowresume-max", String(state.maxVersions));
    pruneVersions();
    return;
  }
  if (path.startsWith("skills_key.")) {
    renameSkill(path.replace("skills_key.", ""), rawValue);
    return;
  }
  setValue(state.data, path, shouldBeList(path) ? splitLines(rawValue) : rawValue);
  if (/\.period$/.test(path)) {
    const target = getParent(state.data, path);
    const [start, end] = splitPeriod(rawValue);
    target.start = start;
    target.end = end;
    delete target.period;
  }
}

function renderPreview() {
  const data = state.data;
  const basics = data.basics || {};
  preview.innerHTML = `
    <header class="resume-top">
      <div>
        <h1 class="resume-name">${escapeHtml(basics.name || "姓名")}</h1>
        <div class="resume-role">${escapeHtml(basics.target_role || "目标岗位")}</div>
        <div class="resume-contact">${escapeHtml([basics.phone, basics.email, basics.city].filter(Boolean).join(" | "))}</div>
      </div>
      <div class="resume-photo">证件照</div>
    </header>
    ${previewEducation(data.education)}
    ${previewSkills(data.skills)}
    ${previewExperience("实习经历", data.experience)}
    ${previewProjects(data.projects)}
    ${previewAwards(data.awards)}
    ${previewSimple("其它证书和荣誉", data.certifications)}
  `;
}

function previewEducation(entries = []) {
  return section(
    "教育经历",
    entries
      .map(
        (entry) => `
      <div class="resume-row">
        <span>${escapeHtml([entry.school, entry.major, entry.degree].filter(Boolean).join(" | "))}</span>
        <span>${escapeHtml(period(entry))}</span>
      </div>
      <p>${escapeHtml([entry.gpa && `GPA: ${entry.gpa}`, entry.rank && `排名: ${entry.rank}`].filter(Boolean).join(" | "))}</p>
      <p>${escapeHtml([...(entry.courses || []), ...(entry.honors || [])].join("、"))}</p>`,
      )
      .join(""),
  );
}

function previewSkills(skills = {}) {
  return section(
    "专业技能",
    Object.entries(skills)
      .map(([key, values]) => `<p><strong>${escapeHtml(key)}：</strong>${escapeHtml((values || []).join(" | "))}</p>`)
      .join(""),
  );
}

function previewExperience(title, entries = []) {
  return section(
    title,
    entries
      .map(
        (entry) => `
      <div class="resume-row">
        <span>${escapeHtml([entry.organization, entry.role, entry.location].filter(Boolean).join(" | "))}</span>
        <span>${escapeHtml(period(entry))}</span>
      </div>
      ${previewDetails(entry, "工作内容", "负责工作", "工作成果")}`,
      )
      .join(""),
  );
}

function previewProjects(entries = []) {
  return section(
    "项目&科研经历",
    entries
      .map(
        (entry) => `
      <div class="resume-row">
        <span>${escapeHtml([entry.name, entry.role, (entry.technologies || []).join(" / ")].filter(Boolean).join(" | "))}</span>
        <span>${escapeHtml(period(entry))}</span>
      </div>
      ${previewDetails(entry, "内容", "负责工作", "所获成果")}`,
      )
      .join(""),
  );
}

function previewAwards(entries = []) {
  return section(
    "竞赛获奖",
    entries
      .map(
        (entry) => `
      <div class="resume-row">
        <span>${escapeHtml(entry.name || "")}</span>
        <span>${escapeHtml([entry.level, entry.date].filter(Boolean).join(" | "))}</span>
      </div>
      ${previewDetails(entry, "", "负责工作", "成果", false)}`,
      )
      .join(""),
  );
}

function previewSimple(title, values = []) {
  return section(title, values.map((value) => `<p>${escapeHtml(value)}</p>`).join(""));
}

function previewDetails(entry, contentLabel, responsibilitiesLabel, resultsLabel, showContent = true) {
  const parts = [];
  if (showContent && entry.content) parts.push(`<p><strong>${contentLabel}：</strong>${escapeHtml(entry.content)}</p>`);
  if (entry.responsibilities?.length) parts.push(`<p><strong>${responsibilitiesLabel}：</strong></p>${ul(entry.responsibilities)}`);
  if (entry.results?.length) parts.push(`<p><strong>${resultsLabel}：</strong></p>${ul(entry.results)}`);
  return parts.join("");
}

function section(title, content) {
  return `<section class="resume-section"><h2>${title}</h2>${content || `<p>暂无内容</p>`}</section>`;
}

function generateWord() {
  ensureShape();
  const warnings = validateData(state.data);
  if (warnings.length && !confirm(`简历还有这些问题：\n\n${warnings.join("\n")}\n\n仍然生成 Word 吗？`)) return;
  const filename = buildFilename(state.data);
  const docx = createDocx(state.data);
  downloadBlob(new Blob([docx], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), filename);
  setStatus(`已生成 ${filename}`);
}

function createDocx(data) {
  const files = {
    "[Content_Types].xml": contentTypesXml(),
    "_rels/.rels": rootRelsXml(),
    "word/_rels/document.xml.rels": documentRelsXml(),
    "word/styles.xml": stylesXml(),
    "word/document.xml": documentXml(data),
  };
  return zipStore(files);
}

function documentXml(data) {
  const basics = data.basics || {};
  const body = [
    topTableXml(basics),
    headingXml("教育经历"),
    ...educationXml(data.education),
    headingXml("专业技能"),
    ...skillsXml(data.skills),
    headingXml("实习经历"),
    ...experienceXml(data.experience, "工作内容", "负责工作", "工作成果"),
    headingXml("项目&科研经历"),
    ...projectsXml(data.projects),
    headingXml("竞赛获奖"),
    ...awardsXml(data.awards),
    headingXml("其它证书和荣誉"),
    ...(data.certifications || []).map((item) => paraXml(item, { size: 19 })),
    sectPrXml(),
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`;
}

function topTableXml(basics) {
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="10000" w:type="pct"/>
      <w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="single" w:sz="8" w:color="222222"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>
    </w:tblPr>
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="8200" w:type="pct"/></w:tcPr>
        ${paraXml(basics.name || "姓名", { bold: true, size: 34 })}
        ${paraXml(basics.target_role || "目标岗位", { bold: true, size: 21 })}
        ${paraXml([basics.phone, basics.email, basics.city].filter(Boolean).join(" | "), { color: "555555", size: 18 })}
      </w:tc>
      <w:tc><w:tcPr><w:tcW w:w="1800" w:type="pct"/><w:vAlign w:val="center"/><w:tcBorders><w:top w:val="single" w:sz="6" w:color="999999"/><w:left w:val="single" w:sz="6" w:color="999999"/><w:bottom w:val="single" w:sz="6" w:color="999999"/><w:right w:val="single" w:sz="6" w:color="999999"/></w:tcBorders></w:tcPr>
        ${paraXml("证件照", { align: "center", color: "666666", size: 18 })}
      </w:tc>
    </w:tr>
  </w:tbl>`;
}

function educationXml(entries = []) {
  return entries.flatMap((entry) => [
    lineXml([entry.school, entry.major, entry.degree].filter(Boolean).join(" | "), period(entry), true),
    paraXml([entry.gpa && `GPA: ${entry.gpa}`, entry.rank && `排名: ${entry.rank}`].filter(Boolean).join(" | "), { color: "555555", size: 18 }),
    paraXml([...(entry.courses || []), ...(entry.honors || [])].join("、"), { color: "555555", size: 18 }),
  ]);
}

function skillsXml(skills = {}) {
  return Object.entries(skills).map(([key, values]) => paraXml(`${key}：${(values || []).join(" | ")}`, { size: 19 }));
}

function experienceXml(entries = [], contentLabel, responsibilitiesLabel, resultsLabel) {
  return entries.flatMap((entry) => {
    const lines = [lineXml([entry.organization, entry.role, entry.location].filter(Boolean).join(" | "), period(entry), true)];
    if (entry.content) lines.push(paraXml(`${contentLabel}：${entry.content}`, { color: "555555", size: 18 }));
    if (entry.responsibilities?.length) lines.push(paraXml(`${responsibilitiesLabel}：`, { bold: true, size: 18 }), ...entry.responsibilities.map(bulletXml));
    if (entry.results?.length) lines.push(paraXml(`${resultsLabel}：`, { bold: true, size: 18 }), ...entry.results.map(bulletXml));
    return lines;
  });
}

function projectsXml(entries = []) {
  return entries.flatMap((entry) => {
    const title = [entry.name, entry.role, (entry.technologies || []).join(" / ")].filter(Boolean).join(" | ");
    const lines = [lineXml(title, period(entry), true)];
    if (entry.content) lines.push(paraXml(`内容：${entry.content}`, { color: "555555", size: 18 }));
    if (entry.responsibilities?.length) lines.push(paraXml("负责工作：", { bold: true, size: 18 }), ...entry.responsibilities.map(bulletXml));
    if (entry.results?.length) lines.push(paraXml("所获成果：", { bold: true, size: 18 }), ...entry.results.map(bulletXml));
    return lines;
  });
}

function awardsXml(entries = []) {
  return entries.flatMap((entry) => {
    const lines = [lineXml(entry.name || "", [entry.level, entry.date].filter(Boolean).join(" | "), false)];
    if (entry.responsibilities?.length) lines.push(...entry.responsibilities.map(bulletXml));
    if (entry.results?.length) lines.push(...entry.results.map(bulletXml));
    return lines;
  });
}

function headingXml(text) {
  return `<w:p>
    <w:pPr><w:spacing w:before="120" w:after="60"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="8B9691"/></w:pBdr></w:pPr>
    ${runXml(text, { bold: true, size: 22 })}
  </w:p>`;
}

function lineXml(left, right, bold = false) {
  return `<w:p>
    <w:pPr><w:spacing w:after="35"/><w:tabs><w:tab w:val="right" w:pos="9800"/></w:tabs></w:pPr>
    ${runXml(left, { bold, size: 19 })}${right ? '<w:r><w:tab/></w:r>' + runXml(right, { color: "555555", size: 18 }) : ""}
  </w:p>`;
}

function bulletXml(text) {
  return paraXml(`• ${text}`, { size: 18 });
}

function paraXml(text, options = {}) {
  if (!text) return "";
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : "";
  return `<w:p><w:pPr><w:spacing w:after="35"/>${align}</w:pPr>${runXml(text, options)}</w:p>`;
}

function runXml(text, options = {}) {
  const props = [
    `<w:rFonts w:eastAsia="DengXian" w:ascii="Calibri" w:hAnsi="Calibri"/>`,
    options.bold ? "<w:b/>" : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
    `<w:sz w:val="${options.size || 19}"/>`,
  ].join("");
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function sectPrXml() {
  return `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="648" w:right="792" w:bottom="648" w:left="792" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function documentRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:eastAsia="DengXian" w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="19"/></w:rPr>
    <w:pPr><w:spacing w:line="240" w:lineRule="auto"/></w:pPr>
  </w:style>
</w:styles>`;
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = typeof content === "string" ? encoder.encode(content) : content;
    const crc = crc32(data);
    const local = makeLocalHeader(nameBytes, data, crc);
    localParts.push(local, data);
    centralParts.push(makeCentralHeader(nameBytes, data, crc, offset));
    offset += local.length + data.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = makeEndRecord(Object.keys(files).length, centralSize, offset);
  return concatBytes([...localParts, ...centralParts, end]);
}

function makeLocalHeader(nameBytes, data, crc) {
  const out = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, nameBytes.length, true);
  out.set(nameBytes, 30);
  return out;
}

function makeCentralHeader(nameBytes, data, crc, offset) {
  const out = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, data.length, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint32(42, offset, true);
  out.set(nameBytes, 46);
  return out;
}

function makeEndRecord(count, centralSize, centralOffset) {
  const out = new Uint8Array(22);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return out;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function saveVersion() {
  const existing = findActiveVersion();
  if (existing) {
    existing.data = structuredClone(state.data);
    existing.updated_at = new Date().toLocaleString();
    existing.title ||= buildVersionTitle(existing);
    state.versions = [existing, ...state.versions.filter((version) => version.id !== existing.id)];
    persistVersions();
    persistDraft(`已更新：${existing.title}`);
    if (state.section === "library") render();
    return;
  }
  saveAsVersion();
}

function saveAsVersion() {
  const version = {
    id: buildVersionId(),
    title: buildVersionTitle(),
    created_at: new Date().toLocaleString(),
    updated_at: "",
    data: structuredClone(state.data),
  };
  state.versions.unshift(version);
  state.activeVersionId = version.id;
  pruneVersions();
  persistVersions();
  persistDraft(`已另存：${version.title}`);
  render();
}

function pruneVersions() {
  state.versions = state.versions.slice(0, state.maxVersions);
  if (state.activeVersionId && !findActiveVersion()) state.activeVersionId = "";
  persistVersions();
}

function persistVersions() {
  localStorage.setItem("meowresume-versions", JSON.stringify(state.versions));
  if (state.activeVersionId) {
    localStorage.setItem("meowresume-active-version-id", state.activeVersionId);
  } else {
    localStorage.removeItem("meowresume-active-version-id");
  }
}

function findActiveVersion() {
  return state.versions.find((version) => version.id === state.activeVersionId);
}

function exportJson() {
  downloadBlob(
    new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json;charset=utf-8" }),
    `${safePart(state.data.basics?.name || "resume")}.json`,
  );
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const payload = JSON.parse(text);
  state.data = payload.data || payload;
  state.activeVersionId = "";
  ensureShape();
  persistDraft("已导入 JSON");
  render();
  event.target.value = "";
}

function persistDraft(message) {
  localStorage.setItem("meowresume-draft", JSON.stringify(state.data));
  if (state.activeVersionId) {
    localStorage.setItem("meowresume-active-version-id", state.activeVersionId);
  } else {
    localStorage.removeItem("meowresume-active-version-id");
  }
  setStatus(message);
}

function setStatus(message) {
  statusText.textContent = `${message} · ${new Date().toLocaleTimeString()}`;
}

function buildVersionTitle(existing = null) {
  const basics = state.data.basics || {};
  const count = existing
    ? Math.max(1, state.versions.findIndex((version) => version.id === existing.id) + 1)
    : state.versions.length + 1;
  return `${basics.name || "未命名"}｜${basics.target_role || "简历"}｜v${String(count).padStart(2, "0")}`;
}

function buildVersionId() {
  return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeVersions(versions) {
  return (versions || []).map((version, index) => ({
    id: version.id || `legacy_${index}_${Date.now().toString(36)}`,
    title: version.title || `未命名版本｜v${String(index + 1).padStart(2, "0")}`,
    created_at: version.created_at || "",
    updated_at: version.updated_at || "",
    data: version.data || structuredClone(sampleData),
  }));
}

function buildFilename(data) {
  const basics = data.basics || {};
  return `${safePart(basics.name || "resume")}_${safePart(basics.target_role || "resume")}.docx`;
}

function validateData(data) {
  const warnings = [];
  const basics = data.basics || {};
  if (!basics.name) warnings.push("- 姓名不能为空");
  if (!basics.phone && !basics.email) warnings.push("- 手机号或邮箱至少填写一个");
  if (!data.education?.length) warnings.push("- 至少需要一条教育经历");
  if (!data.projects?.length && !data.experience?.length) warnings.push("- 至少需要项目或实习经历");
  return warnings;
}

function sectionHead(title, actions = "") {
  return `<div class="section-head"><h2>${title}</h2><div>${actions}</div></div>`;
}

function entryHead(title, key, index) {
  return `<div class="entry-head"><span>${title}</span><button class="danger" data-action="remove-entry" data-key="${key}" data-index="${index}" type="button">删除</button></div>`;
}

function field(label, path, value = "") {
  return `<div class="field"><label>${label}</label><input data-path="${escapeAttr(path)}" value="${escapeAttr(value)}" /></div>`;
}

function textarea(label, path, value = "", extraClass = "") {
  return `<div class="field ${extraClass}"><label>${label}</label><textarea data-path="${escapeAttr(path)}">${escapeHtml(value)}</textarea></div>`;
}

function emptyNote(text) {
  return `<p class="hint">${escapeHtml(text)}</p>`;
}

function ul(items = []) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function emptyEducation() {
  return { school: "", degree: "本科", major: "", start: "", end: "", gpa: "", rank: "", courses: [], honors: [] };
}

function emptyExperience() {
  return { organization: "", role: "", location: "", start: "", end: "", content: "", responsibilities: [], results: [] };
}

function emptyProject() {
  return { name: "", role: "", technologies: [], start: "", end: "", content: "", responsibilities: [], results: [] };
}

function emptyAward() {
  return { name: "", level: "", date: "", responsibilities: [], results: [] };
}

function factoryFor(key) {
  return { education: emptyEducation, experience: emptyExperience, projects: emptyProject, awards: emptyAward }[key];
}

function addSkill() {
  let index = Object.keys(state.data.skills).length + 1;
  let key = `技能类别${index}`;
  while (state.data.skills[key]) key = `技能类别${++index}`;
  state.data.skills[key] = [];
}

function renameSkill(oldKey, newKey) {
  const key = String(newKey || "").trim();
  if (!key || key === oldKey || state.data.skills[key]) return;
  const next = {};
  for (const [current, values] of Object.entries(state.data.skills)) {
    next[current === oldKey ? key : current] = values;
  }
  state.data.skills = next;
}

function setValue(root, path, value) {
  const parts = path.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part));
  let target = root;
  for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
  target[parts.at(-1)] = value;
}

function getParent(root, path) {
  const parts = path.split(".").slice(0, -1).map((part) => (/^\d+$/.test(part) ? Number(part) : part));
  return parts.reduce((target, part) => target[part], root);
}

function shouldBeList(path) {
  return /\.(courses|honors|responsibilities|results|technologies)$/.test(path) || path === "certifications" || path.startsWith("skills.");
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

function period(entry) {
  return [entry.start, entry.end].filter(Boolean).join(" - ");
}

function splitPeriod(value) {
  const parts = String(value || "").split(/\s*(?:-|—|–|至|~|～)\s*/);
  return [parts[0] || "", parts.slice(1).join(" - ") || ""];
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safePart(value) {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50) || "resume";
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

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
