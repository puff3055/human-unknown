import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const machineSource = await fs.readFile(
  new URL('../encounter-machine.js', import.meta.url),
  'utf8'
);
const fakeWindow = {};
vm.runInNewContext(machineSource, {
  window: fakeWindow,
  performance: { now: () => 0 },
  Math,
  Object,
});

const {
  COPY_SEQUENCE,
  STANDARD_TIMING,
  REDUCED_TIMING,
  resolveContactActive,
  EncounterMachine,
} = fakeWindow.HumanUnknownEncounter;

assert.deepEqual(
  Array.from(COPY_SEQUENCE),
  ['在这里', '对，在这里', '它注意到你了', '放入你的眼睛'],
  'the four approved lines and their order are exact'
);
assert.equal(STANDARD_TIMING.titleMinReadMs, 4000);
assert.equal(STANDARD_TIMING.holdMs, 1400);
assert.equal(STANDARD_TIMING.contactReadMs, 3200);
assert.equal(STANDARD_TIMING.nearReadMs, 3200);
assert.equal(STANDARD_TIMING.noticedReadMs, 3600);
assert.equal(STANDARD_TIMING.alignedReadMs, 3200);
assert.ok(STANDARD_TIMING.revealMs >= 3000 && STANDARD_TIMING.revealMs <= 4000);
assert.ok(STANDARD_TIMING.boundaryEndMs - STANDARD_TIMING.boundaryStartMs >= 200);
assert.equal(resolveContactActive({ inputType: 'touch', touchActive: true }), true);
assert.equal(resolveContactActive({ inputType: 'touch', touchActive: false }), false);
assert.equal(resolveContactActive({ inputType: 'pen', touchActive: false }), false);
assert.equal(resolveContactActive({ keyboardActive: true }), true);
assert.equal(
  resolveContactActive({ inputType: 'mouse', hasMoved: true, pointerInside: true }),
  true
);

function advance(machine, from, to, input, step = 40) {
  let state = machine.getState(from);
  for (let now = from + step; now < to; now += step) {
    state = machine.update(now, input);
  }
  return machine.update(to, input);
}

const still = new EncounterMachine();
still.start(0);
let stillState = still.update(60000, { outer: false, core: false, active: false });
assert.equal(stillState.phase, 'opening', 'no input cannot finish the title or story');
assert.equal(stillState.intro, 'title-hold');
assert.equal(stillState.guide, '');

const machine = new EncounterMachine();
machine.start(0);
let state = machine.update(STANDARD_TIMING.blackoutMs - 1);
assert.equal(state.intro, 'blackout');
assert.equal(state.reveal, 0);

state = machine.update(STANDARD_TIMING.blackoutMs + 200);
assert.equal(state.intro, 'revealing');
assert.ok(state.reveal > 0 && state.reveal < 1);
machine.markIntent(900);

const titleFullyVisibleAt = STANDARD_TIMING.blackoutMs
  + STANDARD_TIMING.revealMs
  + STANDARD_TIMING.titleInMs;
state = machine.update(titleFullyVisibleAt + STANDARD_TIMING.titleMinReadMs - 1);
assert.equal(state.phase, 'opening', 'intent cannot cut short the four-second title hold');
assert.equal(state.intro, 'title-hold');

const contactAt = titleFullyVisibleAt + STANDARD_TIMING.titleMinReadMs;
state = machine.update(contactAt);
assert.equal(state.phase, 'contact');
assert.equal(state.intro, 'dissolving');
assert.equal(state.guide, '在这里');
assert.ok(state.titleReadableFor >= 4000);

const contactReadableAt = contactAt + STANDARD_TIMING.guideEnterMs;
state = machine.update(contactReadableAt + STANDARD_TIMING.contactReadMs - 1, {
  outer: true,
  core: false,
  active: true,
});
assert.equal(state.phase, 'contact', 'outer entry cannot skip the first line read time');

const nearAt = contactReadableAt + STANDARD_TIMING.contactReadMs;
state = machine.update(nearAt, { outer: true, core: false, active: true });
assert.equal(state.phase, 'near');
assert.equal(state.guide, '对，在这里');

const noticedNoSoonerThan = nearAt
  + STANDARD_TIMING.guideSwapMs
  + STANDARD_TIMING.guideEnterMs
  + STANDARD_TIMING.nearReadMs;

