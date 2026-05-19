# MeowResume

**应届生大厂简历 Word 生成器 / Local-first resume builder for Chinese campus recruiting**

_填写结构化内容，预览标准简历版式，一键生成 ATS 友好的 `.docx` Word 简历。_

![Python](https://img.shields.io/badge/Python-3.10--3.12-blue?style=flat-square&logo=python)
![Word](https://img.shields.io/badge/Export-DOCX-2b579a?style=flat-square&logo=microsoftword)
![Local First](https://img.shields.io/badge/Local--first-No%20cloud%20upload-2ea44f?style=flat-square)
![Tests](https://img.shields.io/badge/tests-unittest-brightgreen?style=flat-square)

[在线使用](https://mi0uno.github.io/MeowResume/) · [本地运行](#本地运行) · [数据结构](#数据结构) · [本地-api](#本地-api)

## 项目概述

这是一个面向应届生技术岗、网络安全岗、研发岗的中文简历生成器。它把“简历内容”和“简历排版”拆开：你只需要在浏览器页面里填写基础信息、教育经历、实习经历、项目与科研、竞赛获奖、证书荣誉，系统会按统一格式生成可投递的 Word 简历。

> 目标是让 HR、ATS 系统和一线面试官在 10 秒内读到重点：学校、岗位匹配度、项目职责、量化成果和硬核证书。

> [!IMPORTANT]
> 在线版直接运行在浏览器里，真实简历不会上传到服务器。仓库里的真实简历、证件照、历史版本和生成的 Word 文件也会被 `.gitignore` 排除。

## 核心能力

| 能力 | 说明 |
| --- | --- |
| 浏览器填写 | 本地启动 Web 页面，按模块填写内容，右侧实时预览简历 |
| Word 导出 | 一键生成 `.docx`，保留中文简历常见的紧凑单页版式 |
| 简历库 | 每次保存都会生成新版本，自动追加时间和版本号，避免覆盖混淆 |
| 留存上限 | 可配置最大保存数量，超过后自动裁剪最旧版本 |
| 证件照位 | 支持右上角证件照，也支持关闭照片位输出 ATS 版本 |
| 格式设置 | 可调整字体、字号、行间距、页边距等 Word 样式参数 |
| JD 优化 | 可输入岗位 JD，自动把技能关键词中更匹配岗位的内容前置 |
| 质量检查 | 检查关键字段缺失、经历 bullet 是否缺少量化表达等问题 |

## 界面与输出

前端页面围绕“左侧模块导航 + 中间表单 + 右侧简历预览”组织，适合边写边调。

支持的简历模块：

- 基础信息
- 教育经历
- 专业技能
- 实习经历
- 项目&科研经历
- 竞赛获奖
- 其它证书和荣誉
- 格式设置
- 岗位 JD
- 简历库

Word 输出遵循保守、清晰、可解析的中文校招简历格式：A4 页面、单栏正文、紧凑行距、标题下划线、经历 bullet 化、奖项和证书左右对齐。

## 在线直接使用

打开 GitHub Pages：

```text
https://mi0uno.github.io/MeowResume/
```

在线版能力：

- 直接在网页里填写简历内容。
- 浏览器本地保存草稿和历史版本。
- 一键生成 `.docx` Word 简历。
- 支持导入/导出 JSON，方便跨浏览器迁移。
- 不依赖后端服务，不上传真实简历数据。

在线版为了保持纯静态部署，暂不把真实照片嵌入 Word，只保留证件照占位。需要真实照片嵌入、Python 版严格模板和本地 API 时，使用下面的本地运行方式。

## 本地运行

### 前置要求

| 工具 | 版本建议 | 用途 | 检查命令 |
| --- | --- | --- | --- |
| Python | 3.10 - 3.12 | 运行生成器和本地 Web 服务 | `python --version` |
| pip | 跟随 Python | 安装 `python-docx` | `pip --version` |
| 浏览器 | Chrome / Edge / Firefox | 打开本地编辑页面 | `http://127.0.0.1:8765` |

> [!NOTE]
> `web_server.py` 使用了 Python 标准库里的 `cgi` 处理表单上传。建议使用 Python 3.10 - 3.12；Python 3.13 及以上可能需要替换上传解析实现。

### 安装依赖

```powershell
pip install -r requirements.txt
```

依赖很轻，目前只需要：

```text
python-docx>=1.1.2
```

### 启动前端页面

```powershell
python web_server.py
```

访问：

```text
http://127.0.0.1:8765/
```

在页面里填写内容后，可以点击：

- `检查质量`：检查缺失字段和简历表达问题
- `保存版本`：保存当前草稿到简历库
- `生成 Word`：直接下载 `.docx` 文件

## 命令行用法

不打开浏览器，也可以直接用 JSON 生成 Word。

```powershell
python resume_generator.py --data candidate.example.json
```

指定输出路径：

```powershell
python resume_generator.py --data candidate.example.json --output output/my_resume.docx
```

根据岗位 JD 调整技能关键词顺序：

```powershell
python resume_generator.py --data candidate.example.json --jd job_description.example.txt
```

使用真实证件照：

```powershell
python resume_generator.py --data candidate.example.json --photo D:\photos\id_photo.jpg
```

生成无照片版本：

```powershell
python resume_generator.py --data candidate.example.json --no-photo
```

严格模式，存在质量提醒时返回非 0 状态：

```powershell
python resume_generator.py --data candidate.example.json --strict
```

## CLI 参数

| 参数 | 必需 | 说明 |
| --- | --- | --- |
| `--data` | 否 | 简历 JSON 文件，默认 `candidate.example.json` |
| `--output` | 否 | 输出 `.docx` 路径，默认写入 `output/` |
| `--jd` | 否 | 岗位描述文本，用于技能关键词排序 |
| `--photo` | 否 | 证件照路径，覆盖 JSON 里的照片配置 |
| `--no-photo` | 否 | 关闭右上角证件照位 |
| `--strict` | 否 | 有质量提醒时以状态码 `2` 退出 |

## 数据结构

最小 JSON 结构：

```json
{
  "basics": {
    "name": "姓名",
    "target_role": "后端开发工程师",
    "phone": "138-0000-0000",
    "email": "name@example.com",
    "city": "北京",
    "photo": {
      "enabled": true,
      "path": "D:\\photos\\id_photo.jpg"
    }
  },
  "education": [],
  "skills": {},
  "experience": [],
  "projects": [],
  "awards": [],
  "certifications": []
}
```

实习经历建议写成结构化对象：

```json
{
  "organization": "公司/实验室/团队",
  "role": "安全研发实习生",
  "location": "北京",
  "start": "2025.07",
  "end": "2025.10",
  "content": "围绕业务安全检测平台建设，参与漏洞扫描、资产识别与告警治理。",
  "responsibilities": [
    "负责资产指纹识别模块开发，补齐 Web 服务、端口和中间件识别规则",
    "参与漏洞验证链路优化，减少重复告警并提升人工复核效率"
  ],
  "results": [
    "覆盖 2000+ 资产，误报率下降 30%，高危漏洞响应时间缩短至 1 天内"
  ]
}
```

项目&科研经历同样支持：

- `name`
- `role`
- `technologies`
- `start`
- `end`
- `content`
- `responsibilities`
- `results`

竞赛获奖可以写成简单字符串：

```json
"ISCC 2025 | 国家级二等奖 | 2025"
```

也可以写成结构化对象：

```json
{
  "name": "全国大学生信息安全竞赛",
  "level": "国家级二等奖",
  "date": "2025.08",
  "responsibilities": [
    "负责 Web 渗透与自动化脚本编写，沉淀常见题型解题模板"
  ],
  "results": [
    "团队排名进入赛区前列"
  ]
}
```

## 简历库

浏览器页面支持版本留存，适合为不同岗位维护多版简历。

| 文件/目录 | 作用 |
| --- | --- |
| `data/resume_library.json` | 保存历史版本、JD、标题、基础元数据 |
| `data/photos/` | 保存上传过的证件照副本 |
| `output/` | 命令行或调试生成的 Word 文件 |

保存规则：

- 每次保存都会新建版本，不覆盖旧版本。
- 版本名会自动追加时间和 `v01`、`v02` 这类序号。
- 最大留存数量默认为 `30`，可在页面“简历库”里修改。
- 超出留存上限后，会从最旧版本开始删除。

> [!WARNING]
> `data/` 和 `output/` 里可能包含个人隐私信息。公开仓库前建议确认这些目录没有被提交。

## 本地 API

本地服务由 `web_server.py` 提供，默认监听 `127.0.0.1:8765`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/` | 前端页面 |
| `GET` | `/api/sample` | 获取示例简历 JSON |
| `GET` | `/api/library` | 获取简历库版本列表 |
| `GET` | `/api/library/{id}` | 获取某个历史版本 |
| `POST` | `/api/analyze` | 检查简历质量 |
| `POST` | `/api/generate` | 生成并下载 Word 简历 |
| `POST` | `/api/library/save` | 保存当前版本 |
| `POST` | `/api/library/settings` | 更新最大留存数量 |

## 项目结构

```text
make_resume/
├─ resume_generator.py              # Word 简历生成、格式设置、质量检查
├─ web_server.py                    # 本地 HTTP 服务与简历库 API
├─ candidate.example.json           # 示例简历数据
├─ job_description.example.txt      # 示例岗位 JD
├─ requirements.txt                 # Python 依赖
├─ web/
│  ├─ index.html                    # 前端页面结构
│  ├─ app.js                        # 表单状态、预览、保存、下载
│  └─ styles.css                    # 工作台与简历预览样式
├─ tests/
│  ├─ test_resume_generator.py      # Word 生成器测试
│  └─ test_web_server.py            # 本地服务与简历库测试
├─ data/                            # 本地简历库和照片缓存
└─ output/                          # 生成的 Word 文件
```

## 格式原则

本项目内置的简历格式偏向校招和大厂投递：

- A4 页面，窄边距，尽量控制在一页。
- 不使用文本框、复杂图形、进度条，减少 ATS 解析失败。
- 顶部突出姓名、目标岗位、电话、邮箱、城市。
- 教育经历优先，项目和实习强调职责与结果。
- 技能区按类别组织，技术关键词清晰可扫读。
- 奖项、证书采用“左侧名称 + 右侧等级/年份”的紧凑格式。
- bullet 推荐使用“动作 + 技术/任务 + 量化结果”的表达。

## 测试

运行完整测试：

```powershell
python -m unittest discover -s tests
```

当前测试覆盖：

- Word 文件是否可打开
- 核心模块是否输出
- 证件照位是否可启用/关闭
- 格式设置是否写入 Word
- 简历库保存、载入、留存裁剪
- 奖项与证书的紧凑格式解析

## 常见问题

### 生成的简历超过一页怎么办？

优先删弱相关经历，保留 2-3 段最贴近目标岗位的项目/实习。其次缩短 bullet，每条尽量只保留一个动作和一个结果。

### 是否一定要放证件照？

不一定。国内部分校招系统和传统岗位会接受照片版；更看重 ATS 解析的互联网岗位可以使用 `--no-photo` 输出无照片版。

### 可以写多个岗位版本吗？

可以。建议每个岗位保存一个版本，并在“岗位 JD”里放入对应职位描述，让技能关键词和项目表达更贴近岗位。

### 可以直接改 JSON 吗？

可以。前端页面和命令行都读取同一类 JSON 结构。你可以先在页面里保存版本，再从 `data/resume_library.json` 中取出对应版本继续加工。

## 路线图

- [x] Word 简历生成
- [x] 浏览器表单编辑
- [x] 证件照位
- [x] 简历库与自动版本名
- [x] 格式设置页面
- [x] 实习、项目、竞赛结构化内容
- [ ] 从旧 Word/Markdown 简历反向抽取 JSON
- [ ] 中英文双语简历模板
- [ ] 多岗位模板预设
- [ ] 简历内容改写建议与 bullet 强化

## 许可证

当前仓库未包含 `LICENSE` 文件。若准备公开发布，建议先补充明确的开源许可证。
