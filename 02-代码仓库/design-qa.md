# HUMAN UNKNOWN 首页 V4.2 Design QA

> 日期：2026-09-06
> 对象：`codex/homepage-v4-2`／`v4.2.0-rc.1`
> 结论：**客观测试通过；声音主观验收待用户真实试听。**

## 基准与边界

- 视觉母版：`00-项目参考材料/首页素材1.png`（1672×941）。
- 保留星云连续纹理、球体、瞳孔、凝视、水波和生长／消亡，未改成纯粒子页。
- 只验证到 `humanunknown:homepage-exit` 黑场，未创建植物世界。
- `.contact-cursor` 的视觉造型未修改；本轮只新增供独立光标任务读取的倒计时状态。

## 自动契约

- `node qa/homepage-v4-contract-test.mjs`：通过。覆盖三句精确原文与顺序、删除“对，在这里”、标题四秒可读和首次行为门、片名／副标题常驻、加速旁白、最后一句结束前停留不累计、3/2/1 三秒凝视、离开回落、触摸抬起取消、单调坠入、黑场出口和 reduced-motion。
- `node qa/soundscape-contract-test.mjs`：通过。覆盖默认 `armed`、明示启声提示、一次手势成功、单次唤醒回应、窄带可感底层、noticed 时让位、5–9 秒稀疏压力，并防止旧 noise buffer／`airNoise`／`worldNoise`／compressor 回归。
- `node --check app.js encounter-machine.js living-nebula.js living-soundscape.js`：通过。
- `git diff --check`：通过。

## 当前内置浏览器证据

- 桌面 1440×900：无输入时保持 `opening / title-hold`；片名和副标题均为 `opacity=1`。开始接触、切换旁白、凝视倒计时时仍保持。
- 旁白：桌面计算位置约 `311px`，片名顶约 `378px`；移动旁白顶约 `270px`，片名顶约 `369px`。两者均在片名上方，且恢复为约 `10–13px` 的克制字号。
- 行为链：`contact / 在这里 → near / 在这里 → noticed / 它注意到你了 → aligned / 放入你的眼睛`。
- 硬门：“放入你的眼睛”清晰显示时，鼠标已在 `hotzone=core`，页面仍为 `countdown=waiting`、`hold=0.000`。文字溶出后才进入 `active`并显示数字。
- 新形态：桌面和移动中，倒计时开始时瞳孔由圆形有机光收窄为非对称垂直孔径，不是按钮、进度条或 HUD。
- 坠入实测：`--cosmos-scale` 为 `1.0601 → 1.3029 → 2.1611 → 3.5353 → 4.4935`；只向前放大，未出现先缩小再放大。
- 声音控件：刷新后为 `data-sound-state="armed"`，单次点击后立即为 `on`，可见文字变为“声音已开启”。
- 移动 390×844：片名和副标题完整在视口内，旁白在上方，最后一句与倒计时不重叠。
- reduced-motion：`renderer="static-reduced-motion"`、`texture="continuous-static"`，WebGL canvas 停止；标题、旁白阅读门和三秒凝视保留。
- 完整桌面、移动和 reduced-motion 检查的控制台 warning/error 均为 0，未见明显卡顿。

本轮图像与读数索引在 `qa/v4.2/README.md`。`qa/v4.1/` 和 `qa/v4/` 仅属历史版本，未被当作当前证据。

## 待用户验收

- 请用真实耳机和普通扬声器试听：单次启声回应是否足够明确但不突兀；44 Hz／99 Hz 窄带底层是否可感又不像机器持续运转；稀疏压力、移动水感长尾、一次注意张开、边界近静音和下弯坠落是否成立。
- 自动测试和 AudioContext 的 `running` 状态不能代替主观听感，当前不记为“用户已验收”。

final result: objective pass / subjective sound review pending