const releasedNearTouch = new EncounterMachine();
releasedNearTouch.start(0);
releasedNearTouch.markIntent(900);
releasedNearTouch.update(contactAt);
releasedNearTouch.update(nearAt, { outer: true, core: false, active: true });
let releasedTouchState = advance(
  releasedNearTouch,
  nearAt,
  nearAt + 200,
  { outer: true, core: false, active: true }
);
const outerDwellBeforeRelease = releasedTouchState.outerDwell;
releasedTouchState = advance(
  releasedNearTouch,
  nearAt + 200,
  noticedNoSoonerThan + 1000,
  {
    outer: true,
    core: false,
    active: resolveContactActive({ inputType: 'touch', touchActive: false }),
  }
);
assert.equal(
  releasedTouchState.phase,
  'near',
  'released touch cannot advance from near while its last coordinate remains in the hotzone'
);
assert.ok(releasedTouchState.outerDwell < outerDwellBeforeRelease);

state = advance(
  machine,
  nearAt,
  noticedNoSoonerThan,
  { outer: true, core: false, active: true }
);
assert.equal(state.phase, 'noticed');
assert.equal(state.guide, '它注意到你了');
assert.equal(state.noticeSerial, 1, 'the noticing response fires exactly once');

const releasedNoticedTouch = new EncounterMachine();
releasedNoticedTouch.start(0);
releasedNoticedTouch.markIntent(900);
releasedNoticedTouch.update(contactAt);
releasedNoticedTouch.update(nearAt, { outer: true, core: false, active: true });
advance(
  releasedNoticedTouch,
  nearAt,
  noticedNoSoonerThan,
  { outer: true, core: false, active: true }
);
releasedTouchState = advance(
  releasedNoticedTouch,
  noticedNoSoonerThan,
  noticedNoSoonerThan + 240,
  { outer: true, core: true, active: true }
);
const coreDwellBeforeRelease = releasedTouchState.coreDwell;
releasedTouchState = advance(
  releasedNoticedTouch,
  noticedNoSoonerThan + 240,
  noticedNoSoonerThan
    + STANDARD_TIMING.guideSwapMs
    + STANDARD_TIMING.guideEnterMs
    + STANDARD_TIMING.noticedReadMs
    + 1000,
  {
    outer: true,
    core: true,
    active: resolveContactActive({ inputType: 'touch', touchActive: false }),
  }
);
assert.equal(
  releasedTouchState.phase,
  'noticed',
  'released touch cannot advance from noticed while its last coordinate remains in the core'
);
assert.ok(releasedTouchState.coreDwell < coreDwellBeforeRelease);

state = advance(
  machine,
  noticedNoSoonerThan,
  noticedNoSoonerThan
    + STANDARD_TIMING.guideSwapMs
    + STANDARD_TIMING.guideEnterMs
    + STANDARD_TIMING.noticedReadMs
    - 1,
  { outer: true, core: true, active: true }
);
assert.equal(state.phase, 'noticed', 'core entry cannot skip the noticing line');

const alignedAt = noticedNoSoonerThan
  + STANDARD_TIMING.guideSwapMs
  + STANDARD_TIMING.guideEnterMs
  + STANDARD_TIMING.noticedReadMs;
state = advance(
  machine,
  alignedAt - 1,
  alignedAt,
  { outer: true, core: true, active: true }
);
assert.equal(state.phase, 'aligned');
assert.equal(state.guide, '放入你的眼睛');

state = advance(
  machine,
  alignedAt,
  alignedAt + 700,
  { outer: true, core: true, active: true }
);
assert.ok(state.hold > 0.42 && state.hold < 0.58);
const holdBeforeLeave = state.hold;
state = advance(
  machine,
  alignedAt + 700,
  alignedAt + 1000,
  { outer: false, core: false, active: false }
);
assert.ok(state.hold > 0, 'leaving the core rolls hold back instead of clearing it');
assert.ok(state.hold < holdBeforeLeave);
assert.equal(state.phase, 'aligned');

const resumeAt = alignedAt + 1000;
const entryGateAt = alignedAt
  + STANDARD_TIMING.guideSwapMs
  + STANDARD_TIMING.guideEnterMs
  + STANDARD_TIMING.alignedReadMs;
state = advance(
  machine,
  resumeAt,
  entryGateAt,
  { outer: true, core: true, active: true }
);
assert.equal(state.phase, 'entering');
assert.equal(state.hold, 1);
const enteringAt = machine.entryStartedAt;

