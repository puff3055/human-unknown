# HUMAN UNKNOWN｜代码入口

> **当前范围：只有首页／第一次接触。**

开始代码任务前先阅读根目录 [`PROJECT_STATUS.md`](../PROJECT_STATUS.md)。它记录当前分支、标签、已实现能力和验收缺口；不要仅凭文件更新时间判断版本。

下面的“当前运行入口”描述 `codex/homepage-v4-2`／`v4.7.0-rc.1`。V4.7 在 `v4.6.0-rc.1` 上修正标题与旁白重叠，并实现用户确认的三句 3 秒渐入／5 秒完整显示／3 秒渐出时间线；第三句常驻并解锁凝视。不要重写星云、声音、凝视、光标或坠入系统。

## 当前运行入口

- `index.html`：首页入口。
- `encounter-machine.js`：V4.2 开场、三句行为门、旁白结束硬门、三秒凝视与黑场出口状态机。
- `app.js`：首页输入、生命反应、状态契约与交互编排。
- `light-cursor.js`：纯光光标的光团／光点收束、速度惯性、按压与坠入吸收状态。
- `assets/cursor-light-cloud.png` 与 `assets/cursor-light-point.png`：从用户选定参考图裁切并转为真透明底的两种光素材。
- `living-nebula.js`：活体星云／瞳孔渲染。
- `living-soundscape.js`：V4.2 继承的可感窄带低频声场、默认 `armed` 与一次手势启声。
- `style.css`：页面布局、标题、提示与声音开关样式。
- `design-qa.md`：当前已完成和仍缺失的验证。
- `qa/homepage-v4-contract-test.mjs`：V4 可执行交互状态机契约。
- `qa/soundscape-contract-test.mjs`：V4 声音图与开关契约。
- `qa/light-cursor-contract-test.mjs`：光标双形态、跟手、惯性、按压、吸收、素材和 reduced-motion 契约。
- `qa/v4.3/`：当前光标参考对比、默认／交互／吸收／黑场证据。
- `qa/v4.2/`：光标替换前的桌面、移动、旁白门控、凝视倒计时、单向坠入与 reduced-motion 历史证据。
- `qa/v4.1/` 与 `qa/v4/`：更早的历史证据，不代表当前 V4.3。

## 非当前入口

- `archive/`：已退出当前产品路线的代码实验。
- `sketch/`：草图或开发辅助内容，除非任务明确需要，否则不作为产品入口。

新增章节时，不要把旧实验代码因为“已经存在”就自动接回页面。先依据产品说明和本轮确认方案判断世界规则，再决定是否复用技术。
