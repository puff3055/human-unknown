# HUMAN UNKNOWN｜代码入口

> **当前汇合候选：V4.5.3 首页／第一次接触 → 世界 1「THE GREEN BODY／群体生命」单页实时网络。**

开始代码任务前先阅读根目录 [`PROJECT_STATUS.md`](../PROJECT_STATUS.md)。它记录当前分支、标签、已实现能力和验收缺口；不要仅凭文件更新时间判断版本。

下面的“当前运行入口”描述 `codex/home-green-bridge`／`home-green-v0.1.0-rc.1`。受保护的来源是 V4.5.3 首页 `e894154` 和世界 1 实时网络 `968af59`；不要为了后续世界重写已经验证的首页或第一章。

## 当前运行入口

- `index.html`：同一文档内的首页和世界 1 运行入口。
- `encounter-machine.js`：V4.2 开场、三句行为门、旁白结束硬门、三秒凝视与黑场出口状态机。
- `app.js`：首页输入、生命反应、状态契约与交互编排。
- `light-cursor.js`：纯光光标的光团／光点收束、速度惯性、按压与坠入吸收状态。
- `assets/cursor-light-cloud.png` 与 `assets/cursor-light-point.png`：从用户选定参考图裁切并转为真透明底的两种光素材。
- `living-nebula.js`：活体星云／瞳孔渲染。
- `living-soundscape.js`：V4.2 继承的可感窄带低频声场、默认 `armed` 与一次手势启声。
- `style.css`：页面布局、标题、提示与声音开关样式。
- `journey-controller.js`：监听首页进入／出口事件，用同一个光点完成一次硬切并抵达世界 1 的真实节点。
- `green-body-realtime.js`：世界 1 的隐藏传导图、真实抵达、器官回应、章节状态与返回契约。
- `green-body-living.js`：基于世界 1 母版的实时生命纹理。
- `green-body-realtime.css`：世界 1 与跨世界光点的舞台、文字和动效样式。
- `world-one-soundscape.js`：只在世界 1 激活后运行的章节声场。
- `design-qa.md`：当前已完成和仍缺失的验证。
- `qa/homepage-v4-contract-test.mjs`：V4 可执行交互状态机契约。
- `qa/soundscape-contract-test.mjs`：V4 声音图与开关契约。
- `qa/light-cursor-contract-test.mjs`：光标双形态、跟手、惯性、按压、吸收、素材和 reduced-motion 契约。
- `qa/home-green-bridge-contract-test.mjs`：单一光点、一次硬切、真实目标节点和跨页面事件契约。
- `qa/home-green-bridge/`：本次完整桌面链路、状态数据和回退基线记录。
- `qa/v4.3/`：当前光标参考对比、默认／交互／吸收／黑场证据。
- `qa/v4.2/`：光标替换前的桌面、移动、旁白门控、凝视倒计时、单向坠入与 reduced-motion 历史证据。
- `qa/v4.1/` 与 `qa/v4/`：更早的历史证据，不代表当前 V4.3。

## 非当前入口

- `archive/`：已退出当前产品路线的代码实验。
- `sketch/`：草图或开发辅助内容，除非任务明确需要，否则不作为产品入口。

后续世界仍是独立候选，尚未接入当前入口。新增章节时，不要把旧实验代码因为“已经存在”就自动接回页面；先确定上一章出口、下一章入口和单一连续载体，再在独立分支汇合。
