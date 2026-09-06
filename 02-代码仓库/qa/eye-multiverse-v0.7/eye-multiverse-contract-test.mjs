import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const codeRoot = resolve(here, '../..');
const [html, css, script] = await Promise.all([
  readFile(resolve(codeRoot, 'eye-multiverse.html'), 'utf8'),
  readFile(resolve(codeRoot, 'eye-multiverse.css'), 'utf8'),
  readFile(resolve(codeRoot, 'eye-multiverse.js'), 'utf8'),
]);

assert.match(html, /eye-multiverse\.css\?v=0\.7\.0/);
assert.match(html, /eye-multiverse\.js\?v=0\.7\.0/);
assert.match(html, /id="networkFrontCanvas"/);
assert.match(html, /id="listenButton"/);
assert.match(html, /id="voiceWave"/);
assert.doesNotMatch(html + script, /按\s*H|KeyH|快捷键|正在孕育/);

assert.match(script, /FOCAL_LENGTH\s*=\s*940/);
assert.match(script, /signal:\s*180,\s*still:\s*430,\s*branch:\s*1030,\s*settled:\s*1260,\s*launchGap:\s*300/);
assert.match(script, /function\s+projectWorld/);
assert.match(script, /function\s+selectMother/);
assert.match(script, /function\s+spawnVolume/);
assert.match(script, /function\s+branchHead/);
assert.match(script, /parent:\s*mother/);
assert.match(script, /thread\.forming\s*=\s*false/);
assert.match(script, /globalCompositeOperation\s*=\s*'destination-out'/);
assert.match(script, /recognition\.lang\s*=\s*'en-US'/);
assert.match(script, /recognition\.maxAlternatives\s*=\s*10/);
assert.match(script, /worldCount\s*>=\s*55/);
assert.match(script, /worldCount\s*>=\s*21/);
assert.match(script, /worldCount\s*>=\s*8/);
assert.match(script, /soundOn\s*=\s*false/);

assert.match(css, /\.multiverse\s*\{[^}]*cursor:\s*default/s);
assert.match(css, /\.multiverse__listen[\s\S]*?cursor:\s*pointer/);
assert.match(css, /\.multiverse__network--front\s*\{\s*z-index:\s*3/);
assert.doesNotMatch(css, /@media\s*\([^)]*(max-width|min-width)/);

await Promise.all([
  access(resolve(codeRoot, 'assets/eye-orb-source-cutout.png')),
  access(resolve(codeRoot, 'assets/tabler-microphone.svg')),
  access(resolve(codeRoot, 'assets/tabler-microphone-off.svg')),
]);

console.log('eye multiverse v0.7 desktop contract: passed');
