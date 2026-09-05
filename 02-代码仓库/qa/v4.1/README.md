# 首页 V4.1 历史 QA 证据

> **历史归档：**当前证据已转为 `../v4.2/`。本文只证明 `v4.1.0-rc.1`，不能用来证明 V4.2。

> 采集日期：2026-09-06
> 核心实现：`1ae4ff2`
> 视口：桌面 1440×900，移动 390×844。

## 内置浏览器记录

- 无输入：`opening / title-hold`，片名保持，可见“轻触开启声音”。
- 单次点击声音控件：`armed → on`，可见“声音已开启”，未卡在 `starting`。
- 完整阶段：`contact / 在这里 → near / 对，在这里 → noticed / 它注意到你了 → aligned / 放入你的眼睛 → entering → handoff`。
- 旁白位置：桌面计算值 `310.5px`（`34.5vh`），移动计算值 `265.86px`（`31.5vh`），均在原片名上方。
- 外围热区：桌面 `--hotzone-cue ≈ 0.55`，移动 `≈ 0.69`；当前形态是四向不对称的暗银收拢光。
- 坠入缩放采样：`1.05, 1.05, 1.10, 1.25, 1.47, 1.74, 2.05, 2.44, 2.80, 3.19, 3.53, 3.86, 4.15, 4.39, 4.54, 4.60`；单调不减。
- reduced-motion 入口：`renderer=static-reduced-motion`，`texture=continuous-static`，canvas 隐藏，静态连续纹理显示。
- 桌面／移动／reduced-motion 检查完成后，控制台 warning/error：`0 / 0`。

## 可执行证据

- `node qa/homepage-v4-contract-test.mjs` → `homepage v4.1 contract: passed`。
- `node qa/soundscape-contract-test.mjs` → `soundscape contract: passed`。
- `node --check` 检查四个当前 JavaScript 入口均通过。

这份记录与当前浏览器图像视检共同构成 V4.1 客观证据。`../v4/` 内图像是 V4.0 历史证据，不用于证明本版。声音品质仍需用户在真实设备上试听。
