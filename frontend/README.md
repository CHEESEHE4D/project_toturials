# 节奏康复 · 前端视觉与交互

React 19 + TypeScript strict + Vite，普通 CSS / SVG / DOM，GSAP 负责游戏入口的退场和水晕加载。移动竖屏优先，兼顾桌面主题选择与治疗师工作台。

## 运行

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm check:production
```

训练内容、背景图和教学视频的替换方法见 [`ASSETS.md`](./ASSETS.md)。

本地开发默认 `http://localhost:5173`。当前机器已启动本地预览服务。

- `/`：三主题首页，点「开始体验」查看水晕加载。
- `/prepare/pet`：真实准备流程；`garden` / `space` 使用相同组件。
- `/design`：**仅开发环境可用**的视觉状态预览，可切换主题、加载、校准、教学、训练、结果和历史。训练面板可检查 Perfect / Good / Miss、丢手、找回、媒体等待、后台返回、暂停、退出。使用明确标注的模拟数据，不保存或上传记录。
- `/history`：IndexedDB 本机记录与打卡日历；初始为空。
- `/binding`：邀请码查询 → 治疗师预览 → 明确确认分享；未接服务时显示不可用状态。
- `/therapist/login`：治疗师登录；用户列表与详情由服务端权限控制。

本次交付在原有 runtime 接口内继续使用 Google MediaPipe Hand Landmarker，并补齐独立高精度训练时间轴、三主题图片回退、太鼓式轨道和 30 个真实识别任务。正式教学素材、背景音乐与反馈音效仍待提供；目前只有明确标记的 SVG 动作示意和测试节拍。正式入口不会模拟识别成绩、绑定或云端同步。

### 手部视觉识别

- 依赖固定为 `@mediapipe/tasks-vision@1.0.1`，模型为 Google 官方 Hand Landmarker float16 v1。
- WASM 与 `.task` 模型均从 `public/` 本地加载，摄像头帧不离开浏览器；首次进入准备页时才按需加载 JS 推理模块。
- 单手模式在主线程以 10 Hz 限频推理，优先 WebGL/GPU，初始化失败时自动回退 CPU；帧间空白超过 150ms 会中断稳定计时。
- 21 个关键点用于判断手是否完整入镜，并根据四指关节角区分伸直、钩拳与握拳；稳定 600ms 完成取景校准，教学中的每个目标动作需稳定约 2 秒才确认。
- 若模型文件需要重新获取，运行 `pnpm fetch:hand-model`。生产环境仍必须使用 HTTPS 才能申请摄像头权限。

## 你的水晕加载

入口动画位于 `src/components/RippleLoading.tsx`：

1. 页面元件向外轻移并淡出（约 560ms），留下浅黄 `#F5EDD9`。
2. 7 个棕色圆形的相位、直径、周期和透明度峰值各不相同。每一颗都由小到大、由淡到浓再淡出，并带一条很轻的外沿。
3. 动画只修改 transform / opacity，不使用 Canvas、持续旋转或屏幕模糊。
4. 所选海报与准备页面就绪后进入下一页；为入口动效保留约 2.9 秒展示窗口。图片失败或超过 10 秒会返回可重试状态。
5. `prefers-reduced-motion` 下维持圆圈位置与尺度，只改变透明度。

`rippleSeeds` 可分别调节 `size`、`duration`、`delay`、`rest`、`peak`；背景在 `tokens.css` 的 `--color-loading`。

## 接入真实核心

页面不判别手型、不重新判定节拍，也不更改保持阈值。共享类型位于 `src/contracts/index.ts`；DOM 类型通过泛型在 runtime 层绑定。

在 `src/main.tsx` 挂载应用之前调用：

```ts
import { installRuntime } from './services/runtime';

installRuntime({
  recognition,                     // 已接入 MediaPipe RecognitionController<MediaStream>
  preparationPolicy,               // 当前为取景 600ms / 教学手型 2000ms
  createEngine,                    // (onComplete) => TrainingEngine<HTMLVideoElement>
  subscribeAura,                   // 已映射到舞台坐标的中心、尺度、旋转与跟踪状态
  tutorialVideos,                  // 已审核的 STRAIGHT / HOOK / FIST 教学视频地址
  repository,                     // 可选，默认已实现 IndexedDB SessionRepository
  binding, sync, therapist,        // 可选云端服务
});
```