state = advance(
  machine,
  entryGateAt,
  enteringAt + STANDARD_TIMING.entryPauseMs - 1,
  { outer: true, core: true, active: true }
);
assert.equal(state.zoom, 0, 'entry begins with a short stillness before the forward move');

const zoomSamples = [];
let previousZoomOffset = STANDARD_TIMING.entryPauseMs - 1;
let boundarySample = null;
[
  STANDARD_TIMING.entryPauseMs,
  1200,
  2200,
  3200,
  STANDARD_TIMING.boundaryStartMs + 35,
  STANDARD_TIMING.entryMs - 120,
].forEach((offset) => {
  state = advance(
    machine,
    enteringAt + previousZoomOffset,
    enteringAt + offset,
    { outer: true, core: true, active: true }
  );
  zoomSamples.push(state.zoom);
  if (offset === STANDARD_TIMING.boundaryStartMs + 35) boundarySample = state;
  previousZoomOffset = offset;
});
for (let index = 1; index < zoomSamples.length; index += 1) {
  assert.ok(
    zoomSamples[index] >= zoomSamples[index - 1],
    'pupil zoom must never reverse during entry'
  );
}
assert.ok(zoomSamples.at(-1) > 0.99);
assert.ok(boundarySample.zoom > 0.97);
assert.ok(boundarySample.boundarySilence > 0.95);

state = advance(
  machine,
  enteringAt + STANDARD_TIMING.entryMs - 120,
  enteringAt + STANDARD_TIMING.entryMs,
  { outer: true, core: true, active: true }
);
assert.equal(state.phase, 'handoff');
assert.equal(state.handoff, true);
assert.equal(state.entry, 1);

const reduced = new EncounterMachine({ reducedMotion: true });
reduced.start(0);
reduced.markIntent(1);
const reducedTitleAt = REDUCED_TIMING.blackoutMs
  + REDUCED_TIMING.revealMs
  + REDUCED_TIMING.titleInMs;
const reducedState = reduced.update(reducedTitleAt + REDUCED_TIMING.titleMinReadMs);
assert.equal(reducedState.phase, 'contact');
assert.equal(reducedState.reducedMotion, true);
assert.equal(reducedState.titleMinReadMs, 4000, 'reduced motion preserves reading time');
assert.equal(REDUCED_TIMING.alignedReadMs, 3200, 'reduced motion preserves narration reading time');
assert.ok(REDUCED_TIMING.entryMs < STANDARD_TIMING.entryMs);
assert.equal(
  REDUCED_TIMING.boundaryEndMs - REDUCED_TIMING.boundaryStartMs,
  200,
  'reduced motion keeps the near-silent boundary but shortens spatial motion'
);

const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
const appSource = await fs.readFile(new URL('../app.js', import.meta.url), 'utf8');
const style = await fs.readFile(new URL('../style.css', import.meta.url), 'utf8');
const nebulaSource = await fs.readFile(new URL('../living-nebula.js', import.meta.url), 'utf8');

assert.match(html, /data-intro="blackout"/);
assert.match(html, /data-phase="opening"/);
assert.match(html, /encounter-machine\.js\?v=4\.1\.0-rc\.1/);
assert.match(html, /id="soundPrompt"[^>]*>\s*轻触开启声音/);
assert.match(appSource, /pointerup/);
assert.match(appSource, /pointercancel/);
assert.match(appSource, /humanunknown:homepage-exit/);
assert.match(appSource, /--contact-hold/);
assert.match(appSource, /--contact-pull/);
assert.match(appSource, /--hotzone-cue/);
assert.match(appSource, /1 \+ nextState\.hold \* 0\.05 \+ zoom \* 3\.55/);
assert.doesNotMatch(appSource, /1 - collapse \* 0\.17 \+ fall/);
assert.match(appSource, /version: '4\.1'/);
assert.match(style, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(style, /data-intro="dissolving"/);
assert.match(style, /\.guide\s*\{[\s\S]*?top: 34\.5vh;/);
assert.match(style, /\.cosmos::after/);
assert.match(style, /opacity: var\(--hotzone-cue\)/);
assert.doesNotMatch(nebulaSource, /narrativeScale|collapseFrame|narrativeMask/);
assert.match(nebulaSource, /vec2 narrativeUv = vUv;/);
assert.match(nebulaSource, /state\.zoom \|\| 0/);

console.log('homepage v4.1 contract: passed');
