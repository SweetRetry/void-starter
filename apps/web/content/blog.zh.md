# Void Starter

`void-starter` 是一个基于 Void 与 TanStack Start 的全栈 TypeScript 模板仓库，以单个 Cloudflare Worker 部署，内置了结合 D1、R2 与 Workers AI（经由 AI Gateway）的 AI Chat 示例应用。

仓库同时集成了 Tailwind CSS v4、基于 Base UI 的 shadcn/ui、Retry 设计系统、Motif 聊天组件，以及 Oxlint (`@shadcn/lint`)、Knip、`markdownlint-cli2` 和 Lefthook。可以直接打开 [Playground](/chat) 体验，或克隆仓库在本地运行。

## 技术栈

- **运行时**：Void 框架模式下的 TanStack Start，单 Cloudflare Worker 部署。
- **数据库**：Cloudflare D1 + Drizzle ORM，迁移文件位于 `apps/web/db/migrations`。
- **对象存储**：Cloudflare R2 存储聊天附件，通过 `ai.toMarkdown()` 提取文档与图片内容。
- **AI 模型**：通过 Cloudflare AI Gateway 流式调用免费的 `@cf/*` 模型（含深度思考模型）。
- **会话标识**：基于 HttpOnly `visitor` Cookie 为每个浏览器分配随机 UUID。
- **UI 与设计**：Tailwind CSS v4、Base UI 版 shadcn/ui、Retry 设计 Token 与 Motif 聊天组件。
- **工程工具链**：Vite+（`vp fmt`、`vp lint`、`vp test`）、`@shadcn/lint`、Knip、`markdownlint-cli2` 与 Lefthook，统一由 `pnpm verify` 执行。

## 仓库结构

`void-starter` 采用 Turborepo + pnpm 工作区结构，包含一个 Web 应用和两个内部共享包：

```text
void-starter/
  apps/web/                     TanStack Start 应用、Drizzle Schema 与 Void 配置
  packages/ui/                  shadcn/ui 基础组件（Base UI）与 Retry Token
  packages/typescript-config/   共享 TypeScript 编译配置
  rules/                        Zod v4 静态检查
  scripts/                      Skill 同步与 E2E 运行脚本
  docs/                         架构、API 错误契约、部署与日志文档
```

`apps/web` 包含路由、服务端函数与 API 接口；`packages/ui` 通过 `exports` 提供共享基础组件与样式 Token。

## Chat 应用架构

Void 根据 `apps/web` 中的模块导入自动配置 Cloudflare 资源绑定：

| 模块导入       | Cloudflare 产品 | 在 `void-starter` 中的职责                          |
| :------------- | :-------------- | :-------------------------------------------------- |
| `void/db`      | D1              | 存储会话、消息、思考过程以及提取后的附件文本        |
| `void/storage` | R2              | 按 `chats/<chatId>/<id>` 存储上传的原始附件字节     |
| `void/ai`      | Workers AI      | 流式回答生成、深度思考输出与 `ai.toMarkdown()` 解析 |

在 `apps/web/vite.config.ts` 中，`voidPlugin()` 排在 `tanstackStart()` 之前：

```ts
export default defineConfig({
  plugins: [voidPlugin(), tanstackStart(), react(), tailwindcss()],
})
```

### D1 与 Drizzle

`apps/web/db/schema.ts` 定义了三张表：`chat`、`message` 与 `attachment`。访问 `/c/:chatId` 时，TanStack Start 的 `createServerFn` 从 D1 读取当前访客的会话列表与历史消息。`*.server.ts` 模块仅在服务端打包。

### R2 附件解析

`POST /api/chats/:chatId/messages` 接收 multipart 表单上传，将原始文件写入 R2 的 `chats/<chatId>/<attachmentId>` 路径，调用 `ai.toMarkdown()` 提取 Markdown 文本，并写入 D1 的 `attachment` 表。

### Workers AI 流式回答

`POST /api/chats/:chatId/answer` 通过 Cloudflare AI Gateway 流式调用 `@cf/*` 模型。推理模型会先流式输出 `reasoning_content` 思考内容再输出正文，Worker 将两者实时转发给前端，并在流结束后一并写入 D1。

### 统一错误体

所有 `/api/*` 路由错误均返回扁平的 JSON：供前端判断的 `code` 字段和展示给用户的 `message`。校验失败时在 `issues` 中逐字段列出；`500` 错误在 `traceId` 中带上 Cloudflare `cf-ray` 请求 ID。

## Cloudflare 细节

### 开发环境连接 AI

D1 和 R2 在本地由 Miniflare 运行；Workers AI 运行在云端，需先执行 `pnpm connect` (`void connect --platform cloudflare`)。未连接时调用模型会返回 `503` 错误并提示需执行的命令。

### AI Gateway

直接调用 Workers AI 模型时在请求参数中传入 Gateway ID：

```ts
await ai.stream(model, { messages, max_tokens: 2048 }, { gateway: { id: "void-starter" } })
```

调用前需在 Cloudflare 控制台创建名为 `void-starter` 的 AI Gateway，否则 Workers AI 返回错误码 `2001`。

### 流式解析器

不同 Workers AI 模型的 SSE 格式不同：Llama 返回 `{"response": "..."}`，Qwen3 与 `gpt-oss` 返回 OpenAI 风格的 `choices[0].delta`（Qwen3 还在顶层带有滞后的 `response` 字段），QwQ 将数字 Token 作为 JSON 数字输出。`apps/web/src/lib/ai-stream.ts` 将所有格式统一解析为 `{ type: "reasoning" | "text", text }`。

### 部署与实测耗时

项目部署通过 `pnpm run deploy` 执行（`pnpm deploy` 为 pnpm 内置命令）。`apps/web/void.config.ts` 已配置 `workers_dev: true`。

开发环境下经由 AI Gateway 的实测耗时：

| 测试场景                       | 模型          |   耗时 |
| :----------------------------- | :------------ | -----: |
| 单句回答                       | Llama 3.3 70B |  5.1 s |
| 两个附件 + 深度思考            | Qwen3 30B     | 26.3 s |
| 简短摘要（109 输入 / 42 输出） | Llama 3.3 70B |  1.7 s |

## 快速开始

```sh
pnpm dlx giget gh:SweetRetry/void-starter my-app
cd my-app
git init
pnpm install
pnpm dev
```

执行一次 `pnpm connect` 并在控制台创建 `void-starter` AI Gateway 即可启用模型回答。执行 `pnpm run deploy` 即可发布 Worker、数据库迁移与资源绑定。
