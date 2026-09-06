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
  ['在页面动一动，感受它', '它注意到你了', '来中间，进入它的世界'],
  'the approved three-line sequence remains exact'
);
assert.doesNotMatch(machineSource, /对，在这里/);
assert.doesNotMatch(machineSource, /在中间放入你的眼睛/);
assert.equal(STANDARD_TIMING.titleMinReadMs, 2500);
assert.equal(STANDARD_TIMING.holdMs, 3000, 'the gaze countdown lasts three seconds');
assert.equal(STANDARD_TIMING.titleHoldMs, 2500);
assert.equal(STANDARD_TIMING.titleDissolveMs, 2000);
assert.equal(STANDARD_TIMING.contactReadMs, 5000);
assert.equal(STANDARD_TIMING.nearReadMs, 5000);
assert.equal(STANDARD_TIMING.readyPauseMs, 5000);
assert.equal(STANDARD_TIMING.guideEnterMs, 3000);
assert.equal(STANDARD_TIMING.guideSwapMs, 3000);
assert.equal(STANDARD_TIMING.noticedReadMs, 0);
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
const narrationStartsAt = titleFullyVisibleAt + STANDARD_TIMING.readyPauseMs;

function reachAligned(machine) {
  machine.start(0);
  let state = machine.update(narrationStartsAt - 1, AWAY);
  assert.equal(state.phase, 'opening');
  assert.equal(state.guide, '');
  state = machine.update(narrationStartsAt, AWAY);
  assert.equal(state.phase, 'contact');
  assert.equal(state.guide, '在页面动一动，感受它');
  assert.equal(state.guideReadableAt, narrationStartsAt + STANDARD_TIMING.guideEnterMs);

  state = advance(
    machine,
    narrationStartsAt,
    state.guideReadableAt + STANDARD_TIMING.contactReadMs - 1,
    AWAY
  );
  assert.equal(state.phase, 'contact', 'the first line fades in for three seconds and holds for five');
  const secondStartsAt = state.guideReadableAt + STANDARD_TIMING.contactReadMs;
  state = machine.update(secondStartsAt, AWAY);
  assert.equal(state.phase, 'near');
  assert.equal(state.guide, '它注意到你了');
  assert.equal(
    state.guideReadableAt,
    secondStartsAt + STANDARD_TIMING.guideSwapMs + STANDARD_TIMING.guideEnterMs
  );
  const secondFadeStartsAt = state.guideReadableAt - STANDARD_TIMING.guideEnterMs;
  state = advance(machine, secondStartsAt, secondFadeStartsAt - 1, AWAY);
  assert.equal(state.noticeSerial, 0, 'the curiosity response waits for the second line');
  state = machine.update(secondFadeStartsAt, AWAY);
  assert.equal(state.noticeSerial, 1, 'the curiosity response begins with the second line fade');

  state = advance(
    machine,
    secondFadeStartsAt,
    state.guideReadableAt + STANDARD_TIMING.nearReadMs - 1,
    AWAY
  );
  assert.equal(state.phase, 'near', 'the second line fades in for three seconds and holds for five');
  const thirdStartsAt = state.guideReadableAt + STANDARD_TIMING.nearReadMs;
  state = machine.update(thirdStartsAt, AWAY);
  assert.equal(state.phase, 'noticed');
  assert.equal(state.guide, '来中间，进入它的世界');
  assert.equal(
    state.guideReadableAt,
    thirdStartsAt + STANDARD_TIMING.guideSwapMs + STANDARD_TIMING.guideEnterMs
  );

  state = advance(machine, thirdStartsAt, state.guideReadableAt - 1, AWAY);
  assert.equal(state.phase, 'noticed', 'the final line must finish its three-second fade before the gate');
  state = machine.update(state.guideReadableAt, AWAY);
  assert.equal(state.phase, 'aligned');
  assert.equal(state.guide, '来中间，进入它的世界');
  return { state, now: state.guideReadableAt };
}

function reachCountdownReady(machine) {
  const aligned = reachAligned(machine);
  const state = machine.update(aligned.now, CORE_INACTIVE);
  assert.equal(state.finalGuideReadComplete, true);
  assert.equal(state.finalGuideComplete, true);
  assert.equal(state.guideExit, 0, 'the final line remains visible');
  assert.equal(state.guide, '来中间，进入它的世界');
  assert.equal(state.hold, 0);
  assert.equal(state.countdownReady, true);
  assert.equal(state.countdownState, 'ready');
  return { state, now: aligned.state.guideReadableAt };
}

