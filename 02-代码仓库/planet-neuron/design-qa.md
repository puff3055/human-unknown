# Planet Neuron Design QA

- Original art direction: `../../00-项目参考材料/尺度世界-行星神经元/行星其实是神经元-概念图-v1.png`
- Selected visual target: `assets/network-master-v4.png`
- ImageGen working output: `/Users/kongxueli/.codex/generated_images/01a073f9-0077-7fc3-b39c-17049338a1be/exec-095f1a86-f001-4aeb-b87b-a1416c65a1bc.png`
- Implementation URL: `http://127.0.0.1:4183/planet-neuron/`
- Implementation screenshots: `qa/final-v4-idle-1280x720.jpg`, `qa/final-v4-hover-1280x720.jpg`, `qa/final-v4-signal-1280x720.jpg`, `qa/final-v4-remote-1280x720.jpg`, `qa/final-v4-revealed-1280x720.jpg`
- Combined comparison: `qa/final-v4-source-vs-revealed.jpg`
- Browser viewport: 1280 × 720 CSS px at device scale factor 2
- WebGL canvas: 2560 × 1440 physical pixels
- Selected master and runtime masks: 3344 × 1882
- States checked: idle life, mouse sensing/dwell, surface conduction, two-way network transmission, remote burst/annihilation, camera retreat, stable revealed state, sound off/on.

## Full-view comparison evidence

`qa/final-v4-source-vs-revealed.jpg` places the selected visual master and final browser state in equal 16:9 columns. The implementation keeps the same source composition and continuous material: the central sphere, its tapered roots, the surrounding giant fibers, and the distant sibling spheres remain one image substrate throughout. The only full-frame transform is a continuous camera retreat from 1.48× to 1×; there is no image swap or crossfade.

## Focused-state evidence

- `qa/final-v4-idle-1280x720.jpg`: the close opening makes the central body readable as a dark planet while its roots remain visible at the rim. Autonomous conduction is sparse and irregular.
- `qa/final-v4-hover-1280x720.jpg`: the actual local activity texture gathers toward the cursor, the contact point compresses, and the instruction changes to `它在回应。停住。`.
- `qa/final-v4-signal-1280x720.jpg`: the signal lights source-derived surface filaments rather than drawing a detached line.
- `qa/final-v4-remote-1280x720.jpg`: the same signal leaves the central sphere through existing roots, reaches the right sibling as a burst, and darkens the left sibling as an annihilation event.
- `qa/final-v4-revealed-1280x720.jpg`: four subordinate spherical nodes are visible in the same network, and the final sentence remains readable without covering the central connection.

## Required fidelity surfaces

- **Continuity:** central sphere, roots, remote nodes, and fiber field are sampled from one visual master plus activity/depth maps derived from that same master. There is no separate circular cutout edge or independent fiber plate.
- **Depth:** a depth map drives subtle pointer parallax while the camera performs one slow Z-axis retreat. Foreground roots, distant nodes, smoke, and negative spaces preserve scale without a scene cut.
- **Life rhythm:** the page always has low-amplitude conduction. Ambient events use uneven scheduling and alternate between bloom, collapse, darkness, and recovery; they are localized to the existing substrate instead of being a generic particle layer.
- **Mouse causality:** moving across the central sphere gathers nearby filaments; resting for about one second closes the ring and starts a single network transmission. No click or repeated collection is required.
- **Copy:** the opening premise is `你以为那是一颗行星。`; the instruction explicitly teaches movement and then dwelling; the final line is `直到它把你的触碰传向下一颗——你刚刚参与的，也许只是一次念头。`. The answer is withheld until the scale reveal.
- **Sound:** optional Web Audio adds a quiet substrate, contact filtering, a moving transmission tone, camera-retreat resonance, and spatially separated remote responses. Sound is user-enabled from the visible top-right control.
- **Sharpness:** all three runtime textures are 3344 × 1882 and the tested WebGL canvas is rendered at 2× display density. Final screenshots retain fine branching detail without enlarging the original 1672 × 941 raster directly.
- **Scope:** desktop browser and mouse only, as approved. Mobile, touch, keyboard equivalence, reduced motion, legacy-browser support, and a non-WebGL fallback were not added or reviewed.

## Comparison history

### Integrated substrate

- **Prior P1 — sphere and threads read as separate masks, and the reveal showed only one node.**
- **Fix:** replaced the independently composited v3 plates with one generated high-resolution network master containing the central sphere, seamless tapered roots, shared branching material, nebula depth, and four distant sibling nodes. Activity and depth masks are derived from the same pixels.
- **Post-fix evidence:** `qa/final-v4-idle-1280x720.jpg` and `qa/final-v4-revealed-1280x720.jpg`.

### Interaction and narrative completion

- **Prior P1 — `你以为那是一颗行星。` could read like the ending, and the mouse action was not discoverable.**
- **Fix:** added the initial instruction `移动鼠标，寻找会回应你的纹路。`, the hover/dwell confirmation `它在回应。停住。`, a visible dwell trace, transmission status, and the complete reveal sentence.
- **Post-fix evidence:** `qa/final-v4-idle-1280x720.jpg`, `qa/final-v4-hover-1280x720.jpg`, and `qa/final-v4-revealed-1280x720.jpg`.

### Signal refinement

- **First v4 P2 — a geometric vector corridor briefly read as a laser over the image.**
- **Fix:** retained the route timing but multiplied it by the source-derived activity texture so only real fibers illuminate; arrival responses now occur on two distant nodes.
- **Post-fix evidence:** `qa/final-v4-signal-1280x720.jpg` and `qa/final-v4-remote-1280x720.jpg`.

## Browser verification

- Loaded all three runtime textures with HTTP 200 responses.
- Verified 1280 × 720 CSS viewport with a 2560 × 1440 WebGL canvas.
- Verified idle, mouse movement, one-second dwell, signal propagation, remote response, camera retreat, stable reveal, re-trigger, and sound OFF → ON.
- Browser console checked with zero warnings and zero errors.
- JavaScript syntax checks and `git diff --check` passed.

## Findings

- No remaining P0, P1, or P2 finding.
- P3: sound balance remains subjective and should be checked on the presentation speakers or headphones.

final result: passed
