# EYE MULTIVERSE v0.7｜Build Gate

- Source visual truth: `/Users/kongxueli/.codex/generated_images/01a0738b-f23a-7cb3-829d-9f31c611c3c2/exec-630d4f83-81dc-420a-a2b8-0d03e3412e3e.png` (2048 × 1152).
- Implementation screenshot: `/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/eye-multiverse-v0.7/01-initial.png` (1672 × 941).
- CSS viewport: 1672 × 941 desktop; screenshot density: 1.
- State coverage: initial, branch locked, splitting, connected, eight-result family field.
- Full-view comparison: `02-代码仓库/qa/eye-multiverse-v0.7/06-side-by-side.png`; source normalized to the same 1672 × 941 aspect before comparison.
- Focused comparison: `02-代码仓库/qa/eye-multiverse-v0.7/07-ui-focus.png`; required because the compact 8–13px voice UI is too small to judge in the full view.
- Detailed report: `02-代码仓库/qa/eye-multiverse-v0.7/design-qa.md`.

## Findings

- No remaining actionable P0/P1/P2 findings.
- Fonts/typography: thin weights, expanded tracking and three-level hierarchy match the HUMAN UNKNOWN target. The smaller one-line voice copy is an intentional, user-confirmed change from the source.
- Spacing/layout: left hero eye, right depth pair, top metadata and bottom voice rail retain the selected composition. At eight results, partial offscreen eyes do not cover persistent controls.
- Colors/tokens: black, desaturated violet and gray-white remain consistent. Large dark regions, clustered stars and nebula replace uniform dense points by user request.
- Image quality: every eye uses the supplied source-derived raster. Runtime depth softening changes far eyes without changing or redrawing the asset; no square cutout edge or circular blink plate is visible.
- Copy/content: “听见了 → 正在分裂 → 新世界已回应” covers acknowledgement, progress and completion without PPT-like stage labels.
- Icons/states: Tabler mic and volume assets remain intact. Sound `off → on → off`, `aria-pressed`, button labels, focus treatment, visible cursor and reduced-motion timing were checked.
- Responsiveness: mobile was intentionally excluded by the user's current scope; the desktop viewport is stable.

## Comparison history

- P1: first pass was still too close to pure black (`history-01-too-dark.png`). Fixed by strengthening large-scale cloud, fold and dust fields; verified in `01-initial.png`.
- P2: a child could cross the top-right counter (`history-02-header-overlap.png`). Fixed with header and voice-dock safe-area penalties; verified in `04-connected.png`.
- P2: dense branching could overlap nearby spheres too deeply (`history-03-crowded.png`). Fixed with projected-gap weighting and overlap penalties; verified in `05-family-8.png`.

## Verification

- Primary interactions tested: voice demo acknowledgement, mother lock, split, permanent connection, eight queued splits, sound toggle.
- Browser console: zero warnings/errors.
- Static contract, JavaScript syntax and whitespace checks: passed.
- Real microphone permission, accents, environmental noise and subjective sound mix remain device-side checks; they are not represented as automated passes.

final result: passed
