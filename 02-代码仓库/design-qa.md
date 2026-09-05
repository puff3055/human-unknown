# HUMAN UNKNOWN V3.1 可感知活体首页 Design QA

## Comparison Target

- Source visual truth: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/00-项目参考材料/首页素材1.png`
- Normalized source copy: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/source-reference.png`
- Final desktop implementation: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3.1/23-hover-wide-final.png`
- Source and implementation in one comparison surface: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3.1/30-reference-comparison.png`
- Gaze comparison: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3.1/31-gaze-comparison.png`
- Hover-diffusion comparison: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/v3.1/32-hover-comparison.png`
- Additional final states: `15-awakening-final.png`, `16-waiting-final.png`, `24-closer-final.png`, `25-mobile-waiting.png`, `26-mobile-noticed.png`, and `27-tablet-waiting.png`
- Viewports: desktop 1672 × 941 px, mobile 390 × 844 px, tablet 768 × 900 px.

## Findings

- No actionable P0, P1, or P2 issue remains for the approved continuous-nebula direction.
- The supplied raster remains the visible WebGL texture. Continuous filaments, mist, membranes, black pupil ambiguity, tonal depth, and all three planet-like bodies remain recognizable; the page has not reverted to a point cloud.
- Motion is concentrated in the pupil rim and inner/middle tissue. The outer field stays comparatively anchored, so the experience reads as an organism moving rather than a wallpaper sliding.
- The source composition and typography remain intact: title, subtitle, guide position, black/silver palette, and empty-space hierarchy were not redesigned. No menu, button, card, HUD, or explanatory overlay was added.
- Desktop, tablet, and mobile layouts have no horizontal or vertical overflow. At 390 px wide the title remains within x=15.60–374.40 px.
- The Product Design image-to-code workflow influenced the implementation by treating the source image as visual truth and strengthening only coherent landmarks—pupil edge, selected fibers, and local texture response—instead of scaling or uniformly distorting the whole frame.

## Interaction Verification

- The experience starts by itself. A one-time 2.82-second awakening gathers, holds, and releases the inner organism; the sampled peak at 1.88 seconds recorded `awaken=1.000` while the page was still in `waiting`.
- Autonomous rhythm now uses a 10.4-second irregular cycle with a secondary 3.7/5.9-second micro-rhythm. Across a 520 ms idle interval, the living inner region measured 4.414/255 grayscale MAD and 22.68% of pixels changed by more than five levels; the outer-corner MAD was only 0.463/255. The inner 500 ms motion is about 86% stronger than the audited V3 baseline of 2.378/255.
- First contact keeps a perceptual delay. At 150 ms the page remained `waiting / sensing`, `hold=0.486`, and showed no guide. At 400 ms it reached `noticed / orienting`, `awareness=0.201`, and revealed `它注意到你了。`; at 900 ms the gaze had advanced to 20.36 px.
- Settled horizontal gaze reached +45.42 px and -45.90 px. The right/left comparison measured 20.648/255 MAD in the inner organism versus 1.870/255 in an outer corner, making direction readable without moving the title or the page frame.
- After the pointer rests for 800 ms, nearby tissue gathers by up to about 19 px. A segmented signal front then displaces existing texture by up to about 11 px and uses a restrained bright edge plus shadow companion to travel through fiber-like branches instead of drawing a clean circular ripple.
- In the final hover interval, the pointer-zone comparison measured 17.612/255 MAD with 50.40% of pixels changing by more than eight levels, versus 10.860/255 in the mirrored active-tissue control and 1.355/255 in the outer corner. Evidence: `21-hover-before-final.png` through `23-hover-wide-final.png` and `32-hover-comparison.png`.
- Moving near the perceived pupil enters `closer`, sets `approach=0.999`, expands the pupil edge, gathers the surrounding structure, slightly darkens the outside, and shows the exact copy `再靠近一点。`
- Desktop, mobile, and tablet runs sampled at 60 FPS. Final browser logs contained no warning or error.

## Accessibility and Resilience

- The real `prefers-reduced-motion` branch disables awakening, breath, gaze, study, approach deformation, drifting motes, and twinkle. In the reduced-motion harness, two screenshots 700 ms apart were pixel-identical; `breath=0`, `gaze=0`, `study=0`, and the live WebGL texture remained available.
- WebGL loss immediately exposes the static source artwork; restoration recreates the living renderer. The final harness reported `lost` and then `restored`, with evidence in `28-context-lost.png` and `29-context-restored.png`.
- The visual field remains `aria-hidden`, guidance uses an `aria-live` region, coarse-pointer devices retain their native cursor, and the static fallback preserves all essential visual content.

## Comparison History

- V3 P1 perceptibility issue: motion existed but was below normal viewing threshold. The 500 ms inner MAD was 2.378/255, settled gaze was roughly ±22 px, local study pull was about 3.4 px, and the propagation signal was only a faint texture tint. Fix: one-time awakening, shorter irregular rhythm, coherent pupil/middle movement, ±45 px readable gaze, and materially stronger local study response.
- First V3.1 P1 artifact: applying strong gaze through a tight planet mask created crescent and double-edge artifacts around the spheres. Evidence: `04-hover-diffusion-mid.png`. Fix: removed the sharp local suppression/parallax seam and retained only a wide, low-amplitude autonomous neighborhood drift. Final planets remain clean in `19-gaze-right.png`, `20-gaze-left.png`, and `24-closer-final.png`.
- First V3.1 P2 hover issue: the local pull was improved, but the spreading response still needed close comparison to notice. Fix: increased the coherent local attraction, widened the propagation range, broke the wave into organic branches, and added a low-contrast shadow companion so the expansion reads during normal pointer use. Final evidence: `32-hover-comparison.png`.
- Reduced-motion P2 issue found during final QA: star motes still twinkled because their intensity was time-driven outside the motion gate. Fix: froze twinkle and breath-hold shading when `uMotion=0`; the final 700 ms pixel comparison has no changed bounding box.

## Implementation Checklist

- [x] One-time living awakening on entry
- [x] Stronger irregular autonomous rhythm without whole-image motion
- [x] Faster first-contact sensing and delayed gaze
- [x] Readable asymmetric pupil and middle-fiber tracking
- [x] Obvious resting-pointer attraction and branched diffusion
- [x] Distinct `noticed` and `closer` reactions
- [x] Continuous texture, fog, and planet detail preserved
- [x] Desktop, tablet, and mobile browser checks
- [x] Reduced-motion, static fallback, context-loss, and restoration checks
- [x] Syntax, asset response, overflow, FPS, console, and same-surface visual comparisons

final result: passed
