import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (name) => readFile(path.join(root, name), 'utf8');

const [html, app, journey, green, living, css] = await Promise.all([
  read('index.html'),
  read('app.js'),
  read('journey-controller.js'),
  read('green-body-realtime.js'),
  read('green-body-living.js'),
  read('green-body-realtime.css'),
]);

assert.match(html, /id="worldOne"[\s\S]*id="journeyBridge"/);
assert.match(html, /id="journeyCarrier"[\s\S]*cursor-light-point\.png/);
assert.match(html, /green-body-realtime\.js[\s\S]*journey-controller\.js[\s\S]*app\.js/);

assert.match(app, /humanunknown:homepage-exit/);
assert.match(journey, /const ENTRY_NODE = 'spore-center-low'/);
assert.match(journey, /humanunknown:phasechange/);
assert.match(journey, /humanunknown:homepage-exit/);
assert.match(journey, /prepareEntry\(/);
assert.match(journey, /commitEntry\(/);
assert.match(journey, /single-carrier-hard-cut/);
assert.match(journey, /contact\.classList\.add\('is-world-hidden'\)/);

assert.match(green, /addNode\('spore-center-low', \.528, \.508, 'filament', 'spore', 11\)/);
assert.match(green, /prepareEntry,/);
assert.match(green, /commitEntry,/);
assert.match(green, /getNodeScreenPosition,/);
assert.match(green, /greenbody:entry/);
assert.match(green, /greenbody:arrival/);
assert.match(green, /greenbody:complete/);
assert.doesNotMatch(green, /function updateEntrance/);
assert.doesNotMatch(green, /requestAnimationFrame\(updateEntrance\)/);
assert.match(living, /root\.dataset\.active !== 'true'[\s\S]*canvas\.dataset\.paused = 'true'/);

assert.match(css, /\.world-one \{[^}]*background: #020502/);
assert.match(css, /\.contact\.is-world-hidden/);
assert.match(css, /\.journey-bridge__carrier/);
assert.doesNotMatch(css, /\.world-one \{[^}]*transition: opacity/);

console.log('home → green body bridge contract: passed');
