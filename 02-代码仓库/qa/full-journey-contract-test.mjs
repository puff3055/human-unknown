import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = relative => readFile(path.join(root, relative), 'utf8');

const [home, controller, planet, planetJs, multiverse, multiverseJs, transition, transitionCss, ledgerText] = await Promise.all([
  read('index.html'),
  read('journey-controller.js'),
  read('planet-neuron/index.html'),
  read('planet-neuron/planet-neuron.js'),
  read('eye-multiverse.html'),
  read('eye-multiverse.js'),
  read('journey-transition.js'),
  read('journey-transition.css'),
  read('journey-ledger.json'),
]);

assert.match(home, /id="worldNext"[\s\S]*CHAPTER 02 · RECURSIVE COSMOS/);
assert.match(home, /journey-transition\.css[\s\S]*journey-transition\.js[\s\S]*journey-controller\.js/);
assert.match(controller, /HumanUnknownJourney\?\.go\('planet-neuron\/index\.html', \{ kind: 'scale' \}\)/);

assert.match(planet, /data-next-world[\s\S]*CHAPTER 03/);
assert.match(planet, /\.\.\/journey-transition\.css[\s\S]*\.\.\/journey-transition\.js/);
assert.match(planetJs, /HumanUnknownJourney\?\.go\("\.\.\/eye-multiverse\.html", \{ kind: "branch" \}\)/);
assert.match(planetJs, /human-unknown:sound-enabled/);
assert.doesNotMatch(planetJs, /sound\.ambientEvent\(/);

assert.match(multiverse, /journey-transition\.css[\s\S]*journey-transition\.js[\s\S]*eye-multiverse\.js/);
assert.match(multiverse, /id="soundButton"[\s\S]*aria-pressed="true"/);
assert.match(multiverseJs, /human-unknown:sound-enabled/);
assert.match(multiverseJs, /localStorage\.setItem\(SOUND_STORAGE_KEY/);

assert.match(transition, /sessionStorage\.setItem\(STORAGE_KEY/);
assert.match(transition, /window\.location\.assign\(target\.href\)/);
assert.match(transition, /transfer\.targetPath !== window\.location\.pathname/);
assert.match(transitionCss, /journey-carrier-exit/);
assert.match(transitionCss, /journey-carrier-arrival/);

const ledger = JSON.parse(ledgerText);
assert.equal(ledger.seams.length, 2);
for (const seam of ledger.seams) {
  assert.equal(seam.axis, 'z');
  assert.equal(seam.exitDirection, 1);
  assert.equal(seam.entryDirection, 1);
}

const localAssets = [
  'journey-transition.css',
  'journey-transition.js',
  'planet-neuron/index.html',
  'planet-neuron/planet-neuron.css',
  'planet-neuron/planet-neuron.js',
  'planet-neuron/planet-neuron-renderer.js',
  'planet-neuron/planet-neuron-sound.js',
  'planet-neuron/assets/recursive-master-v1.png',
  'planet-neuron/assets/recursive-activity-v1.png',
  'planet-neuron/assets/recursive-depth-v1.png',
  'eye-multiverse.html',
  'eye-multiverse.css',
  'eye-multiverse.js',
  'assets/eye-orb-source-cutout.png',
  'assets/eye-multiverse-corridor-v1.png',
  'assets/tabler-microphone.svg',
];
await Promise.all(localAssets.map(relative => access(path.join(root, relative))));

console.log('full journey contract: passed');
