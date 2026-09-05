# HUMAN UNKNOWN / 多世界纵切设计 QA

**Findings**

- 当前没有仍待处理的 P0 / P1 / P2 视觉问题。
- [已解决 P2] 世界画面曝光过低。
  - Location: `world-runtime.css` 的 `.anchor`、`.anchor.is-active` 与 `.world-matte`。
  - Evidence: 首轮并排图中，交换网络与遗留现实的细丝层次明显少于视觉锚点；见 `qa/comparison-pass-1.png`。第一世界在首轮使用了错误的相邻状态，因此不参与该轮精确判断。
  - Impact: 世界仍可使用，但材质细节和空间纵深损失，削弱“主动发现关系”的体验。
  - Fix: 提高活动锚点的亮度与不透明度，减轻全屏暗角；把第一世界参考图校正为相同的 stage 2 完成态。
  - Post-fix evidence: `qa/compare-section.png`、`qa/compare-exchange.png`、`qa/compare-reality.png`。三组基础构图、材质密度和视觉重心一致；浏览器侧仅增加由用户行为生成的轨迹、脉冲与最小引导。

**Comparison Target**

- Source visual truth:
  - `qa/reference-section-2.png`（“截面之外”stage 2，无烘焙文字的生成锚点）
  - `qa/reference-exchange-2.png`（“交换场”stage 2）
  - `qa/reference-reality-2.png`（“仍在发生”stage 2）
- Rendered implementation:
  - `qa/implementation-section-2-desktop.png`
  - `qa/implementation-exchange-2-desktop.png`
  - `qa/implementation-reality-2-desktop.png`
- Comparison surface: `qa/compare.html`，可用 `?pair=section`、`?pair=exchange`、`?pair=reality` 查看同态配对。
- State: 三个世界各自的 stage 2 完成态；主题、内容与交互证据一致。
- Viewport and normalization: CSS viewport 为 `1672 × 941`；源图与实现截图均为 `1672 × 941 px`；截图像素与 CSS 像素一一对应，density normalization 为 `1:1`，无设备框或浏览器外壳。
- Full-view comparison evidence: `qa/compare-section.png`、`qa/compare-exchange.png`、`qa/compare-reality.png`。
- Focused region comparison: 不需要额外裁切。视觉目标是无局部 UI 的全屏材料场，三张 1:1 源图及实现图在并排输入中已能清楚判断细丝、边缘、亮度、裁切和叙事重心。新增文字界面没有匹配源图，另以入口、世界、档案的完整视口截图检查排版与响应式，不伪造像素级来源比较。

**Required Fidelity Surfaces**

- Fonts and typography: 使用现有产品的 Helvetica Neue / PingFang SC 系统栈；标题采用极细字重与宽字距，正文和微型设置保持同一低信号层级。桌面、平板与手机截图中无截断、异常换行或字重跳变。
- Spacing and layout rhythm: 身份标、设置、引导分别固定于左上、右上、下方；主要视觉没有卡片化容器。档案页采用宽留白、细分隔线和两栏来源结构，手机端自然降为单栏。
- Colors and visual tokens: 仅使用黑、冷银与少量暖铜；校正后锚点保留黑场，同时恢复源图中的细丝层次。声音、提示和动态状态没有引入额外语义色。
- Image quality and asset fidelity: 九张可见锚点均为真实生成图像；运行时 JPEG 为 `1366 × 768`，保持 16:9 并以 `object-fit: cover` 覆盖。Canvas 只绘制因果轨迹、脉冲和探针，不替代视觉锚点，也没有使用占位图、手绘 SVG 或 CSS 假素材。
- Copy and content: 引导语按“误判—修正—认知回声”推进，不描述倒计时；来源档案明确区分数学模型、科学观察、科学争论、物理解释、文学与科幻，且回访入口保留玩家已发生的路径含义。
- Icons and surfaces: 体验没有图标系统，设置全部使用明确文字标签；未引入与视觉目标无关的圆角卡片、投影或装饰组件。

**Responsive Evidence**

- Desktop `1672 × 941`: `qa/implementation-entry-desktop.png`、三个世界完成态、`qa/implementation-archive-desktop.png`、`qa/implementation-archive-bottom-desktop.png`、`qa/implementation-archive-footer-desktop.png`。
- Tablet `768 × 1024`: `qa/implementation-entry-tablet.png`。
- Mobile `390 × 844`: `qa/implementation-entry-mobile.png`、`qa/implementation-reality-2-mobile.png`、`qa/implementation-archive-mobile.png`。
- 结果: 未见横向裁切、控件重叠、标题断裂或叙事层级坍塌；粗指针媒体条件下核心按钮最小高度为 `44px`。

**Interaction and Accessibility Checks**

- 鼠标完成入口阈值、三个世界和档案的完整路径；推进只由释放、跨界、远端失衡、轨迹回返与接缝触碰等事件触发。
- 仅键盘使用 Enter 锁定接触状态和方向键完成“截面之外”，并成功进入“交换场”；Space 按住/松开语义仍保留。
- 档案回访“交换场”后确认从 stage 0 开始，没有继承上次 pointerdown 的残留状态。
- 声音、减少动态、提示开关均产生正确的 `aria-pressed` 和可见状态；声音不是完成条件。
- 档案标题的程序化聚焦不再显示误导性的蓝色外框；可操作控件仍保留 `:focus-visible`。
- 麦克风只在“交换场”显示并须主动点击授权；本轮未替用户接受系统权限，因此真实麦克风流属于非阻断测试缺口。
- 浏览器日志为空，无 console error / warning。Codex 内嵌浏览器可见状态下观测约 28 fps；该面板刷新接近 30 Hz，物理设备 60 fps 目标仍应在后续生产性能轮单独验证。

**Open Questions**

- 首页到 `/worlds/` 的正式转场由首页分支负责；本分支只实现世界侧入口与 handoff 读取，不修改首页文件。

**Implementation Checklist**

- [x] 修复活动锚点曝光与暗角偏差。
- [x] 用相同 viewport、相同 stage 重新捕捉三组实现截图。
- [x] 把源图与浏览器实现在同一比较输入中复核。
- [x] 完成桌面、平板、手机响应式检查。
- [x] 完成鼠标主路径、键盘替代、设置开关和档案回访检查。
- [x] 确认浏览器控制台无错误。

**Follow-up Polish**

- [P3] 在真实 iOS / Android 设备上补做触控采样、扬声器混音与持续帧率测试。
- [P3] 获得明确授权后再做麦克风输入的系统权限与轨道释放实测。

final result: passed
