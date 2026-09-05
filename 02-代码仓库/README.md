# HUMAN UNKNOWN｜代码入口

> **当前范围：V3.4 首页／第一次接触。世界 1 六页实现已归档。**

开始代码任务前先阅读根目录 [`PROJECT_STATUS.md`](../PROJECT_STATUS.md)。它记录当前分支、标签、已实现能力和验收缺口；不要仅凭文件更新时间判断版本。

下面的“当前运行入口”描述归档提交后的 `codex/world1-implementation`：页面恢复为 V3.4 首页，不再加载或进入世界 1。

## 当前运行入口

- `index.html`：V3.4 首页入口。
- `app.js`：V3.4 首页状态与交互编排。
- `living-nebula.js`：活体星云／瞳孔渲染。
- `living-soundscape.js`：V3.4 程序化声音与声音状态。
- `style.css`：页面布局、标题、提示与声音开关样式。
- `design-qa.md`：历史世界 1 设计 QA。
- `qa/`：分版本 QA 证据与检查脚本；世界 1 截图不代表当前页面。

在本目录运行 `python3 -m http.server 4174`，然后打开 `http://127.0.0.1:4174/`。直接打开文件无法稳定验证 WebGL、声音和资源加载。

## 非当前入口

- `world-one.js`、`world-one.css`、`world-one-soundscape.js`、`assets/world1/`：世界 1 六页历史实现与视觉材料；当前入口不加载。
- `archive/`：已退出当前产品路线的代码实验。
- `sketch/`：草图或开发辅助内容，除非任务明确需要，否则不作为产品入口。

新增章节时，不要把旧实验代码因为“已经存在”就自动接回页面。先依据产品说明和本轮确认方案判断世界规则，再决定是否复用技术。