- 准备页跳过示范仍要求三个动作各自完成识别确认；成功时长由 B 的 policy 提供。
- `createEngine` 负责独立训练时钟、倒数、暂停原因、丢手、重获追踪、重播当前任务和页面后台事件；背景视频只跟随这一时钟播放，不驱动任务切换。`onComplete(summary)` 输出最终记录。
- `subscribeAura` 的 x/y 是前端舞台的 0–1 归一化坐标，已包含镜像/裁剪转换。仅视觉层做约 150ms 的位姿平滑；不得用平滑后数据评分。
- 摄像头在准备页和正式训练的小窗中显示为镜像；镜像不修改送入识别器的坐标。离开流程停止 tracks 和识别订阅。
- 成绩仅对已确认的 Perfect / Good / Miss 汇总：权重来自既定技术文档，不引入新判分窗口；未结算任务不补 Miss，零判定显示暂无成绩。
- 先保存本机再跳结果页；同步失败保留本机结果。SyncService 应将最终同步状态回写 SessionRepository 以刷新视图。
- 治疗师授权必须由服务端完成。用户会话与治疗师会话使用不同认证 storageKey，不能在前端依据 URL 中的用户 ID 放行访问。

## 素材

`public/themes/{pet,garden,space}/poster.jpg` 已生成并压缩，总计约 474KB，来源与完整提示词见 `public/themes/source-notes.md`。内置 image_gen 用于氛围海报，手势符号为代码 SVG，不能替代经过审核的教学素材。

每主题当前已有：

```text
background.jpg # 540×960 图片回退
manifest.json  # 90 秒、30 个 3 秒任务、每任务累计正确保持 2 秒
```

可选无声背景视频、正式音乐、教学素材和反馈音效的接入方式见 `ASSETS.md`。不要用未经专业审核的 AI 手部画面作为动作标准。

## 验证与交付边界

- TypeScript strict 与生产构建已通过。
- Vitest 测试覆盖手部几何、v2 谱面、累计保持跨 UNKNOWN、一次性结算、丢手恢复、90 秒/30 任务收尾、旧 15 任务历史兼容及 IndexedDB 保存。
- `check:production` 检查生产 JS/HTML 中没有开发模拟器、示例记录或 service role key 标记。开发路由和模拟器只经 `import.meta.env.DEV` 动态引入。
- 已在本地浏览器检查 390px 竖屏开发预览：倒数不计时、音符随时间轴移动、暂停冻结、恢复重播当前 3 秒窗口，三主题资源均返回 200，控制台无错误。360px 小屏的核心布局已测量但仍需在实体设备复核。
- `scripts/browser-smoke.mjs` 使用这台开发机自带的 Playwright / Edge 路径；换机器请替换为当地 Playwright 与 Chromium 路径。脚本在全新测试浏览器中访问 localhost，不读取个人浏览器资料，结果写入 `test-results`。
- 仍需 iPhone Safari / Android Chrome 真机验证摄像头、媒体自动播放许可、后台恢复与连续三轮训练；本次未取得真机测试结果。

生产托管必须使用 HTTPS，并将非静态资源路径回退到 `index.html`。手机通过普通局域网 HTTP 可以看页面，但浏览器通常不会开放摄像头；摄像头体验请使用 HTTPS 部署或可信的本地调试方案。

## 目录

```text
src/app/                 路由、错误边界
src/components/          通用布局、品牌、手势符号、水晕加载
src/pages/               首页、准备、训练、结果、历史、绑定、治疗师
src/features/training/   竖屏舞台、节奏轨道、教学、识别反馈、摄像头小窗
src/features/history/    结果与日历记录展示
src/contracts/           跨团队类型合同
src/services/            runtime 适配、manifest 校验、IndexedDB、结果汇总
src/theme/               基础 token、共享主题配置与响应式样式
src/dev/                 显式开启的开发模拟器与设计预览（不进入生产包）
```

采用技能：`gsap-react`、`gsap-timeline`、`gsap-core`、`imagegen`。本次用户给出的 v2 游戏规则优先于仓库旧文档中冲突的 15 任务和摄像头布局说明。
