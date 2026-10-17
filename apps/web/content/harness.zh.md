# Void Starter 的工程护栏、工具链与设计系统

`void-starter` 内置了完整的前端设计系统与静态校验管线：Tailwind CSS v4、基于 Base UI 的 shadcn/ui、Retry 设计规范、Motif 聊天组件，以及 Vite+（`Oxlint` 与 `Oxfmt`）、`@shadcn/lint`、Knip、`markdownlint-cli2` 和 Lefthook。

## 设计系统与 UI

### Tailwind v4 与 Retry

全站样式基于 Tailwind CSS v4，设计 Token 定义在 `DESIGN.md`、`packages/ui/src/styles/retry.css` 与 `globals.css` 中：

- **明度层级**：清空所有 `shadow-*` 工具类，通过 `oklch()` 明度阶梯（`background`、`surface-1`、`surface-2`、`surface-3`）区分背景与浮层。
- **主色控制**：翠绿色（`primary`）仅用于当前视图唯一的主按钮、文本链接与焦点环。
- **字体与动效**：加载带 `opsz` 光学字号轴的 Inter 字体；根路由 `__root.tsx` 通过 `<MotionConfig reducedMotion="user">` 全局配置 `[0.2, 0, 0, 1]` 缓动曲线与 `200ms` 时长。

### Base UI 版 shadcn/ui

`packages/ui/src/components` 包含 47 个基于 shadcn/ui Base UI (`base-nova`) 预设生成的组件，并内置了 Retry 样式规则：

- **Card**：纯 `bg-card` 背景，无外层 `ring-1` 边框。
- **Input、Textarea 与 Select**：实心 `bg-muted` 背景与 `text-subtle-foreground` 占位符。
- **Button**：提供 `default`、`secondary`、`ghost`、`destructive` 与 `link` 变体（无 `outline`），禁用态使用 `bg-surface-1 text-subtle-foreground`。
- **浮层组件**：Popover、Dropdown、Select 与 Context Menu 统一使用无阴影的 `rounded-md border bg-popover`。

### F1 组件字节冻结

`packages/ui/frozen.manifest.json` 记录了 `packages/ui/src/components` 下所有文件的 SHA-256 哈希，由 `pnpm ui:freeze` 在提交前与 CI 中进行校验。

| 命令                      | 作用                                         |
| :------------------------ | :------------------------------------------- |
| `pnpm ui:freeze`          | 校验 `packages/ui/src/components` 的文件哈希 |
| `shadcn diff <component>` | 与上游 shadcn/ui 对比单个组件差异            |
| `pnpm ui:freeze:update`   | 更新组件后重写 `frozen.manifest.json` 基线   |

### Motif 聊天组件

`apps/web/src/components/chat` 与 `agents` 集成了来自 [Motif](https://motif.sweetretry.com) 的聊天界面组件：消息流、附件输入框、模型选择器、思考过程折叠块与右侧滚动轨，均已适配 Base UI 的 `render` 属性。

## 代码质量与门禁

`pnpm verify` 按顺序执行全部检查：

```sh
pnpm verify
# format:check -> md:check -> lint -> rules:check -> typecheck -> test -> build -> knip
```

### Oxlint 与 Vite+

根目录 `vite.config.ts` 统一配置了整个工作区的 Vite+ 工具链：

- **`vp fmt`**：Oxfmt 代码格式化（行宽 100、无分号、自动排序 `package.json`）。
- **`vp lint`**：Oxlint 静态检查，启用 `typescript`、`react`、`jsx-a11y`、`import` 与 `@shadcn/lint`。
- **`vp test`**：跨 `apps/*` 与 `packages/*` 运行单元测试。

### `@shadcn/lint` 约束

`vite.config.ts` 对所有 `@workspace/ui/components` 导入启用了 `@shadcn/lint`：

```ts
rules: {
  "shadcn/no-restyle": ["error", { allow: ["layout"] }],
  "shadcn/no-raw-colors": "error",
  "shadcn/no-unknown-classes": "error",
  "shadcn/require-static-classes": "error",
  "shadcn/no-inline-styles": "error",
  "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
}
```

调用方只能向共享 UI 组件传入布局类名（外边距、宽度、Flex/Grid 定位），组件自身的外观由 `variant` 与 `size` 决定。

### 仓库级静态扫描

`pnpm rules:check` 执行四个脚本：

- **`pnpm zod:check`** (`rules/zod-v4/check.js`)：检查已废弃的 Zod v3 写法。
- **`pnpm ui:check`** (`.agents/skills/sweet-mode/scripts/ui-guardrails.js`)：检查动效、z-index、色值与字号禁令，如 `transition-all`、`ease-in` 与任意 `z-[...]` 类名。
- **`pnpm ui:freeze`** (`scripts/ui-freeze.js`)：检查 `packages/ui/src/components` 的 F1 哈希清单。
- **`pnpm skills:check`** (`scripts/agent-skills.js`)：检查复制进来的 agent skill 与来源一致。

### Markdown 协作管线

- **Oxfmt (`vp fmt`)** 格式化表格对齐、列表缩进与空行。
- **`markdownlint-cli2` (`pnpm md:check`)** 检查标题层级、代码块语言标识与链接，并在 `.markdownlint-cli2.jsonc` 中关闭 `MD013` 行宽限制。

### Knip 死代码清理

`pnpm knip` 扫描工作区中未使用的文件、导出和依赖。`knip.json` 将 `apps/web` 的 `vite` 设为 `false`，且 `apps/web/vitest.config.ts` 不加载 `voidPlugin()`，防止从仓库根目录运行工具时在根目录生成 `.void/`。

### Lefthook

`lefthook.yml` 在 `pnpm install` 时由 `prepare` 脚本自动安装：

- **`pre-commit`**：对暂存区代码运行 `vp fmt --write`，对暂存区 Markdown 运行 `vp fmt` 与 `markdownlint-cli2 --no-globs --fix` 并重新暂存（`stage_fixed: true`），随后执行 `pnpm rules:check`。
- **`pre-push`**：并行运行 `pnpm typecheck` 与 `pnpm test`。
