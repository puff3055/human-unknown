# 首页 V4.3 纯光光标 QA 证据

> 采集日期：2026-09-06
> 分支：`codex/light-cursor-v4-3`
> 视觉真值：用户最终选定的纯光参考图
> 桌面视口：1440×900，device pixel ratio 1

## 证据索引

- `00-reference-light-states.png`：用户选定的完整参考；左侧是默认游丝光团，右侧是交互凝聚光点。
- `00-first-pass-black-box.png`：首轮直接使用 RGB 黑底裁图时的 P1 问题：亮背景上出现黑色方形边缘。
- `01-default-cloud-full.png`：默认 `cloud` 全页证据；光团在黑场中保持暖白／暗银、非对称和明确中心。
- `02-default-cloud-focus.png`：从上述 1440×900 证据按指针中心原尺寸裁切的 140×140 细节。
- `03-focused-point-full.png`：中央外围热区中的 `point / pupil` 全页证据。
- `03-focused-point-focus.png`：从上述全页证据裁切的 140×140 光点细节。
- `04-absorbing-point-full.png`：`entering / entry=0.504` 时的全页证据。
- `04-absorbing-point-focus.png`：光点朝锁定瞳孔原点拉伸、收缩并降低亮度的局部证据。
- `05-absorbed-handoff-full.png`：`handoff / entry=1` 黑场证据；光标透明度已为 0。
- `06-reference-vs-cursor-states.png`：同一张图中的四格比较，顺序为“参考光团／实现光团／参考光点／实现光点”；参考先归一到实际 72px／42px 尺寸，再等比放大供检查。

## 内置浏览器结果

- 默认离开交互区：`mode=cloud`、`target=none`；光芯与指针坐标一致。
- 进入声音控件：`mode=point`、`target=sound`、cloud opacity `0`、point opacity `1`，光标 `z-index=14` 不被控件遮挡。
- 进入中央热区：`mode=point`、`target=pupil`，不改动原有 `outer/core` 判定。
- 完整链路：`contact → near → noticed → aligned → entering → handoff`。吸收中途在 `entry=0.504` 采集，`handoff` 时 cursor opacity `0`。
- `prefers-reduced-motion`：光团旋转值在 600ms 前后均为 `-8deg`，速度拖曳均为 `0px`，交互时直接切换为静态光点。
- 390×844 布局的 `scrollWidth/scrollHeight` 为 `390/844`，没有新增溢出；粗指针隐藏由 CSS 媒体查询与可执行契约覆盖，内置浏览器的小视口本身仍报告 fine pointer。
- 最终桌面检查中两个透明素材的自然尺寸为 320×320 和 192×192，控制台 warning/error 为 0。
- 精细指针环境下 `html`、`body`、全部后代与伪元素均强制 `cursor: none`；粗指针规则恢复 `cursor: auto` 并隐藏自定义光。

## 可执行证据

- `node qa/light-cursor-contract-test.mjs` → `light cursor v4.3 contract: passed`。
- `node qa/homepage-v4-contract-test.mjs` → `homepage v4.3 contract: passed`。
- `node qa/soundscape-contract-test.mjs` → `soundscape contract: passed`。
- 所有当前 JavaScript 入口的 `node --check` 通过，`git diff --check` 通过。

V4.3 只验证新光标与 V4.2 契约的兼容性；声音主观听感仍沿用 V4.2 的待验收结论。
