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

assert.match(html, /id="listenButton"/);
assert.match(html, /id="voiceWave"/);
assert.match(html, /aria-pressed="false"/);
assert.doesNotMatch(html + script, /按\s*H|KeyH|快捷键/);

assert.match(script, /signal:\s*320,\s*branch:\s*900,\s*settled:\s*1250,\s*launchGap:\s*380/);
assert.match(script, /\[\[\.29,\.37,\.205/);
assert.match(script, /maxAlternatives=10/);
assert.match(script, /interimResults=true/);
assert.match(script, /\[嗨嘿黑海\]/);
assert.match(script, /worldCount>=55/);
assert.match(script, /worldCount>=21/);
assert.match(script, /worldCount>=8/);
assert.match(script, /soundOn=false/);

assert.match(css, /\.multiverse\s*\{[^}]*cursor:\s*default/s);
assert.match(css, /\.multiverse__listen[\s\S]*?cursor:\s*pointer/);
assert.doesNotMatch(css, /@media\s*\([^)]*(max-width|min-width)/);

await Promise.all([
  access(resolve(codeRoot, 'assets/eye-orb-source-cutout.png')),
  access(resolve(codeRoot, 'assets/tabler-microphone.svg')),
  access(resolve(codeRoot, 'assets/tabler-microphone-off.svg')),
]);

console.log('eye multiverse v0.6 desktop contract: passed');
