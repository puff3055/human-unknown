# HUMAN UNKNOWN｜代码入口

> **当前范围：只有首页／第一次接触。**

开始代码任务前先阅读根目录 [`PROJECT_STATUS.md`](../PROJECT_STATUS.md)。它记录当前分支、标签、已实现能力和验收缺口；不要仅凭文件更新时间判断版本。

下面的“当前运行入口”描述 `codex/homepage-v4-1`／`v4.1.0-rc.1`。V4.1 在 `v4.0.0-rc.1` 完整实现上定向修正；不要从旧入口重写替代页面。

## 当前运行入口

- `index.html`：首页入口。
- `encounter-machine.js`：V4.1 开场、四句行为门、延长可读时间、热区、停留与黑场出口状态机。
- `app.js`：首页输入、生命反应、状态契约与交互编排。
- `living-nebula.js`：活体星云／瞳孔渲染。
- `living-soundscape.js`：V4.1 可感窄带低频声场、默认 `armed` 与一次手势启声。
- `style.css`：页面布局、标题、提示与声音开关样式。
- `design-qa.md`：当前已完成和仍缺失的验证。
- `qa/homepage-v4-contract-test.mjs`：V4 可执行交互状态机契约。
- `qa/soundscape-contract-test.mjs`：V4 声音图与开关契约。
- `qa/v4.1/`：当前桌面、移动、阶段、单向坠入与 reduced-motion 浏览器证据记录。
- `qa/v4/`：`v4.0.0-rc.1` 历史截图，不代表当前 V4.1。

## 非当前入口

- `archive/`：已退出当前产品路线的代码实验。
- `sketch/`：草图或开发辅助内容，除非任务明确需要，否则不作为产品入口。

新增章节时，不要把旧实验代码因为“已经存在”就自动接回页面。先依据产品说明和本轮确认方案判断世界规则，再决定是否复用技术。
