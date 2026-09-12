# 三个手势教学视频接入说明

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
