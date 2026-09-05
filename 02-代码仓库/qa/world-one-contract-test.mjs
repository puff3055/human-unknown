import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const qaDirectory = dirname(fileURLToPath(import.meta.url));
const root = dirname(qaDirectory);
const repositoryRoot = dirname(root);
const index = await readFile(join(root, 'index.html'), 'utf8');
const home = await readFile(join(root, 'app.js'), 'utf8');
const world = await readFile(join(root, 'world-one.js'), 'utf8');
const worldSound = await readFile(join(root, 'world-one-soundscape.js'), 'utf8');

const scenePaths = Array.from({ length: 6 }, (_, indexValue) => (
  `assets/world1/scene-${String(indexValue + 1).padStart(2, '0')}.png`
));
const sourceNames = [
  'image-gen-1(20260905-161010).png',
  'image-gen-2(20260905-161013).png',
  'image-gen-3(20260905-161015).png',
  'image-gen-4(20260905-161017).png',
  'image-gen-5(20260905-161018).png',
  'image-gen-6(9).png',
];

let previousPosition = -1;
for (const [sceneIndex, scenePath] of scenePaths.entries()) {
  const position = index.indexOf(scenePath);
  assert.ok(position > previousPosition, `${scenePath} must appear in strict sequence`);
  previousPosition = position;

  const image = await readFile(join(root, scenePath));
  assert.equal(image.toString('ascii', 1, 4), 'PNG', `${scenePath} must be a PNG`);
  assert.equal(image.readUInt32BE(16), 1672, `${scenePath} must preserve source width`);
  assert.equal(image.readUInt32BE(20), 941, `${scenePath} must preserve source height`);
  const source = await readFile(join(
    repositoryRoot,
    '00-项目参考材料',
    '01-世界1',
    sourceNames[sceneIndex],
  ));
  assert.equal(
    createHash('sha256').update(image).digest('hex'),
    createHash('sha256').update(source).digest('hex'),
    `${scenePath} must remain byte-identical to its source master`,
  );
}

assert.match(index, /id="worldReplay"/, 'the ending must offer replay');
assert.match(index, /id="worldReturn"/, 'the ending must offer return');
assert.doesNotMatch(index + world, /下一章尚未开放/, 'the experience must not show a closed-next-chapter notice');
assert.match(home, /suspend:\s*\(\)/, 'the homepage must expose scene suspension');
assert.match(home, /resume:\s*\(\)/, 'the homepage must expose scene resume');
assert.match(world, /progress\.growth/, 'growth state must persist');
assert.match(world, /progress\.response/, 'network response state must persist');
assert.match(world, /progress\.flow/, 'resource flow state must persist');
assert.match(world, /continuitySignalId/, 'one signal identity must cross scenes');
assert.match(world, /handlePointerMove/, 'pointer and touch interaction must exist');
assert.match(world, /handleKeyDown/, 'keyboard interaction must exist');
assert.match(world, /prefers-reduced-motion/, 'reduced-motion support must exist');
assert.match(home + world, /motion.*reduced/, 'reduced-motion browser QA override must exist');
assert.match(worldSound, /class WorldOneSoundscape/, 'world one must have an independent sound layer');

console.log('World one contract passed: six ordered source-faithful scenes, continuity, input fallbacks, honest ending, and independent scene layers.');
