# 首页 V4.2 当前 QA 证据

> 采集日期：2026-09-06
> 核心实现：`89e98ab`
> 视口：桌面 1440×900，移动 390×844。

## 图像证据

- `01-title-desktop.png`：桌面片名／副标题入场后常驻。
- `02-narration-desktop.png`：“它注意到你了”位于片名上方，片名仍可见。
- `03-final-guide-mobile.png`：移动端“放入你的眼睛”阶段，倒计时未启动。
- `04-countdown-mobile.png`：最后一句结束后，瞳孔收窄变形并显示数字倒计时。
- `05-entry-start-desktop.png`：坠入起点，无反向缩小。
- `06-entry-forward-desktop.png`：单向放大后期的黑场交接。

## 内置浏览器记录

- 无输入：`opening / title-hold / countdown=waiting`，片名与副标题 `opacity=1`。
- 旁白链：`contact / 在这里 → near / 在这里 → noticed / 它注意到你了 → aligned / 放入你的眼睛`；页面不再出现“对，在这里”。
- 最后一句可见时：指针已在核心，仍为 `countdown=waiting`、`hold=0.000`。句子溶出后才进入 `ready / active`。
- 移动倒计时实测：`phase=aligned`、`countdown=active`、数字为 `2`时，片名仍 `opacity=1`。
- 坠入实测 CSS 缩放：`1.0601 → 1.3029 → 2.1611 → 3.5353 → 4.4935`，单调不减。
- 声音控件：页面初始 `armed`，单次点击后立即为 `on`，提示变为“声音已开启”。
- reduced-motion：`renderer=static-reduced-motion`、`texture=continuous-static`，片名可见，行为门与三秒倒计时保留。
- 桌面／移动／reduced-motion 的最终控制台 warning/error：`0 / 0`。

## 可执行证据

- `node qa/homepage-v4-contract-test.mjs` → `homepage v4.2 contract: passed`。
- `node qa/soundscape-contract-test.mjs` → `soundscape contract: passed`。
- `node --check` 检查四个当前 JavaScript 入口均通过。
- `git diff --check` 通过。

图像和状态读数均来自 V4.2 当前实现；`../v4.1/` 与 `../v4/` 只是历史证据。声音品质仍需用户用真实设备主观试听。
