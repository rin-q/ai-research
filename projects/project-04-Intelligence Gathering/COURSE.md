# 项目 04：Intelligence Gathering

## 项目目标与运行

学习从公开资料采集、内容分析到知识库归档的流程，并验证模型生成结果的证据与局限。完整环境及运行说明见 [README.md](README.md)，个人模型配置见 [教学API配置说明.md](教学API配置说明.md)。

从课程仓库根目录执行：

```powershell
cd "projects/project-04-Intelligence Gathering"
uv sync --frozen
uv run playwright install chromium
uv run start.py
```

浏览器访问 http://127.0.0.1:8080。建议 Python 3.11、Node.js 22；每位同学使用独立环境与自己的 API Key。模型密钥留空时可使用本地清洗、去重与关键词提取功能。

## 建议任务（教师可调整）

1. 使用 GitHub 或 arXiv 的小规模公开资料，记录检索词、采集参数和来源。
2. 完成一次清洗、分析与知识归档，核验原始内容与结果之间的对应关系。
3. 选择一个改进点，例如去重准确性、来源溯源、异常处理或模型输出核验，提交修改与验证结果。
4. 记录运行环境、命令、前后对比、已知限制；模型结果不得代替人工证据核验。

## 提交与验收

- 分支建议：`students/YOUR_STUDENT_ID/project-04`。具体操作见 [课程总说明](../../README.md)。
- 每个独立改动及时 commit 并 push；通过 PR 交付代码和实验报告。
- 报告须包含复现步骤、验证结果、改动说明及局限性。
- 不提交 `.env`、Cookie、浏览器登录状态、个人知识库、采集数据、日志或依赖目录。
- 保留 MediaCrawler 原作者版权与 [非商业学习许可证](LICENSE)。

自动实验是可选扩展，需要另行验证兼容框架与环境；课程项目 02 不保证可直接作为本项目的实验后端。