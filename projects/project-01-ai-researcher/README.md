# 项目 01：AI-Researcher 使用指南

AI-Researcher 将参考文献、研究想法、代码实验与论文写作串联起来。本项目适合研究代理流程阅读与小规模复现，不是安装后即可保证产出正确论文的工具。

[课程任务](COURSE.md) · [课程总说明](../../README.md) · [上游原始 README](README.original.md) · [上游仓库](https://github.com/HKUDS/AI-Researcher)

## 1. 使用前准备

- 推荐 Linux，或 Windows 下的 WSL2/Linux 环境；准备 Python 3.11、uv 和已启动的 Docker。
- 需要可用的模型服务账户、API Key、模型名称及网络连接；默认模板使用 OpenRouter。
- GPU 是否必需取决于所选实验。无 GPU 不代表能够运行全部示例。
- 本课程副本为兼容 Windows 修改过 182 个资源文件名，见 前次整理记录（当前目录不含名称对照文件）。若按原名读取资源失败，应按表适配；也可在 Linux 下解压课程目录旁备份中的原始压缩包，使用原名版本。

以下命令使用 **Linux/WSL Bash**，从课程根目录开始；不要直接粘贴到 PowerShell。四个项目的虚拟环境应相互独立。

## 2. 安装依赖

```bash
cd projects/project-01-ai-researcher
uv venv --python 3.11
source .venv/bin/activate
uv pip install -e .
playwright install
docker version
docker pull tjbtech1/airesearcher:v1
```

`docker version` 应能显示服务端信息。无法拉取镜像时，可按 [Dockerfile](docker/Dockerfile) 自行构建：`docker build -t tjbtech1/airesearcher:v1 ./docker`。模型生成的实验代码会执行，应使用上游容器环境并限制实验范围。

## 3. 配置模型与实验

首次配置时复制模板（已有 `.env` 时不要覆盖）：

```bash
cp .env.template .env
```

编辑 `.env`，重点检查以下字段：

| 字段 | 如何填写 |
| --- | --- |
| `OPENROUTER_API_KEY` | 自己的密钥；如果更换模型服务，按 LiteLLM 对应服务配置 |
| `OPENROUTER_API_BASE` | 所选服务地址，模板为 OpenRouter 地址 |
| `COMPLETION_MODEL`、`CHEEP_MODEL` | 当前账户可用且代码支持的模型标识；`CHEEP_MODEL` 是源码原有拼写 |
| `BASE_IMAGES` | 与已拉取的镜像一致，模板为 `tjbtech1/airesearcher:v1` |
| `GPUS` | 按模板注释选择 GPU；无 GPU 需使用模板支持的无 GPU 设置，并选择适用实验 |
| `CATEGORY`、`INSTANCE_ID` | 与 `benchmark/final/<CATEGORY>/<INSTANCE_ID>.json` 对应 |
| `CONTAINER_NAME` | 容器名称，多人同机使用时避免重名 |
| `PORT` | 实验代理服务端口，模板为 7020；这不是网页端口 |
| `MAX_ITER_TIMES` | 保留并理解上游参数语义后再调整，不能把 0 当成通用的禁用开关 |

模板中的模型名称可能已过时，运行前确认服务仍提供该模型。不要把示例密钥占位符当成真实配置。

## 4. 启动与首次使用

```bash
python web_ai_researcher.py
```

在本机打开 **http://127.0.0.1:7039**，以终端实际输出为准。当前入口默认仅监听本机，不创建公共分享链接。

1. 在界面检查环境设置，确认模型、容器和任务配置。
2. 选择已有的小规模示例，或输入研究想法及参考论文。
3. 选择详细想法模式或基于参考文献的构思模式，启动任务。
4. 观察终端与界面的阶段日志；先验证一个任务，再增加实验规模。
5. 检查代码、实验记录与论文内容，不以生成成功代替结果正确。

工作区和缓存位置受 `.env` 中 `WORKPLACE_NAME`、`DOCKER_WORKPLACE_NAME`、`CACHE_PATH` 等设置影响，查看任务日志中的实际路径。`examples/` 是上游示例，不是本次运行结果。

## 5. 停止与常见问题

在启动终端按 Ctrl+C 停止网页程序；实验容器可能继续运行，可用 `docker ps` 检查，只停止属于本次任务的容器。

| 现象 | 检查方式 |
| --- | --- |
| 无法连接 Docker | 确认 Docker 服务、WSL 集成及容器权限 |
| 模型报 401/403 或不存在 | 检查密钥、余额、模型标识和模型服务地址 |
| 网页打不开 | 确认进程未退出、7039 端口无冲突，勿把 7020 当作网页地址 |
| 提示模板文件不存在 | 对照原始压缩包与当前资源名称，确认代码与资源名称一致 |
| GPU 或显存错误 | 核对 GPU 映射、容器 GPU 支持与实验需求 |

## 6. 课程交付与版本

在个人分支提交改动，报告写清输入、配置（不含密钥）、运行步骤、实验结果与局限。分支和 PR 流程见课程总说明。本课程源码整理时的上游版本为 `f9a6f8480860c193afff600eeffe3defcee8a978`。本次依据源码整理文档，未安装依赖或完成运行验证；本版上游根目录无独立 LICENSE，使用与分发前核实授权。