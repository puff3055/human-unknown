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

assert.match(html, /eye-multiverse\.css\?v=0\.8\.0/);
assert.match(html, /eye-multiverse\.js\?v=0\.8\.0/);
assert.match(html, /id="phenomenaCanvas"/);
assert.doesNotMatch(html, /networkCanvas|networkFrontCanvas/);
assert.match(html, /eye-multiverse-corridor-v1\.png/);
assert.match(html, /id="listenButton"/);
assert.match(html, /id="voiceWave"/);
assert.doesNotMatch(html + script, /按\s*H|KeyH|快捷键|正在孕育/);

assert.match(script, /MAX_EYES\s*=\s*18/);
assert.match(script, /MAX_FOLDS\s*=\s*3/);
assert.match(script, /acknowledge:\s*90,\s*locate:\s*210,\s*echo:\s*520,\s*commit:\s*960,\s*settled:\s*1250,\s*launchGap:\s*240/);
assert.match(script, /function\s+projectWorld/);
assert.match(script, /function\s+spawnTarget/);
assert.match(script, /function\s+drawTemporalPhenomena/);
assert.match(script, /function\s+engageCameraGaze/);
assert.match(script, /depthBand:\s*band/);
assert.match(script, /parentId:\s*parent\.id/);
assert.match(script, /recognition\.lang\s*=\s*'en-US'/);
assert.match(script, /recognition\.maxAlternatives\s*=\s*10/);
assert.match(script, /get hasVoiceProjectile\(\) \{ return false; \}/);
assert.match(script, /const pixelBudgetRatio = Math\.sqrt\(3600000/);
assert.doesNotMatch(script, /drawVoiceSignal|voiceProjectile|networkCanvas/);

assert.match(css, /\.multiverse\s*\{[^}]*cursor:\s*default/s);
assert.match(css, /\.multiverse__listen[\s\S]*?cursor:\s*pointer/);
assert.match(css, /\.multiverse__phenomena\s*\{\s*z-index:\s*2/);
assert.doesNotMatch(css, /@media\s*\([^)]*(max-width|min-width)/);

await Promise.all([
  access(resolve(codeRoot, 'assets/eye-orb-source-cutout.png')),
  access(resolve(codeRoot, 'assets/eye-multiverse-corridor-v1.png')),
  access(resolve(codeRoot, 'assets/tabler-microphone.svg')),
  access(resolve(codeRoot, 'assets/tabler-microphone-off.svg')),
]);

console.log('eye multiverse v0.8 desktop contract: passed');
