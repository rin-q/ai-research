# AI Research · 人工智能安全课程实验

面向人工智能安全研究的**本地科研辅助平台**：从公开来源采集资料，做清洗去重与主题分析，归档进双知识库，并生成候选研究方向。

本仓库是[西电人工智能安全课程班级仓库](https://github.com/CDJDAA/xidian-ai-security-class-project-new)的**源码副本 + 本人二次开发**，包含课程提供的四个项目。实际投入开发与验证的是 **project-04**，其余三个为课程配套的对照项目，保留原样未改动。

> **许可声明（必读）**：project-04 基于 [MediaCrawler](https://github.com/NanmiCoder/MediaCrawler) 二次开发，遵循其 **NON-COMMERCIAL LEARNING LICENSE 1.1**（版权所有者 relakkes@gmail.com，全文见 [`projects/project-04-Intelligence Gathering/LICENSE`](projects/project-04-Intelligence%20Gathering/LICENSE)）。本仓库**仅供非商业学习与研究**，不得用于大规模爬取或干扰平台运营。各项目的原作者版权与许可证均予保留。

---

## 1. 整体功能

四个项目独立安装、独立运行，覆盖"科研自动化"链条的不同环节：

| 编号 | 项目 | 在链条中的角色 | 整体功能 |
| --- | --- | --- | --- |
| 01 | [AI-Researcher](projects/project-01-ai-researcher)（HKUDS） | 执行 | 把参考文献、研究想法、代码实验与论文写作串成自动研究流程 |
| 02 | [AI-Scientist-v2](projects/project-02-ai-scientist-v2)（SakanaAI） | 执行 | 从研究主题生成想法 → 实验树搜索执行实验 → 生成论文与模拟审稿 |
| 03 | [DeepTutor](projects/project-03-deeptutor)（HKUDS） | 理解 | 智能辅导与知识问答：对话、知识库 RAG、学习材料与多阶段学习任务 |
| 04 | [Intelligence Gathering](projects/project-04-Intelligence%20Gathering)（MediaCrawler 二开） | **输入** | 多源采集 → 内容分析 → 知识库归档 → 研究想法生成 |

**project-04 是本仓库的主体**，完整流水线为：

```
多源采集                内容分析                  知识归档              研究产出
─────────              ─────────                ─────────            ─────────
GitHub  ┐              清洗 / 去重               学术库（文献笔记）    热点趋势
arXiv   ├─ JSONL ───►  关键词提取      ───►      社交库（原始内容/  ─► 候选研究方向
小红书  │              主题分类                  评论证据/专题观察）    Idea 生成（需 LLM）
抖音/B站┘              证据句抽取                                      实验任务下发（可选）
微博/知乎/贴吧
```

- **9 个采集源**：学术与开源走公开 API（GitHub、arXiv，无需登录）；7 个社交平台需本人扫码或 Cookie 登录
- **中文关键词自动扩展**：输入「对抗样本」会同时检索 `adversarial examples`、`adversarial attack`
- **双知识库**：学术库与社交库分离，只向既有目录追加，不重写用户原有结构
- **无 LLM 也能用**：不配 API Key 时，采集、清洗、去重、关键词提取、主题分类、知识归档全部可用（规则模式）；仅 AI 摘要与研究想法生成需要模型服务
- **Web 界面**：新任务 / 采集结果 / 运行日志 / 账号设置 / 内容分析 / 知识库 / 科研自动化 七个页面

---

## 2. 安装与运行

**本仓库只在 project-04 上完成过安装与端到端运行验证**（Windows 11 + Python 3.11.16 + Node v24.18.1 + uv 0.12.5）。project-01/02/03 保留课程原始说明，未实测；其中 project-02 上游硬性要求 Linux + NVIDIA GPU + CUDA。

### 2.1 前置条件

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Python | ≥ 3.11 | 若系统只有 3.10/3.9，`uv sync` 会按 `.python-version` 自动下载 3.11 |
| [uv](https://docs.astral.sh/uv/) | 任意近期版本 | 也可用标准 venv + pip，见下 |
| Node.js | 22+（实测 24 可用） | **本项目不需要**，前端已预构建；仅部分社交平台的 JS 签名会用到 |
| Playwright Chromium | — | 仅社交平台采集需要；GitHub/arXiv 不需要 |

依赖源已在 `pyproject.toml` 中配置为清华镜像，国内网络无需额外设置。

### 2.2 ⚠️ 克隆前必读：Windows 路径长度

仓库内有 **267 个文件的相对路径长 200–217 字符**（219 个是上游误提交的 `project-04/webui/.npm-cache/`，48 个是 project-01 的超长模板文件名）。Windows `MAX_PATH` 为 260，**克隆位置的前缀必须足够短**，否则这些文件检不出来，`git status` 会出现大量幽灵删除，连 `git add` 都会报 `Filename too long`。

```powershell
# 推荐：克隆到短路径（前缀 ≤ 30 字符）
git clone https://github.com/rin-q/ai-research.git D:\ai-research

# 或者：允许 git 使用长路径（Windows 上建议直接全局开启）
git config --global core.longpaths true
```

> 注意：`core.longpaths` 需要 Windows 10 1607+ 且系统已启用长路径支持（注册表 `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled = 1`）。即便系统已开启，git 仍需此配置才肯使用长路径前缀。

**后果提示**：路径过长导致文件缺失时，执行 `git add <项目目录>` 会把数百个"删除"暂存进去，提交后等于删掉上游文件。每次提交前务必 `git status --short` 逐条确认。

> 本仓库已不再包含 `webui/.npm-cache/`（23 MB 的 npm 缓存，上游误提交），因此超长路径主要来自 project-01 的 48 个模板文件。

### 2.3 安装依赖

```powershell
cd D:\ai-research
cd "projects\project-04-Intelligence Gathering"
uv sync --frozen
```

约 50–90 秒，`.venv` 约 480MB。不用 uv 时：

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

社交平台采集需要浏览器（GitHub/arXiv 不需要）：

```powershell
$env:PLAYWRIGHT_DOWNLOAD_HOST="https://cdn.npmmirror.com/binaries/playwright"
uv run playwright install chromium
```

> 官方 `cdn.playwright.dev` 在国内网络下 DNS 解析失败（ENOENT），**必须**加上面的镜像变量。安装完不要只看退出码——若命令写成 `... | tail`，管道会吞掉真实退出码，失败也会显示成功。

### 2.4 启动

```powershell
# uv 方式
uv run start.py

# 或直接调用虚拟环境（等价，且不需要 uv 在 PATH 里）
.\.venv\Scripts\python.exe start.py
```

浏览器打开 **http://127.0.0.1:8080**，首次进入点击「我已知晓并同意上述条款」。`Ctrl+C` 停止。

`start.py` 会自动完成：`.env` 不存在时从 `.env.example` 复制、创建 `data/` 与 `knowledge/` 目录结构、以 `host=127.0.0.1` 启动 uvicorn。

**服务只监听本机**。它是单用户本地服务，没有多用户账户与计费隔离，不要开放给他人共用，也不要直接部署到公网。

端口被占用时：`uv run start.py --port 8081`

### 2.5 配置模型（可选）

```powershell
uv run configure_api.py    # 交互式填写，密钥不回显，只写入本机 .env
```

或直接编辑 `.env`：

```dotenv
AI_API_KEY=你的密钥
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
GITHUB_TOKEN=          # 可选，提高 GitHub API 配额
```

**留空即可使用全部本地功能**（采集、清洗、去重、关键词、主题分类、归档）。修改 `.env` 后需重启服务。

### 2.6 验证安装正常

```powershell
curl http://127.0.0.1:8080/api/health                # {"status":"ok"}
curl http://127.0.0.1:8080/api/config/platforms      # 9 个平台，含 github / arxiv
.\.venv\Scripts\python.exe -m pytest tests -q        # 136 passed
```

> `/api/env/check` 会起子进程，约需 5 秒；`curl` 超时要给到 20 秒以上，否则会拿到空响应而误判为故障。

### 2.7 最小可用演示（不需要 API Key）

1. 「新任务」→ 关键词填 `adversarial examples` → 平台勾选 **arXiv + GitHub** → 采集数量设小（如 10）→ 存储格式 JSONL → 开始采集
2. 「采集结果」确认生成了实际记录（不是只有"启动成功"提示）
3. 「内容分析」勾选文件 → 分析 → 查看主题聚类与关键词
4. 「知识库」查看归档出的文献笔记，点开一篇核对 URL 与摘要是否对应原始记录
5. 「科研自动化」查看热点趋势与候选研究方向

采集是异步子进程：`/api/crawler/start` 会立刻返回 `{"status":"ok"}`，需轮询 `/api/crawler/status` 到 `idle`，再看 `/api/crawler/logs`。**注意 `idle` 不等于成功**——失败也会变成 `idle`，必须查日志里的退出码。

---

## 3. 用到的第三方项目

| 项目 | 来源 | 用途 | 许可 |
| --- | --- | --- | --- |
| **MediaCrawler** | [NanmiCoder/MediaCrawler](https://github.com/NanmiCoder/MediaCrawler) | project-04 的采集基础与部分 WebUI | NON-COMMERCIAL LEARNING LICENSE 1.1（见 [LICENSE](projects/project-04-Intelligence%20Gathering/LICENSE)） |
| **AI-Researcher** | [HKUDS/AI-Researcher](https://github.com/HKUDS/AI-Researcher) | 课程 project-01，上游版本 `f9a6f84` | 上游根目录无独立 LICENSE，使用与分发前需自行核实授权 |
| **AI-Scientist-v2** | [SakanaAI/AI-Scientist-v2](https://github.com/SakanaAI/AI-Scientist-v2) | 课程 project-02，上游版本 `96bd516` | 保留其 [LICENSE](projects/project-02-ai-scientist-v2/LICENSE) |
| **DeepTutor** | [HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor) | 课程 project-03，上游版本 `f07029c` | 保留其 LICENSE |
| **Sakana AI Scientist** | [SakanaAI/AI-Scientist](https://github.com/SakanaAI/AI-Scientist) | project-04 可选实验适配层对接的框架 | 需单独确认版本与许可 |
| FastAPI / Uvicorn / React / Vite / Playwright / httpx / jieba / pandas / SQLAlchemy 等 | 各自上游 | 运行依赖，见 `pyproject.toml` 与 `uv.lock` | 各自许可证 |

课程班级仓库：[CDJDAA/xidian-ai-security-class-project-new](https://github.com/CDJDAA/xidian-ai-security-class-project-new)。课程原始总说明保留在 [`COURSE-OVERVIEW.original.md`](COURSE-OVERVIEW.original.md)，各项目的课程任务书为对应的 `COURSE.md`，整理前的上游说明为 `README.original.md`。

---

## 4. 本次二次开发内容

改动集中在 project-04，共 **2 处源码修复 + 2 个新测试文件**，合计 `+31/-4` 行源码、40 个新测试。全套测试 **136 passed**（上游原有 96 + 新增 40）。

两处修复都做过**反向验证**：撤销修复后重跑，分别精确失败 5 个和 3 个测试，恢复后全绿。

### 4.1 修复 A：发表时间字段静默丢失（数据完整性）

**问题**：[`pipeline/analysis_service.py`](projects/project-04-Intelligence%20Gathering/pipeline/analysis_service.py) 的 `_normalize` 用 `_first(row, "create_time", "publish_time", "time", "date")` 取日期，但 arXiv/GitHub 适配器写入的字段名是 `published_at`，不在候选列表里 → 日期被静默丢弃。

数据库层其实早已为此设计好（upsert 用 `COALESCE(NULLIF(excluded.published_at,''), documents.published_at)`，趋势计算有 `published_times` / `primary_basis` 机制），只是被一个字段名饿死。

**连锁后果**（修复前实测）：

- `documents.published_at` 空值 **118/118**
- 趋势计算降级到 `incremental` 基线，即用**抓取时间冒充发表时间**：`primary_basis` **11/11** 为 `incremental`，`published.available` **0/11**
- `velocity` **恰好等于 document_count**（53=53、49=49、41=41），即"趋势"只是在测"这次爬了多少条"，**9/11 主题被误判为 rising**
- 分析管道与趋势接口对同一批数据给出**相反结论**（前者恒 `stable`，后者 `rising`）
- 归档笔记的 `created:` 回退成 `updated_at`，把 2016 年创建的仓库标成今天

**修复**：候选字段补上 `published_at`（`+2/-1` 行，含一行注释说明两类来源的字段差异）。

**修复后实测**（同一批原始 JSONL 重跑，输入完全一致）：

| 指标 | 修复前 | 修复后 |
| --- | --- | --- |
| `published_at` 空值 | 118/118 | **0/118** |
| `primary_basis = published` | 0/11 | **3/11** |
| `velocity == document_count` | 11/11 | **8/11** |
| `trend = rising` | 9/11 | 6/11 |
| 分析层 `recent_count > 0` 的主题 | 0 | **3** |

「RAG 与知识库安全」从 `velocity=53.0 / rising`（凭空捏造）变为 `velocity=0.0 / stable / basis=published`（由真实发表日期算出）。

新增 [`tests/test_pipeline_analysis.py`](projects/project-04-Intelligence%20Gathering/tests/test_pipeline_analysis.py)（18 测试）——`pipeline/` 此前**零测试覆盖**。

### 4.2 修复 B：采集结果的来源可信度（知识库投毒面）

**问题 1**：GitHub 检索固定使用 `sort=stars`，把**热度当成相关性**。对照实验（同一查询，仅改排序）：

- `RAG security`：`sort=stars` 让 `PoisonedRAG`（**USENIX Security 2025**，RAG 投毒攻击，最对口）排在 #6，而 #1/#2 是通用 RAG 引擎 `quivr`(39k★) 和数据助手 `DB-GPT`(20k★)；改相关性排序后 `PoisonedRAG` 升到 **#1**
- `AI security`：`sort=stars` 的前 15 名混入 `RemoveWindowsAI`(13k★，卸载 Windows Copilot 的 PowerShell 脚本)
- `对抗样本`：`sort=stars` 的**前 5 名 0 条相关**——#1 是个人书单 `Some-Many-Books`(25k★)，其后是 x86 教程、政治宣传仓库、中文社区论坛仓库、日语 VTuber 投诉页

**问题 2**：中文原词被原样发给 arXiv。arXiv 是英文语料，`all:对抗样本` 返回 0 条（静默无警告），`all:RAG 安全` 被分词后**只匹配 "RAG"**，返回 5 篇与安全无关的通用 RAG 论文，而 `actual_query` 仍记录为「RAG 安全」——**溯源字段与真实查询不一致**。

**两个平台的修法故意不同**，因为实测表现相反：GitHub 有中文索引，相关性排序下 `对抗样本` 返回 8/8 全相关，故**保留**中文查询、只去掉 stars 排序；arXiv 无中文内容，故**跳过**含 CJK 的查询并输出警告日志，全部查询都不可用时直接返回而非静默报告"采集成功"。

**修复后实测**（同关键词 `人工智能安全`、同 `max_notes_count=15`、同平台）：

| 指标 | 修复前 | 修复后 |
| --- | --- | --- |
| 人工标注的无关仓库 | **18/60（30%）** | **4/59（7%）** |
| arXiv 中带 CJK `actual_query` 的记录 | 5/27 | **0/22** |

修复前 #1 的 `Some-Many-Books`、以及 `china-dictatorship` 及其 2 个镜像、`gege-circle/.github`、`RemoveWindowsAI`、Java/Dify 教程等全部消失；新捞回 `google-deepmind/ai-safety-gridworlds`、`aliasrobotics/cai`(9.8k★)、`0din-ai/ai-scanner`、`Giskard-AI/awesome-ai-safety`、`datawhalechina/ml-for-security` 等对口仓库。

新增 [`tests/test_research_queries.py`](projects/project-04-Intelligence%20Gathering/tests/test_research_queries.py)（22 测试，含对 httpx 的 mock，覆盖请求参数与 CJK 过滤行为）。

---

## 5. 已知问题与局限

以下均经实测确认，**未修改代码**，作为安全分析记录。

### 5.1 修复 B 的代价（重要）

GitHub 的相关性排序是**纯词法匹配**，会漏掉语义相关但用词不同的仓库。本次修复同时丢掉了约 10 个高相关仓库：`usestrix/strix`(70k★，AI 渗透测试)、`KeygraphHQ/shannon`(49k★)、`yueliu1999/Awesome-Jailbreak-on-LLMs`、`cebeuq/Synthid-Bypass`、`kaplanelad/shellfirm`、`The-Art-of-Hacking/h4cker` 等——因为它们的描述写的是 "AI penetration testing"，不含查询的字面词 "AI security"。

**两种排序都不"正确"**：`stars` 放大热度噪声，`relevance` 纯词法漏语义。更优解是两种排序取并集再去重（API 调用翻倍；未认证的 GitHub 搜索限 10 req/min，4 查询 × 2 = 8 仍在额度内）。本次未实现，以守住"一项目标明确的修改"的范围。

### 5.2 主题分类存在子串误匹配

`pipeline/topic_taxonomy.py` 的别名表含裸字符串 `"rag"`，而 `_taxonomies` 用子串匹配。最小复现：

```python
_taxonomies("The average coverage of this storage system is fine.", taxonomy)
# -> ['RAG 与知识库安全']     # ave-rag-e / cove-rag-e / sto-rag-e 均命中
```

### 5.3 无关内容可被自动归档为「文献」

修复前，GitHub 搜「对抗样本」捞回的政治宣传仓库被归类为「RAG 与知识库安全」+「Agent 与工具调用安全」，并**自动写入学术知识库当作文献笔记**。入库前没有相关性校验。

这构成本平台自身的一个投毒面：**一个用于研究「数据投毒与供应链安全」「RAG 与知识库安全」的工具，其知识库可被同类手段污染**，且门槛极低——任何高星仓库只要文本命中别名子串即可进入任意主题的证据集。修复 B 降低了发生率，但**没有从根本上加入相关性校验**。

### 5.4 采集零重试

arXiv 适配器对 `client.get` 无 try/except、无重试：单次 `ConnectError` 或 `RemoteProtocolError` 会让整个平台退出码 1 并丢弃已采数据。实测累计 **3 次**瞬时失败（均与本机代理抖动有关），每次重跑即成功。`tenacity` 已在依赖中但未用于此处。适配器也**不输出按查询的进度日志**，失败时无法判断死在第几个查询。

### 5.5 其他

- `_keywords` 用 jieba TF-IDF 处理英文摘要，产出 `library`/`constructing`/`must`/`our` 等停用词；`config.STOP_WORDS_FILE`（`docs/hit_stopwords.txt`）只被词云用到，未接入关键词提取
- `_content_type` 的关键词表偏中文：真实英文对抗攻击论文摘要被判为 `discussion`
- `research_directions` 的 `research_questions` / `recommended_methods` 是把主题名塞进固定模板串（"如何建立可复现的{主题}风险评测基准？"），5 个方向除主题名外逐字相同，与证据无关
- `_is_recent` 用 `timedelta.days <= days` 判断，**未来时间戳会被算作"近期"**；空值与非法值静默返回 False
- `_fingerprint` 是 title+text+url 的精确 SHA1，近重复（改写、截断、同文异 URL）无法识别；跨文件完全重复可去除（实测 140 → 113）
- 生成的文件名含空格、逗号与中文；Web 界面的文件列表不显示平台子目录，两个同名文件无法区分
- 已入库的旧记录**不会自动回填**日期，需重跑分析（upsert 的 COALESCE 只在有新值时覆盖）
- 修复 A 之后仍有 8/11 主题走 `incremental` 基线，这是**正确行为**：趋势窗口为 30 天，而语料中只有 1 篇文献落在窗口内

### 5.6 未验证的部分

- **社交平台采集未实测**。7 个社交平台均需本人扫码或 Cookie 登录，本次只验证了 GitHub 与 arXiv 两条公开 API 路径
- **AI 摘要与研究想法生成未实测**（未配置模型 API Key）。无 Key 时的降级行为已验证：`POST /api/scientist/ideas/generate` 返回 502「未配置 AI_API_KEY，无法使用 AI 生成。」，`/api/scientist/preflight` 返回 `ready:false` 并列出缺项
- **project-01 / 02 / 03 未安装、未运行**，其说明沿用课程原始文档
- **自动化实验对接未验证**。project-04 的实验适配层要求外部框架提供 `launch_scientist_bfts.py` 等接口，与课程 project-02 放在同一目录下**不代表已互相兼容**

### 5.7 本机环境相关的坑

- **系统代理**：Windows 注册表中的系统代理会被 Python httpx 读取，但 Git Bash 的 `curl` 不读。因此"curl 通、程序里报错"是正常现象，不能据此判断网络无问题。诊断用 `python -c "import urllib.request;print(urllib.request.getproxies())"`
- **大文件下载不要与采集并发**：两者挤同一个代理会导致采集端 TLS 握手失败
- **`uv` 可能不在 PowerShell 的 PATH**：uv 默认装在 `%USERPROFILE%\.local\bin`，该目录在 Git Bash 的 PATH 里但通常不在 Windows 用户级 PATH 里。用 `.\.venv\Scripts\python.exe start.py` 可完全绕开

---

## 6. 本仓库未包含的内容

按"只上传源代码"的原则，以下**数据与构建产物已排除**，需要时从上游获取：

| 排除项 | 原体积 | 获取方式 |
| --- | --- | --- |
| `project-01/examples/` | 735 MB | 上游生成的示例输出（含 6 个 63–92 MB 的演示 GIF，超过 GitHub 单文件警告阈值），见 [HKUDS/AI-Researcher](https://github.com/HKUDS/AI-Researcher) |
| `project-01/benchmark/` | 153 MB | 基准数据集 JSON，同上；`.env.template` 中的 `CATEGORY`/`INSTANCE_ID` 对应 `benchmark/final/<CATEGORY>/<INSTANCE_ID>.json` |
| `project-04/data/` | 21 MB | 运行时生成的采集结果与分析输出，含 SQLite 情报库 |
| `project-04/knowledge/` | 0.5 MB | 运行时生成的双知识库 Markdown 归档 |
| `project-04/.venv/` | 526 MB | `uv sync --frozen` 重建 |
| `project-04/webui/.npm-cache/` | 23 MB | npm 缓存，上游误提交，非源码 |
| `.env` | — | 含密钥，永不提交；由 `.env.example` 复制或 `configure_api.py` 生成 |
| `__pycache__/`、`*.pyc`、`.pytest_cache/` | — | 构建缓存 |

`.gitignore` 已覆盖上述所有项，在本仓库目录下运行程序产生的数据不会被误提交。

---

## 7. 目录结构

```text
ai-research/
├── README.md                        本文件
├── COURSE-OVERVIEW.original.md      课程班级仓库原始总说明（含 Fork/PR 提交规范）
├── .gitignore
└── projects/
    ├── project-01-ai-researcher/    AI-Researcher（未改动）
    ├── project-02-ai-scientist-v2/  AI-Scientist-v2（未改动）
    ├── project-03-deeptutor/        DeepTutor（未改动）
    └── project-04-Intelligence Gathering/
        ├── pipeline/                分析与情报归纳（本次修改）
        ├── media_platform/research/ arXiv/GitHub 采集适配器（本次修改）
        ├── tests/                   136 个测试（本次新增 40 个）
        ├── api/                     FastAPI 路由与预构建前端
        ├── webui/                   React + Vite 前端源码
        ├── store/ database/ config/ tools/ ...
        ├── start.py                 启动入口
        ├── configure_api.py         交互式模型配置
        ├── LICENSE                  MediaCrawler 非商业学习许可证
        ├── README.md                课程中文使用指南
        └── COURSE.md                课程任务书
```

---

## 8. 运行测试

```powershell
cd "projects\project-04-Intelligence Gathering"
.\.venv\Scripts\python.exe -m pytest tests -q
```

预期 **136 passed**（约 10–30 秒），仅一个 SQLAlchemy `declarative_base` 弃用警告。

| 测试文件 | 数量 | 覆盖 |
| --- | --- | --- |
| 上游原有 15 个文件 | 96 | 各社交平台客户端、存储工厂、代理、命令行参数 |
| `test_pipeline_analysis.py` | 18 | 分析管道的日期传递、趋势信号、`_is_recent` |
| `test_research_queries.py` | 22 | 采集查询构造、CJK 过滤、请求参数 |

---

## 9. 合规与使用边界

- 本仓库仅供**非商业学习与研究**，遵守 MediaCrawler 的 NON-COMMERCIAL LEARNING LICENSE 1.1
- 不得用于大规模爬取或干扰平台运营；应遵守目标平台的服务条款与 `robots.txt`，合理控制请求频率
- 采集社交平台内容需使用**本人账号**登录，Cookie 与浏览器登录状态保存在本机 `browser_data/`（已被 gitignore），**不得公开或提交**
- 评论等原始讨论不等同于研究结论；模型输出必须人工核验，不得以"生成成功"代替"结果正确"
- 服务默认只监听 `127.0.0.1`，不应直接作为公网服务部署
- 若密钥曾误提交到公开仓库，需到服务商后台**撤销并重新生成**——仅删除文件不能作废旧密钥

---

## 10. 与课程提交要求的关系

课程要求的正式提交方式是：**Fork 班级仓库 → 建 `students/<学号>/project-04` 分支 → 向 [CDJDAA/xidian-ai-security-class-project-new](https://github.com/CDJDAA/xidian-ai-security-class-project-new) 的 `main` 发起 Pull Request**，标题格式 `[04] 学号 - 姓名`，第一次有改动即建 Draft PR，完成后转 Ready for review。

**本仓库是个人副本，不等于课程作业提交。** 只向本仓库推送不会出现在班级仓库的作业列表中。完整流程见 [`COURSE-OVERVIEW.original.md`](COURSE-OVERVIEW.original.md)。
