# HUMAN UNKNOWN V3 活体星云首页 Design QA

**Comparison Target**

- Source visual truth: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/00-项目参考材料/首页素材1.png`
- Normalized source copy: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/source-reference.png`
- Browser-rendered implementation: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3-desktop-noticed.png`
- Full-view source comparison: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3-reference-comparison.png`
- Focused typography comparison: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3-reference-focus.png`
- Gaze comparison: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3-gaze-comparison.png`
- Autonomous-rhythm comparison: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3-idle-comparison.png`
- Additional states: `qa/v3-desktop-waiting.png`, `qa/v3-desktop-studying-left.png`, `qa/v3-desktop-closer.png`, `qa/v3-mobile-waiting.png`
- CSS viewport: 1672 × 941 px; mobile check: 390 × 844 px; tablet check: 768 × 900 px
- Source and desktop implementation pixels: 1672 × 941; device scale factor: 1; density normalization: none.
- Compared state: `noticed`, pointer below the pupil, guide reading `它注意到你了。`

**Findings**

- No actionable P0, P1, or P2 difference remains for the approved continuous-texture direction.
- Fonts and typography: the desktop title's visible glyph bounds are x=378–1290 and y=398–428, compared with source x=380–1288 and y=398–428. Its thin weight, wide tracking, vertical position, subtitle hierarchy, and centered alignment now match the supplied artwork at 1:1 scale. Mobile uses a separate compact tracking rule to avoid overflow.
- Spacing and layout rhythm: the identity remains centered at 46.55% viewport height and the guide remains 10.55vh above the bottom. Typography and guide are fixed overlays; only the organism beneath them responds. Desktop, tablet, and mobile checks show no horizontal or vertical overflow.
- Colors and visual tokens: the page retains the source's black, charcoal, smoke-gray, and restrained silver palette. No interface color, card, gradient panel, menu, button, HUD, or explanatory surface was added.
- Image quality and asset fidelity: the supplied 1672 × 941 image is the visible WebGL texture, not merely a density map. Local UV deformation preserves continuous filaments, membranes, mist, dark void, tonal depth, and the three planet-like spheres. Outer tissue is strongly anchored while pupil and middle fibers receive most of the motion, preventing the composition from moving as a single bitmap.
- Copy and content: `HUMAN UNKNOWN`, `人类的世界，只是世界的一种解释。`, `它注意到你了。`, and `再靠近一点。` are exact. The homepage stays inside the approved “first contact” scope.
- Accessibility and resilience: the visual field is `aria-hidden`, changing guidance uses an `aria-live` region, coarse-pointer devices keep their native cursor, and `prefers-reduced-motion` freezes shader motion. WebGL failure or context loss reveals the static source image; context restoration recreates the renderer and returns to the living scene.

**Interaction Verification**

- The experience starts on load without a click gate. Before input, the 15.8-second irregular cycle moves through gathering, suspension, release, and afterwave rather than looping as a mechanical inhale/exhale.
- First contact requires 56 px of accumulated travel. Movement first raises a brief `sensing` / breath-hold response; awareness begins after 510 ms and then reveals `它注意到你了。`
- First-contact timing sample: at 150 ms the state was still `waiting`, life was `sensing`, hold=0.699, awareness=0, and the guide was absent. Roughly 620 ms later it was `noticed` / `orienting`, awareness=0.201, and the gaze had only begun to respond.
- Abrupt right-to-left reversal sample: settled right gaze=+23.49 px; immediate=+23.49 px; after 180 ms=+20.37 px; after 600 ms=+4.72 px; settled left=-16.14 px. The presence perceives, hesitates, and catches up instead of attaching to the pointer.
- When the pointer rests for 980 ms, the state becomes `studying`: nearby material gathers subtly, gaze reach increases by up to 5 px, and a faint texture-gated signal travels through existing fibers.
- Moving near the perceived pupil after awareness changes the phase to `closer`, reveals `再靠近一点。`, expands the pupil edge locally, and gathers the surrounding structure without scaling the page.
- Idle comparison measured inner-region mean absolute difference 5.272 versus 0.730 in an outer corner. Left/right gaze comparison measured 17.967 inner versus 1.526 outer. The pupil region therefore lives and reacts while the outer composition stays anchored.
- Desktop runtime sampled at 60.0 FPS. Mobile at 390 × 844 also sampled at 60.0 FPS after settling. No browser console warnings or errors were present in the final desktop and mobile passes.
- Forced WebGL context-loss state: `contact is-ready no-webgl`, renderer=`fallback`, canvas hidden, fallback visible. Forced restoration state: `contact is-ready`, renderer=`living-nebula`, canvas visible, fallback hidden. Evidence: `qa/v3-context-loss-fallback.png` and `qa/v3-context-restored.png`.

**Comparison History**

- V2 P1 fidelity issue: reducing the supplied artwork to a point cloud compressed away its continuous membranes, fog depth, and planetary detail. Fix: replaced the point-cloud renderer with a source-texture WebGL renderer whose deformation is local and depth-banded. Post-fix evidence: `qa/v3-reference-comparison.png`.
- First V3 P2 typography issue: the title was 40 px too narrow and sat several pixels too low. Fix: adjusted desktop size, tracking, left compensation, and vertical transform. Post-fix visible bounds differ from the source by only 2 px at each horizontal edge and 0 px vertically. Evidence: `qa/v3-typography-pass.png` and `qa/v3-reference-focus.png`.
- Independent code-review P2 resilience issue: a real `webglcontextlost` event could leave the canvas black. Fix: added context-loss callbacks, immediate static fallback, renderer teardown, and complete recreation on restoration. Post-fix evidence: `qa/v3-context-loss-fallback.png` and `qa/v3-context-restored.png`.

**Implementation Checklist**

- [x] Continuous filaments, membrane, fog, gray depth, and planet-like spheres preserved
- [x] Autonomous irregular living rhythm before any interaction
- [x] First-motion sensing pause and delayed awareness
- [x] Damped, delayed gaze with local inner/middle deformation
- [x] Resting-pointer curiosity / study response
- [x] `它注意到你了。` and `再靠近一点。` interaction states
- [x] Desktop, tablet, and mobile browser checks
- [x] Reduced-motion, static fallback, context-loss, and restoration paths
- [x] Console, overflow, syntax, and visual comparison checks

**Follow-up Polish**

- P3, optional and subjective: after the user tries the page with their own mouse, tune only the breath amplitude, gaze curiosity, or texture contrast. No structural change is required.

final result: passed
