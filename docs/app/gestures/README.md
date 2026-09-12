# 三个手势教学视频接入说明

## 当前静态教学图

当前已接入用户提供的三联手势图，并按原始 2172×724 图片等分为三个带透明背景的 724×724 PNG：

- `straight.png`：伸指（STRAIGHT）
- `hook.png`：钩拳（HOOK）
- `fist.png`：握拳（FIST）

来源：用户于 2026-09-13 提供的 `dd3d08fd-ef66-4549-8676-d2ac4a9d232c.png`。仅执行无损裁切，没有重画或修改手型。当前标记为 `PENDING_REVIEW`，用于产品教学展示，不表示已经完成临床或专业动作审核。

准备流程的“动作示范”和训练页中央教学卡共用 `frontend/src/config/assets.ts` 中的同一素材映射。

## 后续替换为视频

把经过动作审核的视频放在这个目录，建议使用以下固定文件名：

- `straight.mp4`：伸指（STRAIGHT）
- `hook.mp4`：钩拳（HOOK）
- `fist.mp4`：握拳（FIST）

推荐规格：MP4/H.264、无声、竖屏或透明主体居中、每段 3–6 秒、首尾可自然循环。画面应完整包含指尖和手腕，三个视频使用相同拍摄方向；左手训练只镜像显示，不修改识别坐标。

文件复制完成后，编辑 `frontend/src/config/assets.ts` 中的 `GESTURE_ASSETS`：

```ts
STRAIGHT: { videoUrl: 'gestures/straight.mp4', fallback: 'BLANK', reviewState: 'APPROVED' },
HOOK: { videoUrl: 'gestures/hook.mp4', fallback: 'BLANK', reviewState: 'APPROVED' },
FIST: { videoUrl: 'gestures/fist.mp4', fallback: 'BLANK', reviewState: 'APPROVED' },
```

如果素材尚未完成动作审核，请先使用 `reviewState: 'PENDING_REVIEW'`。不要给不存在的文件配置路径，否则浏览器会产生 404。

配置后，准备流程的“动作示范”和训练页中央教学卡会自动调用同一段素材；视频加载失败时会回退到静态图片，图片也不存在时显示“空白”。
