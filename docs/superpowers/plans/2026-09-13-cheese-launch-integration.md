# CHEESEHE4D Launch Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 CHEESEHE4D 最新训练与手势功能之上安全加入极简启动页和立方体主题选择器，并恢复可重复构建与可信浏览器验收。

**Architecture:** 从最新 `origin/main` 的隔离工作树实施，不合并旧的无共同祖先历史。选择器以纯状态模块管理循环、手势与同步锁，React/GSAP 组件只负责展示和动画；部署产物始终从融合后的最新源码重新生成。

**Tech Stack:** React 19、TypeScript 5.9、Vite 7、HashRouter、GSAP 3.13、Vitest、Playwright/Edge、GitHub Pages legacy `/docs`。

**Spec:** `docs/superpowers/specs/2026-09-13-cheese-launch-integration-design.md`

## Global Constraints

- 基线必须是 `CHEESEHE4D/main`，不允许强制推送。
- 不改变训练、手势教学、MediaPipe、音频、模型和本机记录逻辑。
- 不从旧仓库复制构建产物、根依赖文件或 `node_modules`。
- 所有生产路由通过 HashRouter，URL 使用 `#/...`。
- 新行为先看到测试正确失败，再写生产代码。

---

### Task 1: 恢复干净 TypeScript 构建

**Files:** Modify `frontend/src/dev/MockTrainingEngine.ts`, `frontend/src/services/browserTrainingEngine.ts`.

**Interfaces:** 浏览器引擎计时器字段统一为 `number | undefined`，调用继续使用 `window.setTimeout/window.setInterval`。

- [ ] 运行 `frontend/node_modules/.bin/tsc.cmd -b`，记录 TS2769 计时器重载失败。
- [ ] 将浏览器专用计时器字段改为 `number`，赋值显式调用 `window.setTimeout/window.setInterval`；清理显式调用对应的 `window.clearTimeout/window.clearInterval`。
- [ ] 重跑 `tsc -b`，确认错误消失；运行现有 23 个单元测试。
- [ ] 提交 `fix: use browser timer handles in training engines`。

### Task 2: 先建立主题选择状态测试

**Files:** Create `frontend/src/features/themes/selection.test.ts`, `frontend/src/features/themes/selection.ts`.

**Interfaces:** 导出 `nextIndex(index, delta)`、`swipeDirection(dx, dy)`、`createSelectionGate(initial?)`；gate 提供 `get/begin/finish/cancel`。

- [ ] 先加入测试，覆盖首尾循环、48px 手势阈值、垂直手势忽略、同帧锁、取消后拒绝旧完成回调、无效目标。
- [ ] 运行专项测试，确认因缺少 `selection.ts` 正确失败。
- [ ] 实现最小纯状态模块，再运行专项测试和全量测试。
- [ ] 提交 `feat: add deterministic theme selection state`。

### Task 3: 先建立启动与主题主路径失败验收

**Files:** Create `frontend/scripts/entry-smoke.mjs`.

**Interfaces:** 读取 `APP_BASE_URL`，用 `new URL('#' + route, base)` 构造路由；验证 `/`、`/history`、`/themes`、`/prepare/:themeId`。

- [ ] 添加浏览器断言：根页标题“节奏康复”、两个入口、历史返回、默认萌宠、主题循环、动画锁和准备页返回主题。
- [ ] 在当前旧首页上运行，确认因找不到启动页标题而失败。
- [ ] 保留失败证据，进入 UI 实现。

### Task 4: 移植启动页和立方体选择器

**Files:** Create `StartPage.tsx`, `ThemeScene.tsx`, `ThemeSelector.tsx`, `entry.css`; modify `App.tsx`, `HomePage.tsx`, `Layout.tsx`, `HistoryContent.tsx`.

**Interfaces:** `/` → `StartPage`; `/themes` → `HomePage`; `ThemeSelector({onLaunch})` 继续消费现有 `useLaunchTheme()`。

- [ ] 从已验证实现逐文件移植四个新增源码文件，不移植任何旧构建产物。
- [ ] 手工修改最新 App 路由，保留所有训练、结果、绑定、治疗师和开发路由。
- [ ] 用精简主题页面替换旧 HomePage；保留最新 `themeConfig` 数据接口。
- [ ] 更新历史空状态与公共页脚，删除赛事署名但保留治疗师入口。
- [ ] 运行选择器测试、全量测试、TypeScript 和开发浏览器验收。
- [ ] 提交 `feat: add launch menu and cube theme selector`。

### Task 5: 手工融合最新准备页

**Files:** Modify `frontend/src/pages/PreparePage.tsx`; Test `frontend/scripts/entry-smoke.mjs`.

**Interfaces:** “返回主题”固定到 `/themes`；其他准备页状态、教学图片和 recognition 调用保持原样。

- [ ] 记录修改前文件哈希与相关教学组件引用。
- [ ] 只改返回链接目标，不替换文件主体。
- [ ] 运行浏览器流程到准备页并返回；确认 `GestureTeachingMedia` 和三个教学图片仍被引用。
- [ ] 检查 diff 只有目标路由变化，提交 `fix: return from preparation to theme selector`。

### Task 6: 修正 HashRouter 冒烟测试

**Files:** Modify `frontend/scripts/browser-smoke.mjs`.

**Interfaces:** 所有应用内地址通过 `url(route)` 生成 hash URL；开发态 `/design` 仍只在 dev server 验证。

- [ ] 先加入对实际 URL hash 的断言，使旧的普通路径写法失败。
- [ ] 改写路由生成和旧首页定位，保留绑定、训练、结果、无溢出等既有断言。
- [ ] 运行两套浏览器脚本并确认无页面错误。
- [ ] 提交 `test: exercise real hash routes in browser smoke`。

### Task 7: 从融合源码生成并审查 Pages

**Files:** Generated `frontend/dist/**`, `docs/app/**`; modify `frontend/README.md` only for新路由与验证说明。

**Interfaces:** `pnpm build:pages` 先执行 `tsc -b && vite build`，再将 dist 覆盖到 `docs/app`，保留缓存期旧哈希资产。

- [ ] 运行全量测试、`pnpm build:pages`、`pnpm check:production`。
- [ ] 核对新 `docs/app/index.html` 只有一套 JS/CSS 且无冲突标记。
- [ ] 确认手势图片、MediaPipe WASM、模型和音频仍在 `docs/app`。
- [ ] 在 production preview 运行 `entry-smoke.mjs`，检查 320/390/1440 和减少动态效果。
- [ ] 审查 diff，排除 `node_modules`、根依赖和非目标训练/识别文件；提交 `build: publish integrated launch experience`。

### Task 8: 并发安全发布

**Files:** No new source files.

**Interfaces:** 远端分支 `codex/launch-theme-selector-integration`，通过 PR 合入 `main`。

- [ ] `git fetch origin main` 并比较基线；有新提交则合并到功能分支、解决冲突并重跑 Task 7 验证。
- [ ] 非强制推送功能分支，创建 PR，确认 diff 只含已审查文件。
- [ ] 合并前确认 CI/本地验证结论；合入后等待 Pages `built` 且 commit 等于最新 main。
- [ ] 在线验证启动、历史、主题切换、准备页和最新手势教学资源。

