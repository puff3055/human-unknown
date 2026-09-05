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
  ['在这里', '它注意到你了', '放入你的眼睛'],
  'the three approved lines and their order are exact'
);
assert.doesNotMatch(machineSource, /对，在这里/);
assert.equal(STANDARD_TIMING.titleMinReadMs, 4000);
assert.equal(STANDARD_TIMING.holdMs, 3000, 'the gaze countdown lasts three seconds');
assert.equal(STANDARD_TIMING.contactReadMs, 1600);
assert.equal(STANDARD_TIMING.nearReadMs, 1600);
assert.equal(STANDARD_TIMING.noticedReadMs, 2000);
assert.equal(STANDARD_TIMING.alignedReadMs, 1800);
assert.equal(STANDARD_TIMING.alignedExitMs, 550);
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

const OUTER_ACTIVE = Object.freeze({ outer: true, core: false, active: true });
const CORE_ACTIVE = Object.freeze({ outer: true, core: true, active: true });
const CORE_INACTIVE = Object.freeze({ outer: true, core: true, active: false });
const AWAY = Object.freeze({ outer: false, core: false, active: false });

function advance(machine, from, to, input, step = 20) {
  let state = machine.getState(from);
  for (let now = from + step; now < to; now += step) {
    state = machine.update(now, input);
  }
  return machine.update(to, input);
}

function advanceUntil(machine, from, predicate, input, maxDuration = 12000, step = 20) {
  let now = from;
  let state = machine.getState(now);
  while (!predicate(state) && now < from + maxDuration) {
    now += step;
    state = machine.update(now, input);
  }
  assert.ok(predicate(state), `state predicate was not reached by ${now}ms`);
  return { state, now };
}

const titleFullyVisibleAt = STANDARD_TIMING.blackoutMs
  + STANDARD_TIMING.revealMs
  + STANDARD_TIMING.titleInMs;
const contactAt = titleFullyVisibleAt + STANDARD_TIMING.titleMinReadMs;

function reachNear(machine) {
  machine.start(0);
  machine.markIntent(900);
  let state = machine.update(contactAt);
  assert.equal(state.phase, 'contact');
  const firstGuideReadableAt = state.guideReadableAt;
  const nearAt = firstGuideReadableAt + STANDARD_TIMING.contactReadMs;
  state = machine.update(nearAt, OUTER_ACTIVE);
  assert.equal(state.phase, 'near');
  assert.equal(state.guide, '在这里');
  assert.equal(
    state.guideReadableAt,
    firstGuideReadableAt,
    'the internal near phase cannot restart or replace the first narration line'
  );
  return { state, now: nearAt };
}

function reachAligned(machine) {
  const near = reachNear(machine);
  const noticed = advanceUntil(
    machine,
    near.now,
    (state) => state.phase === 'noticed',
    OUTER_ACTIVE
  );
  assert.equal(noticed.state.guide, '它注意到你了');
  assert.equal(noticed.state.noticeSerial, 1);
  const aligned = advanceUntil(
    machine,
    noticed.now,
    (state) => state.phase === 'aligned',
    CORE_ACTIVE
  );
  assert.equal(aligned.state.guide, '放入你的眼睛');
  return aligned;
}

function reachCountdownReady(machine) {
  const aligned = reachAligned(machine);
  const readEndsAt = aligned.state.guideReadableAt + STANDARD_TIMING.alignedReadMs;
  let state = advance(machine, aligned.now, readEndsAt - 1, CORE_ACTIVE);
  assert.equal(state.hold, 0, 'core dwell before the final line ends counts for nothing');
  assert.equal(state.countdownState, 'waiting');
  assert.equal(state.finalGuideReadComplete, false);

  state = machine.update(readEndsAt, CORE_ACTIVE);
  assert.equal(state.finalGuideReadComplete, true);
  assert.equal(state.finalGuideComplete, false);
  assert.equal(state.guideExit, 0, 'the final line starts fading only after its read time');
  assert.equal(state.hold, 0);

  const fadeMidpoint = readEndsAt + STANDARD_TIMING.alignedExitMs / 2;
  state = advance(machine, readEndsAt, fadeMidpoint, CORE_ACTIVE);
  assert.ok(state.guideExit > 0.45 && state.guideExit < 0.55);
  assert.equal(state.countdownState, 'waiting');
  assert.equal(state.hold, 0, 'the guide fade cannot leak time into the countdown');

  const countdownReadyAt = readEndsAt + STANDARD_TIMING.alignedExitMs;
  state = advance(machine, fadeMidpoint, countdownReadyAt, CORE_INACTIVE);
  assert.equal(state.finalGuideComplete, true);
  assert.equal(state.countdownReady, true);
  assert.equal(state.countdownState, 'ready');
  assert.equal(state.hold, 0);
  return { state, now: countdownReadyAt };
}

