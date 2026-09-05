# HUMAN UNKNOWN 首页 V4 Design QA

> 日期：2026-09-06
> 对象：`codex/homepage-v4`／`v4.0.0-rc.1`
> 结论：**客观测试通过；声音主观验收待用户真实试听。**

## 基准与边界

- 视觉母版：`00-项目参考材料/首页素材1.png`（1672×941）。
- V4 保留星云连续纹理、球体、瞳孔、凝视、水波和生长／消亡，不是纯粒子页。
- 本轮只到 `humanunknown:homepage-exit` 黑场，未创建植物世界。
- `.contact-cursor` 的视觉造型未改；只提供页面状态契约。

## 自动契约

- `node qa/homepage-v4-contract-test.mjs`：通过。覆盖四句原文与顺序、标题四秒可读和首次行为门、热区、停留回落、触摸抬起不继续推进、边界近静音、黑场出口与 reduced-motion。
- `node qa/soundscape-contract-test.mjs`：通过。覆盖开关、手势启声、状态映射、低频架构，并防止旧 `airNoise` / `worldNoise` / white-noise buffer / compressor 回归。
- `node --check app.js encounter-machine.js living-nebula.js living-soundscape.js`：通过。

## 内置浏览器证据

- 桌面 1440×900：短黑场后黑位显影；无输入时保持 `opening / title-hold`，无旁白、无自动播完。当前后台采样约 37 FPS，未见明显视觉卡顿。
- 真实指针链：`contact`／“在这里” → `near`／“对，在这里” → `noticed`／“它注意到你了” → `aligned`／“放入你的眼睛”。
- 离开核心时 `data-hold` 从 `0.448` 柔和回落到 `0.182`；重新停留后完成 `handoff`，`data-exit-ready="true"`。
- 声音按钮真实点击可切换 off/on；键盘动作如未被浏览器视为启声手势，状态在 0.9 秒后回到 `armed`，不会卡在 `starting`。
- 移动 390×844：`innerWidth = bodyScrollWidth = mainClientWidth = 390`，无横向溢出。
- reduced-motion：使用 `static-reduced-motion`，自主代谢和水波为 0，保留文案可读时间、热区与停留逻辑。
- 最终桌面与移动检查中，控制台 warning/error 均为 0。

当前截图在 `qa/v4/`；V3.x 截图只是历史证据。

## 待用户验收

- 用真实耳机和普通扬声器试听：静止负空间、35–55 Hz 重量、80–120 Hz 泛音可感度、移动水感长尾、停留前留白、一次性注意张开、核心收拢、边界近静音与下弯坠落。
- 自动测试不代替这项主观判断，当前不记为“用户已验收”。

final result: objective pass / subjective sound review pending
