# HUMAN UNKNOWN V3.3「可见的代谢」首页 Design QA

## Comparison Target

- Source visual truth: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/00-项目参考材料/首页素材1.png`
- Normalized source copy: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/source-reference.png`
- Idle lifecycle sequence: `qa/v3.3/01-idle-growth.png` through `03-idle-rebirth.png`
- Source and implementation in one comparison surface: `qa/v3.3/04-reference-comparison.png`
- Focused lifecycle comparison: `qa/v3.3/05-lifecycle-comparison.png`
- Pointer/contact sequence: `qa/v3.3/06-contact-60ms.png` through `10-contact-3340ms.png`
- Resilience evidence: `11-reduced-a.png`, `12-reduced-b.png`, `13-mobile-idle.png`, `14-mobile-contact.png`, `14-tablet-idle.png`, and `15-context-restored.png`
- Source and final desktop captures are both 1672 × 941 px. Browser viewport was 1672 × 941 CSS px at DPR 2; the WebGL render buffer remains density-capped at 1.25×.
- Responsive content viewports were tested at exactly 390 × 844 and 768 × 900 CSS px inside the browser harness.

## Findings

- No actionable P0, P1, or P2 issue remains for the approved V3.3 direction.
- The original supplied image remains the visual truth. The eye/nebula silhouette, continuous filament and membrane texture, deep pupil, three planet-like bodies, monochrome palette, title, subtitle, and negative-space hierarchy are preserved.
- The page does not read as a point cloud or a generic particle system. All new motion is masked through the existing filament, veil, fog, and soft-light fields.
- Idle life is now legible rather than merely present: one structure advances and branches, another retreats and fractures into residue, and a third channel intermittently carries residue toward a new growth region.
- The pupil does not run an automatic breathing loop. It remains still during autonomous metabolism and dilates only after new pointer evidence expresses curiosity.
- Pointer movement continues to feel fluid: local pressure, refraction, wake, and event advection begin immediately; their release tapers continuously instead of disappearing at a fixed radius.
- The image-to-code workflow influenced the result by treating the supplied artwork as immutable visual identity and changing only its internal behavior.

## Lifecycle Verification

- On entry, growth and decay are pre-warmed into different phases, so the user does not wait through an empty opening. Their positions, durations, directions, and phase offsets continue to vary.
- A 20-second idle telemetry sample contained growth in 20/20 samples and decay in 20/20 samples. The transfer channel appeared in 18/20 samples; its two short absences were the intended irregular 240–620 ms recycling gaps.
- Growth and decay progress crossed cycle boundaries without a missing frame. Their visible responsibilities remain fixed instead of randomly switching into the same state.
- Idle pupil telemetry remained `0.000` in 20/20 samples, confirming that autonomous life no longer pumps the eye.
- Foreground desktop, mobile, and tablet visual captures held approximately 60 FPS. A long automation sample briefly reported browser-throttled 30–35 FPS while diagnostic commands ran, then returned to 60 FPS; no visual jump or stalled lifecycle was observed.

## Interaction Verification

- The contact sequence records the same pointer move at 60, 340, 740, 1540, and 3340 ms. Immediate response was present at 60 ms with `disturbance=1`, three active wave packets, and the first curiosity rise.
- Pupil dilation reached its one-shot curiosity peak by roughly 340–740 ms, then released to zero. It did not restart while the pointer was still.
- The guidance still changes from `它注意到你了。` to `再靠近一点。` only as the user approaches.
- Pointer travel near a life region now also nudges that region's position and direction, with a bounded temporary energy lift. The life event continues from its existing phase rather than restarting.
- At 3340 ms, the disturbance had returned to zero while two faint wave packets were still completing their fade; the propagation therefore finishes softly instead of being clipped.
- Main homepage browser logs contained no warning or error, and the renderer reported `living-nebula` with `texture=continuous`.

## Accessibility and Resilience

- The real `prefers-reduced-motion` path now uses the static supplied fallback image instead of continuing to render nominally frozen WebGL frames.
- Two reduced-motion captures were byte-identical (`SHA-256 e30b96e93aceb67a3683a4d19b1d242c34a179ba51aafaa82a13288977c84567`), with telemetry `renderer=static-reduced-motion`, `pupil=0`, `waveCount=0`, and `breath=0`.
- WebGL loss exposes the static artwork; restoration recreates the live renderer. The recovery harness finished with `status=restored`, recorded in `15-context-restored.png`.
- Mobile and tablet content viewports had matching client and scroll dimensions, with no horizontal or vertical overflow. Both reported one growth channel, one decay channel, one transfer channel, a still pupil, and approximately 60 FPS.
- The visual field remains `aria-hidden`, guidance remains an `aria-live` region, and coarse-pointer devices retain the native cursor.

## Required Fidelity Surfaces

- Typography: passed — approved title/subtitle copy, scale, alignment, tracking, and opacity are unchanged.
- Spacing/layout: passed — central pupil, title block, guide, and edge cropping retain the supplied composition across desktop, tablet, and mobile.
- Colors/tokens: passed — only the existing black, silver, and restrained warm-grey range is used.
- Image quality: passed — the 1672 × 941 cleaned source texture remains the visible basis; growth, decay, and transfer are texture-bound rather than overlaid graphics.
- Copy/content: passed — no menu, button, card, HUD, explanation, or new world content was added.
- Icons: not applicable — the homepage intentionally contains no icon UI.
- Responsive behavior: passed — exact mobile and tablet harnesses show no overflow or broken hierarchy.
- Accessibility/resilience: passed — reduced motion, static fallback, WebGL loss/restoration, ARIA behavior, and coarse-pointer behavior were checked.
- Interactions: passed — continuous metabolism, curiosity-only pupil dilation, gaze, immediate water-pressure wake, event advection, and soft wave release were verified in browser.

## Comparison History

- V3.2 perceptibility issue: life channels existed, but small brightness and deformation shifts were swallowed by the rich source texture. Fix: V3.3 gives each channel a visually distinct spatial action — an advancing branch tip, a retreating fracture edge, or a moving transfer head and tail.
- First V3.3 lifecycle pass: a recycled event returned early for one animation frame, allowing telemetry to report a momentary missing growth or decay channel. Fix: the replacement event is processed in the same frame.
- First responsive harness pass: a 1 px iframe border reduced the measured content viewport by 2 px. Fix: moved the outline to the stage shadow and verified exact 390 × 844 and 768 × 900 content sizes.
- Reduced-motion audit: rendering an energy-zero WebGL scene was visually stable but still unnecessary motion work. Fix: reduced motion now enters a true static fallback before initializing WebGL.

## Implementation Checklist

- [x] Original nebula/pupil texture and three planet-like bodies preserved
- [x] Simultaneous, continuously visible growth and decay
- [x] Irregular residue-to-growth transfer with short organic gaps
- [x] No automatic idle pupil pumping
- [x] Curiosity-triggered one-shot pupil dilation
- [x] Immediate water-pressure, refraction, wake, and local life-event advection
- [x] Continuous wave and decay release without hard disappearance
- [x] Desktop, tablet, and mobile browser checks
- [x] True static reduced-motion fallback and byte-stability check
- [x] WebGL context loss/restoration check
- [x] Same-surface source/final and focused lifecycle visual comparisons
- [x] Syntax, HTTP response, overflow, telemetry, FPS, and console checks

final result: passed
