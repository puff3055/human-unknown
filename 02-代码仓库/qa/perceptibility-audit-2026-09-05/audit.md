# Motion Perceptibility Audit — 2026-09-05

## Audit scope

- Surface: HUMAN UNKNOWN homepage / first-contact experience
- User goal: perceive an enormous living presence before and during pointer interaction
- Viewport: 1672 × 941
- Browser evidence: screenshots `01` through `07` in this directory
- Code was not changed during this audit.

## Strengths

- Source texture, fog depth, filament continuity, pupil ambiguity, and planet-like spheres remain intact.
- The state machine triggers correctly: waiting → noticed → studying → closer.
- Gaze has delay rather than attaching directly to the pointer.
- Rendering remains stable at approximately 60 FPS.

## UX risks

1. Idle motion is below perceptual threshold at normal viewing speed. Over 500ms, inner-region grayscale MAD is 2.378/255; only 12.09% of pixels move by more than five levels.
2. Gaze telemetry reaches roughly ±22px, but most displacement occurs inside a black pupil and therefore lacks a readable visual landmark. Textured middle fibers receive only 27% of that displacement.
3. Study and approach states are technically active but read primarily through copy changes. Local attraction is about 3.4px and approach deformation about 11px, too little for this image scale.
4. Distributed micro-change is not the same as coherent motion. The eye needs a moving rim, selected fiber groups, and subtle planet parallax as perceptual anchors.

## Accessibility risk

- Increasing motion may affect motion-sensitive users. Preserve the current `prefers-reduced-motion` path and keep the stronger response out of that mode.
- Screenshot evidence cannot establish complete keyboard or assistive-technology behavior; those are outside this bounded motion audit.

## Recommendation

Implement the V3.1 perceptibility proposal saved at `01-AI做的文档/07-首页动效可感知度诊断与增强方案.md`. Increase motion through coherent inner landmarks, not through a whole-image transform.
