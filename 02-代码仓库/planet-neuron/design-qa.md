# Planet Neuron Design QA

- Source visual truth: `../../00-项目参考材料/尺度世界-行星神经元/行星其实是神经元-概念图-v1.png`
- Implementation URL: `http://127.0.0.1:4183/planet-neuron/`
- Implementation screenshots: `qa/implementation-initial.png`, `qa/implementation-hover.png`, `qa/implementation-revealed.png`
- Layer evidence: `qa/layer-contact-sheet.jpg`
- Combined comparison: `qa/source-vs-revealed.png`
- Viewport: 1672 × 941 CSS px
- Source pixels: 1672 × 941
- Implementation pixels: 1672 × 941 at device scale factor 1
- Density normalization: none required
- States checked: autonomous initial planet crop, mouse sensing/dwell, signal-triggered camera retreat, stable revealed state, sound off/on

## Full-view comparison evidence

The revealed view restores the supplied concept image's full composition: main sphere position and size, outgoing violet connection, left-side signal, surrounding fiber topology, palette, and darkness remain aligned. The implementation intentionally begins at a closer crop so the sphere reads as a planet, then uses one continuous camera-scale value to arrive at this full source composition without changing scenes.

## Focused-region comparison

`qa/implementation-hover.png` was used as the focused inspection of the sphere surface. The response follows the source network layer without hard circular clipping, false transparency, rectangular raster boundaries, or additional particle decoration. `qa/layer-contact-sheet.jpg` confirms the sphere, surface network, outer fibers, activity map, and depth map were derived from the source rather than redrawn.

## Required fidelity surfaces

- **Fonts and typography:** The source has no typography. Added HUMAN UNKNOWN identity, sound control, prompt, and reveal line are intentionally small and low contrast. They remain outside the sphere's active center and do not change the image hierarchy.
- **Spacing and layout rhythm:** The initial crop makes the sphere dominant; the revealed state returns to the original full-frame proportions at 1672 × 941. UI remains within 24–35 px edge margins.
- **Colors and visual tokens:** Near-black, charcoal, muted amber, and faint violet are sampled from the source. Interactive energy uses the source's existing warm-violet signal color instead of a new accent system.
- **Image quality and asset fidelity:** `assets/source.png` is byte-identical to the supplied PNG (SHA-256 `e7cdea24e7ab5229b635e9073540db76233ade87f2feb4e748645ae553c1e808`). Derived RGBA layers have genuine alpha extrema `(0, 255)` and sit over the full source plate, preventing edge holes and sticker seams.
- **Copy and content:** Copy is limited to `靠近。停留片刻。` and `你以为那是一颗行星。`. It does not explain the neuron interpretation in advance.

## Comparison history

### Iteration 1

- **P1 finding:** The first pointer response used a hard circular clip and read like a magnifying-glass sticker.
- **Fix:** Replaced it with a soft mask, then moved the implementation to source-derived surface and depth layers.
- **Post-fix evidence:** `qa/implementation-hover.png` has no hard circle or cutout edge.

### Iteration 2

- **P1 finding:** The first annihilation treatment produced a freestanding dark ring over the image.
- **Fix:** Multiplied burst, collapse, and scar effects by the extracted activity map so they can only appear on existing network structure.
- **Post-fix evidence:** `qa/implementation-initial.png` shows the living surface without a synthetic ring.

### Iteration 3

- **P2 finding:** The pointer field still produced too much diffuse violet light and competed with the source network.
- **Fix:** Reduced the unmasked pointer contribution by roughly 70%; kept the network-specific emissive response.
- **Post-fix evidence:** `qa/implementation-hover.png` shows brighter connected lines without a dominant circular glow.

### Final pass

- No actionable P0, P1, or P2 differences remain.
- Slight global darkening, the closer initial crop, and minimal UI are intentional interaction additions.

## Browser verification

- Loaded and rendered at 1672 × 941 CSS px.
- Verified autonomous surface and fiber activity before user input.
- Verified mouse entry, network response, dwell accumulation, one main transmission, continuous camera retreat, and revealed state.
- Verified the revealed state remains stable for at least five seconds and does not retrigger merely because the pointer stayed in place.
- Verified sound OFF → ON and browser-generated sound graph initialization.
- Browser console checked with zero warnings and zero errors.

## Findings

- No remaining P0, P1, or P2 findings.
- P3: final sound balance still requires the user's real speaker/headphone judgment.

## Implementation checklist

- [x] Original image remains the visual source of truth.
- [x] Sphere, surface network, outer fibers, activity, and depth are independently controllable.
- [x] The world produces irregular autonomous conduction, bursts, annihilation, and recovery.
- [x] Mouse movement bends and energizes nearby source structure.
- [x] Dwell triggers one main signal without a click.
- [x] One continuous camera move reveals the neural scale.
- [x] Revealed world stays alive and can be re-engaged only after fresh pointer movement.
- [x] Sound is optional and controlled by a visible toggle.
- [x] Source-vs-implementation visual comparison passed.
- [x] Console is clean.

final result: passed
