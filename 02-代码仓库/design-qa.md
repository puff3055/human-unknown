# HUMAN UNKNOWN 首页 V4.1 Design QA

> 日期：2026-09-06
> 对象：`codex/homepage-v4-1`／`v4.1.0-rc.1`
> 结论：**客观测试通过；声音主观验收待用户真实试听。**

## 基准与边界

- 视觉母版：`00-项目参考材料/首页素材1.png`（1672×941）。
- 保留星云连续纹理、球体、瞳孔、凝视、水波和生长／消亡，未改成纯粒子页。
- 只验证到 `humanunknown:homepage-exit` 黑场，未创建植物世界。
- `.contact-cursor` 视觉造型未改；只扩展页面状态及 CSS 变量契约。

## 自动契约

- `node qa/homepage-v4-contract-test.mjs`：通过。覆盖四句精确原文与顺序、标题四秒可读及首次行为门、每句延长可读时间、热区、停留回落、触摸抬起后不继续推进、进入前静止、单调放大、黑场出口和 reduced-motion。
- `node qa/soundscape-contract-test.mjs`：通过。覆盖默认 `armed`、明示启声提示、一次手势成功、单次唤醒回应、窄带可感底层、noticed 时让位、5–9 秒稀疏压力，并防止旧 noise buffer／`airNoise`／`worldNoise`／compressor 回归。
- `node --check app.js encounter-machine.js living-nebula.js living-soundscape.js`：通过。
- `git diff --check`：通过。

## 当前内置浏览器证据

- 桌面 1440×900：片名在无输入时保持 `opening / title-hold`；旁白位于片名上方，字号、对比度和暗部阴影可读。
- 真实指针链：`contact`／“在这里” → `near`／“对，在这里” → `noticed`／“它注意到你了” → `aligned`／“放入你的眼睛”。
- 核心提示：桌面外围热区时 `--hotzone-cue` 实测约 `0.55`；移动 390×844 时约 `0.69`。画面为四向不对称暗银收拢光，不是按钮或进度环。
- 坠入实测：前约 0.42 秒保持 `1.05`；之后采样为 `1.10 → 1.25 → 1.47 → 1.74 → 2.05 → 2.44 → 2.80 → 3.19 → 3.53 → 3.86 → 4.15 → 4.39 → 4.54 → 4.60`；无回缩，结束为 `handoff`。
- 声音控件：新会话显示音量图标和“轻触开启声音”；真实单次点击后立即为 `data-sound-state="on"`，显示“声音已开启”后自行淡出。
- 移动 390×844：片名、旁白、热区和声音提示均在视口内；触摸／笔的 active 取消由可执行契约验证。
- reduced-motion 测试入口：`renderer="static-reduced-motion"`、`texture="continuous-static"`、WebGL canvas 隐藏并使用静态连续纹理；状态机保留阅读时间与行为门。
- 完整桌面、移动和 reduced-motion 检查的控制台 warning/error 均为 0，无明显卡顿。

本轮证据索引在 `qa/v4.1/README.md`。`qa/v4/` 图像只属于 V4.0，未被当成本轮证据。

## 待用户验收

- 用真实耳机和普通扬声器试听：单次启声回应是否足够明确但不突兀；44 Hz／99 Hz 窄带底层是否可感又不像机器持续运转；稀疏压力、移动水感长尾、一次注意张开、边界近静音和下弯坠落是否成立。
- 自动测试和 AudioContext 运行状态不能代替主观听感，当前不记为“用户已验收”。

final result: objective pass / subjective sound review pending