const still = new EncounterMachine();
still.start(0);
let state = still.update(60000, AWAY);
assert.equal(state.phase, 'opening', 'no input cannot finish the title or story');
assert.equal(state.intro, 'title-hold');
assert.equal(state.guide, '');

const opening = new EncounterMachine();
opening.start(0);
state = opening.update(STANDARD_TIMING.blackoutMs - 1);
assert.equal(state.intro, 'blackout');
assert.equal(state.reveal, 0);
state = opening.update(STANDARD_TIMING.blackoutMs + 200);
assert.equal(state.intro, 'revealing');
assert.ok(state.reveal > 0 && state.reveal < 1);
opening.markIntent(900);
state = opening.update(contactAt - 1);
assert.equal(state.phase, 'opening', 'intent cannot cut short the four-second title hold');
state = opening.update(contactAt);
assert.equal(state.phase, 'contact');
assert.equal(state.guide, '在这里');
assert.ok(state.titleReadableFor >= 4000);

const releasedNearTouch = new EncounterMachine();
const nearTouch = reachNear(releasedNearTouch);
state = advance(releasedNearTouch, nearTouch.now, nearTouch.now + 220, OUTER_ACTIVE);
const outerDwellBeforeRelease = state.outerDwell;
state = advance(
  releasedNearTouch,
  nearTouch.now + 220,
  nearTouch.now + 1600,
  CORE_INACTIVE
);
assert.equal(
  state.phase,
  'near',
  'released touch cannot advance from near while its last coordinate stays in the hotzone'
);
assert.ok(state.outerDwell < outerDwellBeforeRelease);

const releasedNoticedTouch = new EncounterMachine();
const noticedTouchNear = reachNear(releasedNoticedTouch);
const noticedTouch = advanceUntil(
  releasedNoticedTouch,
  noticedTouchNear.now,
  (next) => next.phase === 'noticed',
  OUTER_ACTIVE
);
state = advance(
  releasedNoticedTouch,
  noticedTouch.now,
  noticedTouch.now + 220,
  CORE_ACTIVE
);
const coreDwellBeforeRelease = state.coreDwell;
state = advance(
  releasedNoticedTouch,
  noticedTouch.now + 220,
  noticedTouch.state.guideReadableAt + STANDARD_TIMING.noticedReadMs + 1200,
  CORE_INACTIVE
);
assert.equal(
  state.phase,
  'noticed',
  'released touch cannot advance from noticed while its last coordinate stays in the core'
);
assert.ok(state.coreDwell < coreDwellBeforeRelease);

const preGateTouch = new EncounterMachine();
const touchReady = reachCountdownReady(preGateTouch);
state = advance(preGateTouch, touchReady.now, touchReady.now + 1100, CORE_INACTIVE);
assert.equal(state.countdownState, 'ready');
assert.equal(state.hold, 0, 'a released touch never starts the countdown from stale coordinates');

const countdown = new EncounterMachine();
const ready = reachCountdownReady(countdown);
state = advance(countdown, ready.now, ready.now + 500, CORE_ACTIVE);
assert.equal(state.countdownState, 'active');
assert.equal(state.countdownValue, 3);
state = advance(countdown, ready.now + 500, ready.now + 1200, CORE_ACTIVE);
assert.equal(state.countdownValue, 2);
state = advance(countdown, ready.now + 1200, ready.now + 2200, CORE_ACTIVE);
assert.equal(state.countdownValue, 1);
state = advance(countdown, ready.now + 2200, ready.now + 2999, CORE_ACTIVE);
assert.equal(state.phase, 'aligned', 'the page cannot enter before three seconds elapse');
state = advance(countdown, ready.now + 2999, ready.now + 3000, CORE_ACTIVE, 1);
assert.equal(state.phase, 'entering');
assert.equal(state.countdownState, 'complete');
assert.equal(state.countdownValue, 0);

const softRelease = new EncounterMachine();
const releaseReady = reachCountdownReady(softRelease);
state = advance(softRelease, releaseReady.now, releaseReady.now + 1200, CORE_ACTIVE);
const holdBeforeLeave = state.hold;
state = advance(softRelease, releaseReady.now + 1200, releaseReady.now + 1380, AWAY);
assert.equal(state.phase, 'aligned');
assert.equal(state.countdownState, 'releasing');
assert.ok(state.hold > 0 && state.hold < holdBeforeLeave);

