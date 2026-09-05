import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const cursorSource = await fs.readFile(
  new URL('../light-cursor.js', import.meta.url),
  'utf8'
);
const appSource = await fs.readFile(new URL('../app.js', import.meta.url), 'utf8');
const htmlSource = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
const cssSource = await fs.readFile(new URL('../style.css', import.meta.url), 'utf8');
const fakeWindow = {};

vm.runInNewContext(cursorSource, {
  window: fakeWindow,
  Math,
  Number,
  Boolean,
});

const LightCursor = fakeWindow.HumanUnknownLightCursor;
assert.equal(typeof LightCursor, 'function', 'the light cursor constructor is exported');

function createElement() {
  const properties = new Map();
  return {
    dataset: {},
    style: {
      transform: '',
      setProperty(name, value) {
        properties.set(name, value);
      },
      getPropertyValue(name) {
        return properties.get(name) || '';
      },
    },
  };
}

function advance(cursor, input, frames = 45) {
  for (let index = 0; index < frames; index += 1) {
    cursor.update(1 / 60, input);
  }
}

const element = createElement();
const cursor = new LightCursor(element);
const restingPointer = { x: 220, y: 180, velocityX: 0, velocityY: 0 };

cursor.moveTo(restingPointer.x, restingPointer.y);
advance(cursor, { pointer: restingPointer, phase: 'contact' }, 2);
assert.equal(element.style.transform, 'translate3d(220px, 180px, 0)');
assert.equal(cursor.getState().mode, 'cloud');
assert.equal(cursor.getState().target, 'none');
assert.ok(
  Number.parseFloat(element.style.getPropertyValue('--cursor-cloud-opacity')) > 0.99,
  'the default form is the diffuse light cloud'
);
assert.ok(
  Number.parseFloat(element.style.getPropertyValue('--cursor-point-opacity')) > 0,
  'the cloud keeps a faint source core instead of becoming hollow'
);
const restingRotation = element.style.getPropertyValue('--cursor-cloud-rotation');
advance(cursor, { pointer: restingPointer, phase: 'contact' }, 12);
assert.notEqual(
  element.style.getPropertyValue('--cursor-cloud-rotation'),
  restingRotation,
  'the living light keeps a slow internal current while the pointer rests'
);

advance(cursor, {
  pointer: restingPointer,
  phase: 'near',
  centralTarget: true,
  pupilX: 260,
  pupilY: 200,
});
assert.equal(cursor.getState().mode, 'point');
assert.equal(cursor.getState().target, 'pupil');
assert.ok(
  Number.parseFloat(element.style.getPropertyValue('--cursor-point-opacity')) > 0.99,
  'the central interaction target condenses the cloud into a precise light point'
);
assert.ok(
  Number.parseFloat(element.style.getPropertyValue('--cursor-cloud-opacity')) < 0.01,
  'the diffuse cloud clears away once the point has formed'
);

advance(cursor, { pointer: restingPointer, phase: 'contact' }, 80);
assert.equal(cursor.getState().mode, 'cloud', 'leaving the target releases the point into light');

cursor.setHoverTarget('sound');
advance(cursor, { pointer: restingPointer, phase: 'contact' });
assert.equal(cursor.getState().mode, 'point');
assert.equal(cursor.getState().target, 'sound');

cursor.setPressed(true);
advance(cursor, { pointer: restingPointer, phase: 'contact' }, 12);
assert.equal(element.dataset.pressed, 'true');
assert.ok(
  Number.parseFloat(element.style.getPropertyValue('--cursor-point-scale')) < 1,
  'pressing compresses the light point without moving its hotspot'
);
cursor.setPressed(false);

cursor.setHoverTarget('none');
advance(cursor, {
  pointer: { x: 220, y: 180, velocityX: 920, velocityY: -460 },
  phase: 'contact',
}, 6);
assert.ok(
  Number.parseFloat(element.style.getPropertyValue('--cursor-trail-x')) < 0,
  'the outer cloud trails opposite horizontal pointer velocity'
);
assert.ok(
  Number.parseFloat(element.style.getPropertyValue('--cursor-trail-y')) > 0,
  'the outer cloud trails opposite vertical pointer velocity'
);

advance(cursor, {
  pointer: restingPointer,
  phase: 'entering',
  entry: 0.72,
  pupilX: 300,
  pupilY: 210,
}, 8);
assert.equal(cursor.getState().mode, 'absorbing');
assert.equal(cursor.getState().target, 'pupil');
assert.equal(cursor.getState().absorption, 0.72);
assert.ok(
  Number.parseFloat(element.style.getPropertyValue('--cursor-pull-x')) > 0,
  'the entering light is pulled toward the locked pupil origin'
);
assert.ok(
  Number.parseFloat(element.style.getPropertyValue('--cursor-opacity')) < 1,
  'the light dissolves as it is absorbed'
);

const reducedElement = createElement();
const reducedCursor = new LightCursor(reducedElement, { reducedMotion: true });
reducedCursor.update(1 / 60, {
  pointer: { x: 0, y: 0, velocityX: 1000, velocityY: 1000 },
  centralTarget: true,
  phase: 'near',
});
assert.equal(reducedCursor.getState().mode, 'point');
assert.equal(reducedCursor.getState().speed, 0);
assert.equal(reducedElement.style.getPropertyValue('--cursor-trail-x'), '0.00px');
assert.equal(reducedElement.style.getPropertyValue('--cursor-trail-y'), '0.00px');

assert.match(htmlSource, /assets\/cursor-light-cloud\.png/);
assert.match(htmlSource, /assets\/cursor-light-point\.png/);
assert.match(htmlSource, /light-cursor\.js\?v=4\.5\.1-rc\.1/);
assert.match(
  cssSource,
  /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*body \*[\s\S]*cursor: none !important/,
  'fine-pointer descendants cannot restore the system arrow'
);
assert.match(cssSource, /@media \(hover: none\), \(pointer: coarse\)[\s\S]*\.contact-cursor[\s\S]*display: none/);
assert.match(appSource, /centralTarget: interaction\.outer && isTrackingPhase\(phase\)/);
assert.match(appSource, /cursor: lightCursor \? lightCursor\.getState\(\) : null/);

for (const asset of ['cursor-light-cloud.png', 'cursor-light-point.png']) {
  const buffer = await fs.readFile(new URL(`../assets/${asset}`, import.meta.url));
  assert.deepEqual(
    Array.from(buffer.subarray(0, 8)),
    [137, 80, 78, 71, 13, 10, 26, 10],
    `${asset} is a valid PNG asset`
  );
}

console.log('light cursor v4.3 contract: passed');
