# engineer-buddy · 工程师搭子 🛠️

> **Turn a fuzzy idea into a buildable spec — just by talking to it.**
> 把脑子里的模糊想法，聊成可以直接动工的提案包。

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node](https://img.shields.io/badge/Node-proxy-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**engineer-buddy** interviews you stage by stage — *discovery → scope → approach → plan → deliver* — and turns a vague product idea into a structured, exportable build proposal. It ships with a thin backend proxy so your LLM key never touches the browser, plus rate limiting and a daily cost circuit‑breaker.

## ✨ Highlights
- 🗣️ **Staged interview** — guided requirement clarification across 5 stages
- 📦 **Exportable spec** — generates an OpenSpec proposal pack (ZIP) you can hand to a builder
- 🔐 **Key‑hiding proxy** — LLM key stays server‑side; per‑minute rate limit + daily USD circuit‑breaker
- 🧩 **Pluggable models** — Claude (Opus) when a key is set, DeepSeek fallback otherwise
- 🎛️ **Admin console** — edit role prompts & manage conversations behind a login gate

<sub>💡 想放张截图/GIF？把图片放进 `docs/` 再在这里插 `![demo](docs/demo.gif)`，审核一眼就懂。</sub>

---

# 工程师搭子（在线版）

对话式需求澄清工具——把脑子里的模糊想法，聊成可以直接动工的提案包。

## 快速启动

```bash
# 安装依赖
npm install

# 复制环境变量模板并填入 Key
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY

# 启动开发服务器（前端 :3000 + 代理 :3001）
npm run dev:web &
npm run dev:proxy
```

浏览器打开 http://localhost:3000，选择"做软件"或"大家电直播带货"开始对话。

## 使用产出的提案包

完成 deliver 阶段后，点击"生成 OpenSpec 提案包"，再点"导出 ZIP"，会下载一个 `<change-id>.zip`。

### 1. 解压到 openspec/changes

```bash
# 假设下载到 ~/Downloads/my-project.zip
cd <你的项目根目录>        # 包含 openspec/ 目录
unzip ~/Downloads/my-project.zip -d openspec/
# 现在目录结构：openspec/changes/my-project/proposal.md, tasks.md, specs/...
```

### 2. 验证格式

```bash
npx -y @fission-ai/openspec validate my-project --strict
# 输出：Change 'my-project' is valid
```

### 3. 应用提案（/opsx:apply）

在支持 `/opsx` 命令的 AI 编程工具（如 Claude Code）中运行：

```
/opsx:apply my-project
```

这会读取 `openspec/changes/my-project/` 下的 proposal、tasks 和 specs，
引导 AI 按 SHA 契约逐步实现各能力，完成后归档到 `openspec/specs/`。

### 4. 归档

实现并验收通过后：

```
/opsx:archive my-project
```

## 环境变量说明

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 必填 | DeepSeek V4 API Key |
| `PROXY_PORT` | 3001 | 代理监听端口 |
| `DAILY_LIMIT_USD` | 5 | 日花费熔断（美元），超出返回 503 |
| `RATE_RPM` | 20 | 每 IP 每分钟请求限制 |
| `MAX_CONCURRENT` | 5 | 最大并发请求数 |
| `ALLOWED_ORIGIN` | http://localhost:3000 | CORS 允许的前端源 |

## 生产部署

### 前端静态文件

```bash
npm run build:web
# 产物在 apps/web/dist/
```

将 `apps/web/dist/` 复制到服务器的静态目录，例如 `/var/www/engineer-buddy/`。

Nginx location 块（只新增，不改共享配置）：

```nginx
location /hb/engineer-buddy/ {
    alias /var/www/engineer-buddy/;
    try_files $uri $uri/ /hb/engineer-buddy/index.html;
}

location /api/chat {
    proxy_pass http://127.0.0.1:3001;
    proxy_read_timeout 200s;
}
```

### 代理进程

```bash
# 在服务器上，以环境变量启动代理
DEEPSEEK_API_KEY=sk-xxx \
ALLOWED_ORIGIN=https://your-domain.com \
PROXY_PORT=3001 \
node apps/proxy/src/index.js
```

建议用 `systemd` 或 `pm2` 管理进程以确保自动重启。

## 目录结构

```
engineer-buddy/
├── apps/
│   ├── web/          # Vite + React + TypeScript + Tailwind
│   │   └── src/
│   │       ├── engine/     # 对话引擎（slots, turn, parseJson, templateEngine, deliverEngine）
│   │       ├── prompts/    # 系统提示词（product / livestream 两套）
│   │       ├── templates/  # 模板库（prompthub 50 卡 + 直播 7 卡）
│   │       ├── store/      # StorageAdapter（LocalStorage / Pg 预留）
│   │       └── components/ # UI 组件
│   └── proxy/        # 极薄 Node 代理（藏 Key + 限流 + 路由）
├── openspec/
│   └── changes/      # 导出的提案包放这里，每个子目录一个 change
└── .env              # 本地环境变量（不入 git）
```

## 单元测试

```bash
npm test --prefix apps/web
# 28 个测试：JSON 容错解析 / slots 词典 / slots reducer
```
