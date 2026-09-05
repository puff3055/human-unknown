# HUMAN UNKNOWN V3.2 生灭场首页 Design QA

## Comparison Target

- Source visual truth: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/00-项目参考材料/首页素材1.png`
- Normalized source copy: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/source-reference.png`
- Final idle implementation: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3.2/final-idle.png`
- Source and implementation in one surface: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3.2/30-reference-comparison.png`
- Focused contact/release comparison: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3.2/31-interaction-comparison.png`
- Desktop interaction sequence: `25-interaction-60ms.png` through `29-interaction-3340ms.png`
- Resilience evidence: `19-mobile-idle.png`, `20-mobile-contact.png`, `21-reduced-a.png`, `22-reduced-b.png`, `23-context-restored.png`, and `24-tablet-idle.png`
- Viewports: desktop 1672 × 941 CSS px, mobile 390 × 844 CSS px, tablet 768 × 900 CSS px. The desktop WebGL buffer is capped at 2090 × 1176 px (1.25×) to keep the texture crisp without destabilizing compositing.

## Findings

- No actionable P0, P1, or P2 issue remains for the approved V3.2 direction.
- The experience still reads simultaneously as a human pupil, a nebula, and an unknowably large organism. The supplied composition, continuous filament/membrane texture, deep black pupil, tonal layering, and three planet-like bodies remain recognizable; the implementation has not become a point cloud or a generic particle system.
- The source composition and typography remain intact: title, subtitle, guide position, black/silver palette, and negative-space hierarchy were not redesigned. No menu, button, card, HUD, or explanatory overlay was added.
- Autonomous motion is local and asynchronous. Different tissue zones grow, brighten, collapse, leave residue, and transfer energy at different times, so the page feels alive without the pupil repeatedly pumping.
- Pointer response deforms existing fibers as a pressure field with refraction and a trailing wake. It does not draw a clean circle on top of the artwork.
- Desktop, tablet, and mobile layouts have no horizontal or vertical overflow. At 390 px wide, the title remains within the viewport and the original hierarchy is retained.
- The image-to-code workflow influenced the implementation by treating the reference as visual truth and changing only its behavior: texture-bound deformation, growth/decay, gaze, and wave propagation are layered into the existing nebula instead of replacing it with newly drawn particles.

## Interaction Verification

- On entry, three independent tissue events begin at different times: growth is visible first, decay follows, and a second growth region appears later. The pupil remains at `0` throughout idle entry; there is no automatic pupil dilation loop.
- A deliberate pointer-direction reversal produced a visible response within the first 60 ms sample: `disturbance=1.000` and one wave packet was already active. The response then remained continuous instead of stepping between presets.
- Curiosity is evidence-driven. In the sampled contact, pupil dilation rose once from `0.050` at 60 ms to `0.695` at 300 ms and `0.811` at 620 ms, then decayed to `0.205` at 2.5 s and `0` by 4.7 s. With the pointer left still for the following eight seconds, it stayed at `0` rather than pulsing again.
- The final desktop sequence records the local water-pressure response and release at 60, 340, 740, 1540, and 3340 ms. The wave is still faintly present at 3340 ms and is removed only after its opacity has tapered, avoiding the previous hard disappearance.
- Wave packets have independent origins, directions, durations, reach, breakup, and delayed recycling. Their 3.2–5.8 s lifetimes are event-triggered by movement, stopping, turning, curiosity, or nearby metabolism rather than a fixed modulo clock.
- Moving near the perceived pupil enters `closer`, increases curiosity once, gathers surrounding tissue, and shows the exact copy `再靠近一点。`; ordinary contact shows `它注意到你了。`
- Final desktop, tablet, and mobile runs sampled at 60 FPS. Final browser logs contained no warning or error, and the renderer reported `living-nebula`.

## Accessibility and Resilience

- The real `prefers-reduced-motion` branch disables life-event energy, waves, gaze, pupil dilation, drifting motes, and twinkle. In the reduced-motion harness, the canvas remained pixel-stable while DOM text differed only by subpixel antialiasing; telemetry reported `breath=0`, `pupil=0`, `waveCount=0`, and `gaze=0`.
- WebGL loss exposes the static artwork; restoration recreates the living renderer. The final harness reported `restored`, with evidence in `23-context-restored.png`.
- The visual field remains `aria-hidden`, guidance uses an `aria-live` region, coarse-pointer devices retain their native cursor, and the static fallback preserves all essential visual content.

## Required Fidelity Surfaces

- Typography: passed — title/subtitle content, alignment, scale, spacing, and restrained opacity match the approved composition.
- Spacing/layout: passed — central pupil, title block, bottom guide, and edge cropping remain consistent across desktop, tablet, and mobile.
- Colors/tokens: passed — monochrome black, silver, and warm-grey highlights remain restrained; no new interface color was introduced.
- Image quality: passed — the cleaned 1672 × 941 source texture remains the visible basis and renders through a density-capped WebGL buffer.
- Copy/content: passed — `HUMAN UNKNOWN`, `人类的世界，只是世界的一种解释。`, `它注意到你了。`, and `再靠近一点。` are unchanged.
- Icons: not applicable — the experience intentionally contains no icon UI.
- Responsive behavior: passed — desktop, tablet, and mobile checks show no overflow or broken hierarchy.
- Accessibility/resilience: passed — reduced motion, static fallback, context restoration, ARIA behavior, and coarse pointer behavior were checked.
- Interactions: passed — autonomous growth/decay, curiosity-only pupil dilation, gaze, water-pressure wake, and non-abrupt propagation were verified in browser.

## Comparison History

- V3.1 fixed-rhythm problem: autonomous movement and signal propagation were still driven by repeatable timing, so the organism could read as programmed breathing. Fix: removed the global breath/pupil rhythm and the modulo signal clock; V3.2 uses asynchronous regional metabolism and event-created wave packets.
- V3.1 curiosity problem: the pupil could enlarge without a meaningful stimulus. Fix: pupil dilation is now a bounded one-shot envelope that can only be armed by new pointer evidence, then must decay before it can be triggered again.
- V3.1 hover problem: propagation started late, advanced in visible steps, and disappeared before the wave felt complete. Fix: immediate pressure/refraction follows velocity, stopping produces a soft release wave, and each wave uses a long continuous fade with irregular breakup near the end.
- First V3.2 performance pass: high-density rendering plus frequent QA captures could stress compositing. Fix: reduced simultaneous life/wave slots to three each and capped desktop density at 1.25×. Final desktop, tablet, and mobile evidence is clean at 60 FPS.

## Implementation Checklist

- [x] No automatic idle pupil pumping
- [x] Curiosity-triggered one-shot pupil dilation
- [x] Local asynchronous growth, collapse, residue, and energy migration
- [x] Immediate water-pressure, refraction, and wake response
- [x] Independent irregular waves with continuous 3.2–5.8 s decay
- [x] Existing texture and planet detail preserved
- [x] Exact approved copy and minimal interface preserved
- [x] Desktop, tablet, and mobile browser checks
- [x] Reduced-motion, static fallback, context-loss, and restoration checks
- [x] Syntax, HTTP response, overflow, FPS, console, and same-surface visual comparisons

final result: passed
