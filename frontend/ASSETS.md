# 素材接入与替换指南

所有训练素材路径集中在 `src/config/assets.ts`。组件中不要直接写素材 URL；先放入 `public/`，再登记配置。素材来源记录在 `public/themes/source-notes.md`。

## 当前真实清单

```text
public/
├─ themes/
│  ├─ pet/{poster.jpg,background.jpg,manifest.json}
│  ├─ garden/{poster.jpg,background.jpg,manifest.json}
│  └─ space/{poster.jpg,background.jpg,manifest.json}
├─ gestures/README.md   # 正式教学素材缺失说明
└─ audio/{pet.mp3,garden.mp3,space.mp3,README.md}
```

- 已有：三张首页横图、用户提供的三张 540×960 训练背景、三份 v2 谱面，以及三首 91.72 秒主题音乐。
- 缺失：三主题可选背景视频；伸指/钩拳/握拳各自经过专业审核的教学图或视频；Perfect、Good、保持完成音效。
- 未配置的可选素材不会发起网络请求，因此不会产生虚假的 404。

## 替换主题背景

首页横图覆盖 `public/themes/<主题>/poster.jpg`。训练竖图覆盖同目录 `background.jpg`，推荐 9:16、至少 540×960、JPG/WebP、单张不超过 500KB。当前竖图为用户单独提供，不应从首页横图重建。只有明确需要用海报替代竖图时才运行：

```sh
pnpm generate:backgrounds
```

这会覆盖三个现有 `background.jpg`，并从首页海报居中裁切生成 540×960 背景。重要主体应处于画面中间，避免被教学卡和轨道遮住。

## 加入可选背景视频

将无声视频放入对应主题目录，例如 `public/themes/pet/background.mp4`，推荐 540×960、H.264、无音轨或静音、可循环、启用 faststart。然后只修改 `src/config/assets.ts`：

```ts
pet: {
  backgroundImage: 'themes/pet/background.jpg',
  backgroundVideo: 'themes/pet/background.mp4',
  surroundColor: '#d9c5ae',
  decoration: 'none',
},
```

视频只是背景：任务由应用时间轴驱动。视频加载或播放失败时图片仍在底层，不阻塞训练。应用只预加载当前主题，不会同时加载三个视频。

## 加入动作教学素材

建议文件名：

```text
public/gestures/straight.mp4  或 straight.webp
public/gestures/hook.mp4      或 hook.webp
public/gestures/fist.mp4      或 fist.webp
```

每个动作必须使用独立且已核对的素材。视频建议 4–8 秒、静音可理解、完整显示手和手腕。登记方式：

```ts
STRAIGHT: { videoUrl: 'gestures/straight.mp4', fallback: 'POSE_ICON', reviewState: 'REVIEWED' },
HOOK: { imageUrl: 'gestures/hook.webp', fallback: 'POSE_ICON', reviewState: 'REVIEWED' },
FIST: { videoUrl: 'gestures/fist.mp4', fallback: 'POSE_ICON', reviewState: 'REVIEWED' },
```

当前类型只允许 `MISSING_REVIEWED_MEDIA`，是为了避免误上线。素材审核完成后，把 `reviewState` 类型扩展为 `REVIEWED` 并记录审核人/日期。教学失败时回退到对应的原创 SVG 示意，不会拿伸指图冒充另外两个动作。左右手只镜像教学显示和摄像头预览，不修改 MediaPipe 识别坐标。

## 加入音乐和反馈音效

将主题音乐放在 `public/audio/`，在 `src/config/assets.ts` 对应主题的 `musicUrl` 登记。反馈音效仍统一登记在 `AUDIO_ASSETS.feedback`。背景音乐应与 90 秒时间轴对齐并支持暂停/续播；反馈音效只由真实结算事件触发。视频保持静音，不能把音乐混进背景视频。

当前三主题音乐已接入：萌宠、花园、星空分别使用 `pet.mp3`、`garden.mp3`、`space.mp3`。引擎在开始点击时静音预热，倒数结束后从训练 0 秒播放；暂停、丢手、切后台及恢复均跟随统一训练状态。仍应在 iPhone/Android 上测量首拍延迟。

## 谱面与版本

每个 `manifest.json` 记录主题和谱面参数。v2 固定为：90 秒、3 秒窗口、2 秒累计正确保持、10 轮 `STRAIGHT → HOOK → FIST`。修改任何规则或正式素材批次时增加 `version`。旧历史记录通过自身的 `plannedTasks`、`manifestVersion` 和 `ruleVersion` 显示，不迁移成 30 任务。

## 发布前检查

```sh
pnpm test
pnpm build
pnpm build:pages
pnpm check:production
```

摄像头生产环境必须使用 HTTPS；训练帧只在浏览器本机交给 MediaPipe，不上传。
