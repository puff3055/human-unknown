# Planet Neuron Recursive Scale — Design QA

- Approved recursive visual: `/Users/kongxueli/.codex/generated_images/01a073f9-0077-7fc3-b39c-17049338a1be/exec-9be10d7d-0bce-435e-a146-04970d718409.png`
- Runtime master: `assets/recursive-master-v1.png`
- Runtime masks: `assets/recursive-activity-v1.png`, `assets/recursive-depth-v1.png`
- Implementation URL: `http://127.0.0.1:4183/planet-neuron/`
- Browser viewport: 1280 × 720 CSS px; WebGL canvas: 2560 × 1440 physical px
- Runtime textures: 3344 × 1882
- Combined comparison: `qa/recursive-source-vs-implementation.jpg`
- State captures: `qa/recursive-idle-1280x720.jpg`, `qa/recursive-hover-1280x720.jpg`, `qa/recursive-click-1280x720.jpg`, `qa/recursive-signal-1280x720.jpg`, `qa/recursive-mid-dive-1280x720.jpg`, `qa/recursive-level-02-1280x720.jpg`
- Chinese scale-control reference: `qa/scale-control-chinese-reference.png`
- Chinese scale-control comparison: `qa/scale-control-chinese-source-vs-implementation.jpg`
- Chinese scale-control captures: `qa/scale-control-chinese-idle-1280x720.jpg`, `qa/scale-control-chinese-drag-1280x720.jpg`, `qa/scale-control-chinese-auto-dive-1280x720.jpg`, `qa/scale-control-chinese-level-02-1280x720.jpg`

## Visual comparison

`qa/recursive-source-vs-implementation.jpg` places the approved recursive master and the browser idle state in the same 16:9 comparison. The implementation keeps the parent-scale arcs, central planet-neuron, child node, smaller continuation, and shared violet conduit. The browser crop is intentionally 1.16× closer so the first read is “planet”, while the connected children remain visible enough to foreshadow recursion.

The sphere and all fibers are sampled from one master substrate. Activity and depth maps were derived from the same pixels, so hover, parallax, signals, bursts, and annihilations do not create a detached cutout or sticker edge.

## Interaction verification

- **Idle:** sparse, irregular conduction and localized burst/collapse events continue without input; there is no uniform breathing loop or generic particle field.
- **Pointer:** moving over a living node warps and lights the real nearby network texture. Moving over empty space does not trigger the same response.
- **Click:** a click on any planet-like node immediately compresses the local field, creates a bright burst, releases one signal along the existing conduit, then licenses the camera dive.
- **Scale:** wheel/two-finger scroll continuously changes Z depth in either direction. The camera transform travels from the current hero node toward its child.
- **Visible scale control:** the right-side Chinese rail exposes the same continuous depth variable. Dragging the rail moves freely; `靠近＋` and `远离－` move to the adjacent integer scale. The thumb and `尺度 NN` label also follow a click-driven automatic dive.
- **Manual takeover:** touching the scale rail during an automatic dive cancels the scripted motion and gives the user immediate direct control without starting another scene.
- **Recursion:** near the end of each depth cycle, the child region is remapped to the same high-resolution hero structure. Crossing the scale boundary returns to an aligned, visually identical node instead of swapping to another scene. Two consecutive click-driven cycles were verified (`SCALE 01 → 02 → 03`).
- **Copy:** opening: `你以为那是一颗行星。`; first recursive boundary: `靠近，没有使它变小。`; second boundary: `尺度改变了。它没有。` The prompt explicitly teaches scroll and click.
- **Sound:** OFF → ON was verified. Pointer energy changes the filtered texture; clicking adds an impact and moving transmission; scale motion changes spectral energy; crossing a boundary folds the tone from high to low instead of playing a repeated notification sound.

## Findings and fixes

### P1 — prior page ended after one reveal

- **Finding:** the previous implementation revealed a wider network once, but did not let the user continue through micro/macro scales.
- **Fix:** replaced the fixed reveal state with an unbounded logical depth, reversible wheel navigation, and a click-driven one-level dive. The same node hierarchy can repeat across multiple levels.
- **Evidence:** `qa/recursive-level-02-1280x720.jpg` plus browser verification through `SCALE 03`.

### P1 — fixed image could still read as a presentation slide

- **Finding:** a static full-frame visual did not demonstrate that the sphere and fibers share one living material.
- **Fix:** added source-masked local gathering, depth-dependent parallax, irregular conduction, localized burst/annihilation, moving signal transmission, and continuous Z motion to the child node.
- **Evidence:** hover, click, signal, and mid-dive captures listed above.

### P2 — recursive transition could expose the lower-resolution child

- **Finding:** enlarging the painted child alone becomes soft near the cycle boundary.
- **Fix:** during the final 30% of the continuous camera move, the child coordinates are progressively replaced with an exactly aligned sample of the 2× hero master; a source-masked seam glow hides the substitution without a full-frame crossfade.
- **Evidence:** final `SCALE 02` state is as sharp as the initial state; no visible frame cut was found.

### P1 — wheel-only scale navigation was hard to discover

- **Finding:** the main narrative mechanic existed, but a user without a mouse wheel or without reading the prompt had no visible way to understand or control distance.
- **Fix:** added a persistent right-center Chinese scale control matching the selected mock: `靠近＋`, a hairline rail with sparse ticks and luminous thumb, live `尺度 NN`, and `远离－`. It controls the existing depth system rather than adding a separate navigation mode.
- **Evidence:** `qa/scale-control-chinese-source-vs-implementation.jpg` and continuous drag verification from `尺度 01` to `尺度 04`.

### P2 — stepped buttons could leave the label one level behind

- **Finding:** the eased depth approached an integer asymptotically, so the numeric value could visually arrive while `Math.floor` still reported the preceding level.
- **Fix:** snap `state.depth` exactly to `state.targetDepth` once the remaining delta is below the animation threshold.
- **Evidence:** browser verification confirms `靠近＋` ends at value `1`, `尺度 02`, `SCALE 02`; `远离－` returns to value `0`, `尺度 01`, `SCALE 01`.

## Browser and code verification

- All three recursive runtime assets returned HTTP 200.
- Idle, hover, click compression, signal propagation, mid-dive, first boundary, second boundary, free inward scroll, free outward scroll, continuous rail drag, both stepped scale buttons, manual takeover during automatic dive, and sound OFF → ON were exercised in the in-app browser.
- Browser console: zero warnings, zero errors.
- JavaScript syntax and `git diff --check`: passed.
- Scope remains desktop browser and mouse/trackpad only. No mobile, touch, keyboard, reduced-motion, legacy-browser, low-performance, or no-WebGL path was added.

## Final result

No remaining P0, P1, or P2 finding.

P3: sound balance should still be checked once on the actual presentation speakers or headphones.

final result: passed