const enteringAt = countdown.entryStartedAt;
state = advance(
  countdown,
  enteringAt,
  enteringAt + STANDARD_TIMING.entryPauseMs - 1,
  CORE_ACTIVE
);
assert.equal(state.zoom, 0, 'entry begins with a short stillness before forward motion');
const zoomSamples = [];
let previousOffset = STANDARD_TIMING.entryPauseMs - 1;
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
    countdown,
    enteringAt + previousOffset,
    enteringAt + offset,
    CORE_ACTIVE
  );
  zoomSamples.push(state.zoom);
  if (offset === STANDARD_TIMING.boundaryStartMs + 35) boundarySample = state;
  previousOffset = offset;
});
for (let index = 1; index < zoomSamples.length; index += 1) {
  assert.ok(zoomSamples[index] >= zoomSamples[index - 1], 'entry zoom never reverses');
}
assert.ok(zoomSamples.at(-1) > 0.99);
assert.ok(boundarySample.zoom > 0.97);
assert.ok(boundarySample.boundarySilence > 0.95);
state = advance(
  countdown,
  enteringAt + STANDARD_TIMING.entryMs - 120,
  enteringAt + STANDARD_TIMING.entryMs,
  CORE_ACTIVE
);
assert.equal(state.phase, 'handoff');
assert.equal(state.handoff, true);

const reduced = new EncounterMachine({ reducedMotion: true });
reduced.start(0);
reduced.markIntent(1);
const reducedTitleAt = REDUCED_TIMING.blackoutMs
  + REDUCED_TIMING.revealMs
  + REDUCED_TIMING.titleInMs;
const reducedState = reduced.update(reducedTitleAt + REDUCED_TIMING.titleMinReadMs);
assert.equal(reducedState.phase, 'contact');
assert.equal(reducedState.reducedMotion, true);
assert.equal(REDUCED_TIMING.titleMinReadMs, 4000, 'reduced motion preserves reading time');
assert.equal(REDUCED_TIMING.alignedReadMs, 1800, 'reduced motion preserves narration time');
assert.equal(REDUCED_TIMING.holdMs, 3000, 'reduced motion preserves the deliberate countdown');
assert.ok(REDUCED_TIMING.entryMs < STANDARD_TIMING.entryMs);
assert.equal(REDUCED_TIMING.boundaryEndMs - REDUCED_TIMING.boundaryStartMs, 200);

const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
const appSource = await fs.readFile(new URL('../app.js', import.meta.url), 'utf8');
const style = await fs.readFile(new URL('../style.css', import.meta.url), 'utf8');
const nebulaSource = await fs.readFile(new URL('../living-nebula.js', import.meta.url), 'utf8');

assert.match(html, /data-intro="blackout"/);
assert.match(html, /data-phase="opening"/);
assert.match(html, /data-countdown="waiting"/);
assert.match(html, /id="gazeCountdown"/);
assert.match(html, /encounter-machine\.js\?v=4\.2\.0-rc\.1/);
assert.match(html, /在瞳孔内连续停留三秒/);
assert.match(appSource, /pointerup/);
assert.match(appSource, /pointercancel/);
assert.match(appSource, /humanunknown:homepage-exit/);
assert.match(appSource, /--contact-countdown/);
assert.match(appSource, /countdownAttribute: 'data-countdown'/);
assert.match(appSource, /version: '4\.2'/);
assert.match(appSource, /1 \+ nextState\.hold \* 0\.05 \+ zoom \* 3\.55/);
assert.doesNotMatch(appSource, /1 - collapse \* 0\.17 \+ fall/);
assert.match(style, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(
  style,
  /data-intro="dissolving"\] \.identity,[\s\S]*?data-intro="contact"\] \.identity \{[\s\S]*?opacity: 1;/,
  'title and subtitle remain visible after contact begins'
);
assert.match(style, /\.guide\s*\{[\s\S]*?top: 27\.5vh;/);
assert.match(style, /--hotzone-y: -11vh;/);
assert.match(style, /top: calc\(50% \+ var\(--pupil-y\) \+ var\(--hotzone-y\)\);/);
assert.match(appSource, /const formatGuide = \(copy\) => `“\$\{copy\}”`;/);
assert.match(style, /\.guide p\s*\{[\s\S]*?font-size: clamp\(10px, \.78vw, 13px\);/);
assert.match(style, /data-countdown="active"\] \.gaze-countdown/);
assert.match(style, /data-countdown="active"\] \.cosmos::after/);
assert.match(style, /scaleX\(\.72\)/);
assert.doesNotMatch(nebulaSource, /narrativeScale|collapseFrame|narrativeMask/);
assert.match(nebulaSource, /vec2 narrativeUv = vUv;/);
assert.match(nebulaSource, /state\.zoom \|\| 0/);

console.log('homepage v4.2 contract: passed');
