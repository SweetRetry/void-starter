# Void Starter

[English](README.md) | 简体中文

一个全栈 TypeScript 模板，用 [Void](https://github.com/voidzero-dev/void) 部署到你自己的 Cloudflare 账号。一个 Worker 同时提供预渲染的博客和一个聊天应用。聊天消息存在 D1，文件存在 R2，回答由 Workers AI 经 AI Gateway 流式返回。

> Void Starter 是独立项目，不是 Void 或 Cloudflare 的官方模板。

## 包含什么

- **应用。** TanStack Start（React 19、SSR、server functions、文件路由），运行在 Void 的框架模式下。
- **数据。** 通过 Drizzle 使用 D1，迁移由 Void 在部署时执行。
- **文件。** 通过 `void/storage` 使用 R2，用 `ai.toMarkdown()` 把文件转成模型可读的内容。
- **AI。** 使用 Workers AI 模型，消耗 Cloudflare 每日免费额度，不需要任何供应商密钥。每次调用都经过 AI Gateway，推理模型会流式输出思考过程。
- **博客。** `/` 和每篇文章都在构建时预渲染成静态 HTML，有中英两个版本（`/en/*`、`/zh/*`）。
- **界面。** Tailwind CSS v4、基于 Base UI 的 shadcn/ui、Retry 设计语言（[DESIGN.md](DESIGN.md)），以及来自 [Motif](https://motif.sweetretry.com) 的聊天组件。
- **错误。** 每个 `/api/*` 路由都返回 RFC 9457 problem+json（[docs/api.md](docs/api.md)）。
- **检查。** Vite+（格式化、lint、测试）、类型检查、knip 和项目规则，统一由 `pnpm verify` 执行。`pnpm e2e` 用无头 Chromium 操作应用。

没有账号系统。每个浏览器通过 cookie 拿到一个随机访客 id，侧边栏只列出这个访客的聊天，其他浏览器访问会得到 404。放任何私密内容之前，请先加上认证。

## 环境要求

- Node.js 24 或更高版本，以及 pnpm 12（执行 `corepack enable` 会使用 `package.json` 里锁定的版本）。
- 一个 Cloudflare 账号。只有部署或在开发时获取 AI 回答才需要，免费套餐就够试用。

## 快速开始

```sh
pnpm dlx giget gh:SweetRetry/void-starter my-app
cd my-app
git init
pnpm install
pnpm dev
```

`pnpm dev` 会把迁移应用到本地 D1，并在 <http://localhost:5173> 启动服务，使用本地的 D1 和 R2。

Workers AI 没有本地模拟器。要在开发时拿到回答，需要把这份代码连接到 Cloudflare 一次，在 Cloudflare 控制台（AI › AI Gateway）创建一个名为 `void-starter` 的 AI Gateway，然后重启 `pnpm dev`。

```sh
pnpm connect
```

## 部署

```sh
pnpm connect   # 每份代码一次：登录 Cloudflare
# 每个账号一次：在控制台创建名为 "void-starter" 的 AI Gateway
pnpm run deploy
```

`void deploy` 会构建应用，创建 D1、R2 和 AI binding，执行迁移并发布 Worker。

公开的 `workers.dev` 地址默认是关闭的（`apps/web/void.config.ts` 里的 `workers_dev: false`），访问会返回 Cloudflare 错误 1042。因为没有账号系统，地址一旦公开，任何人都能消耗你的 Workers AI 额度。先给 gateway 设置限流，再把 `workers_dev` 改成 `true` 并重新部署，就能打开它。AI Gateway、模型、用量限制和回滚见 [docs/deployment.md](docs/deployment.md)。

## 目录结构

```text
apps/web/            由 Void 部署的 TanStack Start 应用
packages/ui/         shadcn/ui 组件和 Retry 设计 token
packages/typescript-config/
docs/                架构、API、部署、可观测性
rules/               工程规则及其检查
scripts/             skill 同步和 e2e 运行器
```

## 常用命令

| 命令               | 作用                                                    |
| :----------------- | :------------------------------------------------------ |
| `pnpm dev`         | 应用本地迁移并启动开发服务器                            |
| `pnpm run deploy`  | 构建、创建资源并发布到 Cloudflare                       |
| `pnpm db:generate` | 根据 `apps/web/db/schema.ts` 生成 D1 迁移               |
| `pnpm verify`      | 格式、Markdown、lint、规则、类型检查、测试、构建和 knip |
| `pnpm e2e`         | 用无头 Chromium 跑浏览器冒烟测试                        |

`pnpm verify` 是完整的检查，CI 会同时运行它和 `pnpm e2e`。`pnpm e2e` 在一份临时的应用副本上跑浏览器冒烟测试。第一次使用前，先用 `pnpm exec playwright install --only-shell chromium` 安装 Chromium。[lefthook.yml](lefthook.yml) 里的 Git hooks 会在 commit 和 push 时跑其中一部分快速检查。

## 文档

- [docs/architecture.md](docs/architecture.md) 介绍技术栈和每个选择的理由。
- [docs/api.md](docs/api.md) 定义错误约定和所有 problem 类型。
- [docs/deployment.md](docs/deployment.md) 介绍 AI Gateway、模型、用量限制和回滚。
- [docs/observability.md](docs/observability.md) 介绍本地和生产环境的日志与 trace。
- [AGENTS.md](AGENTS.md) 是编码 agent 的入口。

文档目前只有英文版。

## 许可证

[MIT](LICENSE)
