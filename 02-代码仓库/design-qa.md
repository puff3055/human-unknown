# HUMAN UNKNOWN 首页粒子凝视 Design QA

**Comparison Target**

- Source visual truth: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/00-项目参考材料/首页素材1.png`
- Normalized source copy: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/source-reference.png`
- Browser-rendered implementation: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/particle-noticed-final.png`
- Full-view comparison evidence: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/reference-vs-particles.png`
- Focused title/guide evidence: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/reference-vs-particles-focus.png`
- Motion-state comparison evidence: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/particle-motion-comparison.png`
- Additional states: `qa/particle-closer.png`, `qa/particle-mobile.png`
- CSS viewport: 1672 × 941 px; mobile check: 390 × 844 px
- Source pixels: 1672 × 941
- Implementation pixels: 1672 × 941
- Device scale factor: 1
- Density normalization: none; source and implementation have identical pixel dimensions.
- Compared state: `noticed`, pointer at x=836, y=880, guide reading `它注意到你了。`

**Findings**

- No actionable P0, P1, or P2 differences remain for the approved particle-based direction.
- Fonts and typography: `HUMAN UNKNOWN` retains the source's thin, widely tracked display treatment through the Helvetica Neue stack, while Chinese copy uses PingFang SC/Noto Sans CJK SC. At 1672 × 941 the identity container is centered at x=316, y=398.41, w=1040, with the subtitle beginning at y=459.46. Weight, hierarchy, line height, wrapping, and copy remain consistent in the 1:1 focused comparison.
- Spacing and layout rhythm: the identity stays on the center axis at 46.55% viewport height; the guide remains at 10.55vh from the bottom. Text and cursor are independent overlays and do not move with the particle field. Horizontal overflow is 0 px at both tested viewports.
- Colors and visual tokens: the implementation preserves the black/charcoal/silver monochrome palette. Additive particle blending produces light only where the source texture contains structure; there are no added interface colors, cards, gradients, borders, or HUD surfaces.
- Image quality and asset fidelity: the supplied 1672 × 941 artwork is used as an offscreen sampling map for point density, tone, and composition. The visible scene is rendered as native WebGL particles and short filament segments; the fallback bitmap is `display:none` when WebGL is available. The central void, radial eye structure, satellites, crop, and overall balance are preserved. Continuous smoky filaments are intentionally translated into granular particles because that is the product requirement, not an unintentional asset substitution.
- Copy and content: `HUMAN UNKNOWN`, `人类的世界，只是世界的一种解释。`, `它注意到你了。`, and `再靠近一点。` are exact. No button, menu, HUD, Signal system, or explanatory panel has been introduced.
- Accessibility and resilience: the visual canvas is `aria-hidden`, changing guidance is announced by an `aria-live` region, and `prefers-reduced-motion` suppresses gaze/approach animation. A static source-art fallback remains available for WebGL failure.

**Interaction Verification**

- The page starts immediately with no click gate. After 64 px of accumulated pointer travel, `它注意到你了。` appears after 760 ms.
- Desktop load: 68,000 independent point vertices plus 26,000 short-line vertices are active. The raster fallback is hidden and the canvas is visible.
- Left-to-right reversal sample: settled left = -25.44 px; immediately after reversal = -25.60 px; after 180 ms = -23.43 px; after 600 ms = +8.85 px; settled right = +25.44 px. The gaze therefore remains in the previous direction briefly, then catches up rather than sticking to the cursor.
- `qa/particle-motion-comparison.png` confirms that the title, subtitle, guide, and outer composition remain anchored while the inner particle field redirects.
- Moving into the pupil changes the phase to `closer`, swaps the guide to `再靠近一点。`, and reaches approach = 1.000. The shader locally expands the pupil edge and gathers the middle-depth particles; it does not scale the whole page.
- Desktop runtime sampled at 60.0 FPS with no console warnings or errors.
- Mobile at 390 × 844 activates 20,000 points and 7,200 short-line vertices, returns to 60.0 FPS after settling, has no horizontal overflow, and produces no console warnings or errors.

**Comparison History**

- Earlier implementation finding — P1 behavior: the entire raster eye translated and scaled as one layer, so it read as “a large blob following the cursor” instead of a living particle presence. Fix: removed the global image transform path and replaced the visible artwork with a WebGL point/line field sampled from the supplied composition. Post-fix evidence: `qa/particle-noticed-final.png` and `qa/particle-motion-comparison.png`.
- First particle-response pass — P2 behavior: the eye crossed the center too soon after an abrupt cursor reversal, weakening the sense of perception followed by pursuit. Fix: added a low-pass perception stage before a damped spring and reduced the spring response. Post-fix evidence: after 180 ms the eye still measures -23.43 px in its prior direction and only crosses the center by 600 ms.
- Final static fidelity pass: source and implementation were placed in the same full-view comparison at identical dimensions, then title and guide regions were compared at 1:1 scale. The remaining difference is the approved granular rendering treatment; no actionable P0/P1/P2 issue remains.

**Open Questions**

- None for the requested homepage scope. Particle brightness, gaze amplitude, and pursuit delay remain subjective tuning controls for the user's own mouse-feel review.

**Implementation Checklist**

- [x] Native page particles instead of a moving bitmap
- [x] Independent particle drift and depth-banded deformation
- [x] Delayed, damped gaze tracking
- [x] `它注意到你了。` awareness state
- [x] `再靠近一点。` proximity state
- [x] Local pupil-edge expansion and mid-field gathering
- [x] Fixed typography and guidance layers
- [x] Desktop and mobile browser checks
- [x] Reduced-motion and WebGL fallback paths
- [x] Console and overflow checks

**Follow-up Polish**

- P3, optional: restore a small amount of longer, low-opacity filament continuity if the user wants the particle version to feel closer to the source's smoke texture without returning to whole-image movement.

final result: passed
