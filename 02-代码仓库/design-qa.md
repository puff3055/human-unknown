# HUMAN UNKNOWN V3.4 声音首页 Design QA

## Findings

- [P1] 最新本地页面无法由自动化浏览器重新载入，因此缺少 V3.4 的浏览器渲染截图与真实控制台记录。
  - Location: `http://127.0.0.1:4173/`, `#soundToggle`.
  - Evidence: 本地服务器与所有首页资源均返回 HTTP 200，但应用内浏览器的 URL 安全策略拒绝重新载入该本地地址。现有最新截图是 V3.3，不包含新的声音按钮，不能冒充 V3.4 证据。
  - Impact: 无法在交付前独立确认声音图标在真实桌面与移动视口中的最终位置、对比度、点击状态和控制台表现。
  - Fix: 用户在现有本地预览中刷新并试听；浏览器访问恢复后，再捕获同尺寸 V3.4 页面并完成同屏比较。

- [P1] 声音的主观听感仍需要真实扬声器或耳机验收。
  - Location: `living-soundscape.js` 的存在层、代谢层、接触层和好奇反应。
  - Evidence: 自动化契约测试已确认声音图、状态参数、开关、持久化、键盘切换和交互映射均工作，但当前工具不能监听设备实际输出。
  - Impact: 不能替用户判断最终音量、低频可闻度、质感是否足够陌生，或某一层是否抢占视觉体验。
  - Fix: 用耳机试听静止、移动、停留、靠近与离开五个连续状态后调整混音。

## Comparison Target

- Source visual truth: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/00-项目参考材料/首页素材1.png`
- Source dimensions: 1672 × 941 px.
- Last verified implementation baseline: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3.3/01-idle-growth.png`, 1672 × 941 px at a 1672 × 941 CSS viewport.
- Intended V3.4 implementation: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/index.html`.
- V3.4 implementation screenshot: unavailable because local browser navigation was blocked.
- State intended for comparison: sound off on first visit, top-right crossed-speaker icon visible; sound on after activation, same button showing speaker waves.
- Full-view comparison evidence: blocked for V3.4. The V3.3 source/baseline comparison remains in `qa/v3.3/04-reference-comparison.png` but does not validate the new control.
- Focused comparison evidence: blocked; a focused crop of the top-right sound button has not been captured.

## Verified Without Browser Rendering

- `node --check` passes for `app.js` and `living-soundscape.js`.
- `qa/soundscape-contract-test.mjs` passes the off → on → interaction → off path, persisted armed state, gesture unlock, `M` keyboard control, audio-level telemetry, all three metabolism voices, contact, stillness, approach, and icon swapping.
- Both Tabler SVG assets pass XML validation and are served as `image/svg+xml`.
- Homepage, audio engine, on icon, and off icon return HTTP 200 from the active local preview.
- The toggle uses a native button with a 44 × 44 px target, `aria-label`, `aria-pressed`, a polite live status, visible focus outline, and a disabled fallback.
- The sound button's pointer press is excluded from first-contact logic, so operating audio does not falsely trigger the organism.
- The audio graph is local and procedural; there are no remote audio dependencies or delayed media downloads.

## Required Fidelity Surfaces

- Typography: provisionally unchanged — no title, subtitle, guide font, size, weight, spacing, or copy rule was edited; fresh browser evidence is still missing.
- Spacing/layout: blocked — only a fixed top-right control was added, but its actual rendered relationship to the source has not been captured.
- Colors/tokens: provisionally aligned — the button uses the existing `--paper` silver and black transparency; browser-rendered contrast is unverified.
- Image quality: passed for source preservation — nebula, pupil, planet texture, and WebGL source paths are unchanged.
- Icon fidelity: provisionally passed — real Tabler Icons assets are used under MIT license, not CSS art, Emoji, text glyphs, or handcrafted inline SVG; visual rendering is unverified.
- Copy/content: passed — existing title, subtitle, and guidance are unchanged; no menu, HUD, or explanatory text was added.
- Accessibility: contract passed, browser assistive-state verification pending.
- Interactions: contract passed, real audio output and browser console verification pending.

## Comparison History

- V3.3 was visually passed against the supplied source at equal 1672 × 941 dimensions.
- V3.4 intentionally adds one new top-right sound control while leaving every previously verified visual element unchanged.
- No V3.4 visual iteration can be claimed until the current implementation is captured. No screenshot was fabricated from the old page or composited with the icon.

## Implementation Checklist

- [x] Visible off icon with crossed speaker
- [x] Visible on icon with sound waves
- [x] Native accessible toggle and keyboard shortcut
- [x] Browser-autoplay-safe activation and saved preference
- [x] Independent existence, metabolism, contact, stillness, approach, and curiosity layers
- [x] Growth, decay, and transfer tied to the corresponding visual event data
- [x] Soft master fades on enable, disable, and hidden tab
- [x] Local icon assets and third-party license notice
- [x] Syntax, XML, HTTP, and audio-state contract checks
- [ ] Fresh desktop and mobile browser screenshots
- [ ] Browser console check
- [ ] Real-device listening pass
- [ ] Same-surface V3.4 source and implementation comparison

final result: blocked
