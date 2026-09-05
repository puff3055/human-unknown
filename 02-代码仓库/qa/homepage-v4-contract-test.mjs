import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const machineSource = await fs.readFile(new URL('../encounter-machine.js', import.meta.url), 'utf8');
const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
const appSource = await fs.readFile(new URL('../app.js', import.meta.url), 'utf8');
const style = await fs.readFile(new URL('../style.css', import.meta.url), 'utf8');
const fakeWindow = {};

vm.runInNewContext(machineSource, {
  window: fakeWindow,
  performance: { now: () => 0 },
  Math,
  Object,
});

const { COPY_SEQUENCE, STANDARD_TIMING, REDUCED_TIMING, EncounterMachine } =
  fakeWindow.HumanUnknownEncounter;

assert.deepEqual(Array.from(COPY_SEQUENCE), ['在这里', '它注意到你了']);
assert.doesNotMatch(machineSource, /对，在这里/);
assert.equal(STANDARD_TIMING.titleMinReadMs, 4000);
assert.equal(STANDARD_TIMING.holdMs, 3000);
assert.equal(REDUCED_TIMING.holdMs, 3000);
assert.ok(STANDARD_TIMING.revealMs >= 3000 && STANDARD_TIMING.revealMs <= 4000);

const ACTIVE_OUTER = Object.freeze({ outer: true, core: false, active: true });
const ACTIVE_CORE = Object.freeze({ outer: true, core: true, active: true });
const RELEASED = Object.freeze({ outer: true, core: true, active: false });

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

const machine = new EncounterMachine();
machine.start(0);
machine.markIntent(900);
const contactAt = STANDARD_TIMING.blackoutMs
  + STANDARD_TIMING.revealMs
  + STANDARD_TIMING.titleInMs
  + STANDARD_TIMING.titleMinReadMs;
let state = machine.update(contactAt, ACTIVE_OUTER);
assert.equal(state.phase, 'contact');
assert.equal(state.guide, '在这里');

const noticed = advanceUntil(machine, contactAt, (next) => next.phase === 'noticed', ACTIVE_OUTER);
assert.equal(noticed.state.guide, '它注意到你了');
const aligned = advanceUntil(machine, noticed.now, (next) => next.phase === 'aligned', ACTIVE_CORE);
assert.equal(aligned.state.countdownReady, true);
assert.equal(aligned.state.hold, 0);

state = machine.update(aligned.now + 400, ACTIVE_CORE);
assert.ok(state.hold > 0 && state.hold < 1, 'holding the explicit button accumulates progress');
const held = state.hold;
state = machine.update(aligned.now + 450, RELEASED);
assert.ok(state.hold < held, 'releasing the button returns progress instead of advancing');

const complete = advanceUntil(
  machine,
  aligned.now + 450,
  (next) => next.phase === 'entering',
  ACTIVE_CORE,
  4000,
  20
);
assert.ok(complete.now - (aligned.now + 450) >= 3000, 'entry requires a three-second long press');

assert.match(html, /id="entryControl"/);
assert.match(html, />\s*长按放入你的眼睛\s*</);
assert.match(html, /长按“放入你的眼睛”三秒/);
assert.match(html, /app\.js\?v=4\.4\.0-rc\.1/);
assert.match(appSource, /entryActive/);
assert.match(appSource, /setEntryActive\(true\)/);
assert.match(appSource, /setEntryActive\(false\)/);
assert.match(appSource, /usingEntryControl \? interaction\.entryActive/);
assert.match(style, /\.cosmos::after\s*\{[\s\S]*?display: none;/);
assert.match(style, /\.contact\[data-phase="aligned"\] \.entry-control/);
assert.match(style, /\.contact\[data-phase="aligned"\] \.guide\s*\{[\s\S]*?opacity: 0;/);
assert.match(style, /@media \(prefers-reduced-motion: reduce\)/);

console.log('homepage v4.4 contract: passed');