const still = new EncounterMachine();
still.start(0);
let state = still.update(narrationStartsAt - 1, AWAY);
assert.equal(state.phase, 'opening', 'the first line waits for three seconds after ready');
assert.equal(state.intro, 'contact');
assert.equal(state.guide, '');

const opening = new EncounterMachine();
opening.start(0);
state = opening.update(STANDARD_TIMING.blackoutMs - 1);
assert.equal(state.intro, 'blackout');
assert.equal(state.reveal, 0);
state = opening.update(STANDARD_TIMING.blackoutMs + 200);
assert.equal(state.intro, 'revealing');
assert.ok(state.reveal > 0 && state.reveal < 1);
state = opening.update(narrationStartsAt);
assert.equal(state.phase, 'contact');
assert.equal(state.guide, '在页面动一动，感受它');
assert.ok(state.titleReadableFor >= 5000);

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
const reducedState = reduced.update(reducedTitleAt + REDUCED_TIMING.readyPauseMs);
assert.equal(reducedState.phase, 'contact');
assert.equal(reducedState.reducedMotion, true);
assert.equal(REDUCED_TIMING.titleMinReadMs, 2500, 'reduced motion preserves the title hold');
assert.equal(REDUCED_TIMING.readyPauseMs, 5000, 'reduced motion preserves the ready pause');
assert.equal(REDUCED_TIMING.titleDissolveMs, 2000, 'reduced motion preserves the title exit');
assert.equal(REDUCED_TIMING.guideEnterMs, 3000, 'reduced motion preserves the narration reveal');
assert.equal(REDUCED_TIMING.guideSwapMs, 3000, 'reduced motion preserves narration exits');
assert.equal(REDUCED_TIMING.contactReadMs, 5000, 'reduced motion preserves the first line hold');
assert.equal(REDUCED_TIMING.nearReadMs, 5000, 'reduced motion preserves the second line hold');
assert.equal(REDUCED_TIMING.noticedReadMs, 0, 'the final line becomes actionable once fully visible');
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
assert.match(html, /encounter-machine\.js\?v=interaction-sound-0\.1\.0-rc\.1/);
assert.match(html, /在中央瞳孔内连续停留三秒/);
assert.match(appSource, /pointerup/);
assert.match(appSource, /pointercancel/);
assert.match(appSource, /humanunknown:homepage-exit/);
assert.match(appSource, /--contact-countdown/);
assert.match(appSource, /countdownAttribute: 'data-countdown'/);
assert.match(appSource, /version: '4\.7-sound-1'/);
assert.match(appSource, /const hotzoneNarrativelyReady = phase === 'aligned'/);
assert.match(appSource, /1 \+ nextState\.hold \* 0\.05 \+ zoom \* 3\.55/);
assert.doesNotMatch(appSource, /1 - collapse \* 0\.17 \+ fall/);
assert.match(style, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(
  style,
  /data-intro="title-in"\] \.identity,[\s\S]*?data-intro="title-hold"\] \.identity \{[\s\S]*?opacity: 1;/,
  'title and subtitle are only visible during their own intro stages'
);
assert.doesNotMatch(style, /data-intro="contact"\] \.identity/);
assert.match(style, /\.guide\s*\{[\s\S]*?top: 27\.5vh;/);
assert.match(style, /--hotzone-y: -11vh;/);
assert.match(style, /top: calc\(50% \+ var\(--pupil-y\) \+ var\(--hotzone-y\)\);/);
assert.match(appSource, /const formatGuide = \(copy\) => `“\$\{copy\}”`;/);
assert.match(html, /id="returnControl"/);
assert.match(style, /data-phase="handoff"\] \.return-control/);
assert.match(appSource, /window\.location\.reload\(\)/);
assert.match(style, /\.guide p\s*\{[\s\S]*?font-size: clamp\(10px, \.78vw, 13px\);/);
assert.match(style, /opacity 3s ease/);
assert.match(style, /data-countdown="active"\] \.gaze-countdown/);
assert.match(style, /data-countdown="active"\] \.cosmos::after/);
assert.match(style, /scaleX\(\.72\)/);
assert.doesNotMatch(nebulaSource, /narrativeScale|collapseFrame|narrativeMask/);
assert.match(nebulaSource, /vec2 narrativeUv = vUv;/);
assert.match(nebulaSource, /state\.zoom \|\| 0/);

console.log('homepage v4.7 sound contract: passed');
