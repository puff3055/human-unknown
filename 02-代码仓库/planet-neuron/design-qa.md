# Planet Neuron Design QA

- Source visual truth: `../../00-项目参考材料/尺度世界-行星神经元/行星其实是神经元-概念图-v1.png`
- Implementation URL: `http://127.0.0.1:4183/planet-neuron/`
- Implementation screenshots: `qa/final-idle-1280x720.jpg`, `qa/final-hover-1280x720.jpg`, `qa/final-signal-1280x720.jpg`, `qa/final-revealed-1280x720.jpg`
- Combined comparison: `qa/final-source-vs-revealed.jpg`
- Layer evidence: `qa/layer-contact-sheet-v3.jpg`
- Browser viewport: 1280 × 720 CSS px at device scale factor 2
- WebGL canvas: 2560 × 1440 physical pixels
- Source pixels: 1672 × 941
- Runtime textures: background/fibers 3344 × 1882; planet/surface/masks 2048 × 2048
- Density normalization: the combined comparison displays both source and implementation in equal 16:9 columns; the implementation is captured at its CSS viewport and rendered internally at 2× density.
- States checked: idle life, mouse sensing/dwell, boundary-crossing signal, continuous camera retreat, stable revealed state, sound off/on.

## Full-view comparison evidence

`qa/final-source-vs-revealed.jpg` places the supplied concept and the final revealed state in one browser capture. The implementation preserves the source's near-black palette, central spherical subject, warm branching surface network, violet conduction route, surrounding giant fibers, quiet negative space, and non-anatomical tone. The revealed sphere is intentionally smaller than in the source so the scale reversal is legible; the left-side source signal is intentionally withheld so the single user-triggered rightward signal remains the only causal event.

## Focused-region comparison evidence

`qa/layer-contact-sheet-v3.jpg` inspects the generated planet, emissive surface, and separated fiber layers against black, white, and checker backgrounds. The sphere has a real alpha edge without a rectangular plate, gray matte, or colored halo. `qa/final-hover-1280x720.jpg` confirms that the cursor response remains attached to the source-derived surface network rather than appearing as an unrelated circular effect.

## Required fidelity surfaces

- **Fonts and typography:** The source has no typography. Added identity, sound control, instruction, and reveal line use Helvetica/PingFang for utility text and Songti/STSong for the two narrative lines. Small optical weights, wide tracking, and low contrast keep them outside the main visual hierarchy; no wrapping or truncation occurs at the tested desktop viewport.
- **Spacing and layout rhythm:** The sphere remains centered with clear negative space around its silhouette. Utility UI stays inside 24–35 px edge margins; narrative copy is centered 35 px from the bottom and does not overlap the sphere.
- **Colors and visual tokens:** Near-black, charcoal, muted amber, and violet remain aligned with the source. Pointer and signal states reuse those colors instead of introducing generic neon particles or interface chrome.
- **Image quality and asset fidelity:** The supplied image remains the art-direction reference, while the runtime uses a true clean background plate plus independent 2K planet and surface layers. Far, middle, near, planet, activity, and depth textures are separately sampled. The browser renders at 2× density; no full-frame source raster is enlarged behind the interaction. The final captures show crisp cracks, a clean circular edge, separated depth planes, and no pasted-image rectangle.
- **Copy and content:** Visible copy is limited to `靠近。停留片刻。` and `你以为那是一颗行星。`. It does not reveal the neuron interpretation before the scale change.
- **Icons:** The only icon is the three-bar sound state, implemented consistently with the restrained utility typography and verified in OFF and ON states.
- **States and interactions:** Mouse proximity gathers and redirects nearby surface energy; roughly one second of dwell triggers the same signal across the surface and beyond the rim; the camera then retreats once and leaves a faint structural connection in the revealed state. Autonomous conduction, localized burst, annihilation, and recovery remain active without input.
- **Scope note:** Mobile, touch, keyboard equivalence, reduced-motion behavior, legacy-browser support, and non-WebGL fallback were not reviewed because the current user-approved deliverable is desktop browser plus mouse only.

## Comparison history

### Earlier implementation

- **P1 — Full-frame plate remained visible:** The whole concept image was still the main background, while extracted layers only added light. This made the page read as a blurred PPT image rather than a layered living scene.
- **Fix:** Generated a clean background plate with the sphere and signal removed, generated a real transparent planet cutout, rebuilt far/middle/near fiber separation, and rendered the planet independently at 2048 × 2048.
- **Post-fix evidence:** `qa/final-idle-1280x720.jpg` and `qa/layer-contact-sheet-v3.jpg` show a clean silhouette, distinct depth planes, and no opaque image plate.

### Signal refinement

- **P2 — Moving signal read as an isolated dot:** The first rebuilt pass showed a small bright head without enough causal tail, and the final sphere appeared disconnected from the network.
- **Fix:** Extended the signal into a curved core, wake, and halo; retained a dim version of the same route after the reveal.
- **Post-fix evidence:** `qa/final-signal-1280x720.jpg` shows a continuous violet transmission beyond the rim; `qa/final-revealed-1280x720.jpg` shows the node still connected to the larger fiber field.

### Final comparison

- No actionable P0, P1, or P2 finding remains.
- Intentional deviations from the static source are limited to a closer opening scale, a smaller revealed scale, stronger native sharpness, removed left-side pre-existing signal, and minimal interaction copy. Each deviation directly supports the one-action scale reversal.

## Browser verification

- Loaded all seven runtime textures with HTTP 200 responses.
- Verified 1280 × 720 CSS viewport with a 2560 × 1440 WebGL canvas.
- Verified idle life, mouse proximity, dwell charge, signal transmission, camera retreat, stable revealed state, and sound OFF → ON.
- Browser console checked with zero warnings and zero errors.
- JavaScript syntax checks and `git diff --check` passed.

## Findings

- No remaining P0, P1, or P2 findings.
- P3: sound balance still needs subjective review on the user's own speakers or headphones.

## Implementation checklist

- [x] Original concept remains the visual direction.
- [x] Planet and background are genuinely independent layers.
- [x] Runtime textures remain sharp at a 2× desktop canvas.
- [x] The world has irregular autonomous conduction, bursts, annihilation, and recovery.
- [x] Mouse proximity produces a continuous local response.
- [x] One dwell triggers one boundary-crossing signal and one scale reversal.
- [x] Revealed state remains alive and visibly connected.
- [x] Console and asset loading are clean.

final result: passed
