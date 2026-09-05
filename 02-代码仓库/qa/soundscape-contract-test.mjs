import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

class FakeParam {
  constructor(value = 0) {
    this.value = value;
  }

  setTargetAtTime(value) {
    this.value = value;
  }

  setValueAtTime(value) {
    this.value = value;
  }

  exponentialRampToValueAtTime(value) {
    this.value = value;
  }

  cancelScheduledValues() {}
}

class FakeNode {
  constructor() {
    this.connections = [];
    this.listeners = new Map();
  }

  connect(node) {
    this.connections.push(node);
    return node;
  }

  disconnect() {
    this.connections.length = 0;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  start() {}

  stop() {}
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 1;
    this.sampleRate = 8000;
    this.state = 'suspended';
    this.destination = new FakeNode();
  }

  createGain() {
    const node = new FakeNode();
    node.gain = new FakeParam();
    return node;
  }

  createStereoPanner() {
    const node = new FakeNode();
    node.pan = new FakeParam();
    return node;
  }

  createBiquadFilter() {
    const node = new FakeNode();
    node.frequency = new FakeParam();
    node.Q = new FakeParam();
    return node;
  }

  createOscillator() {
    const node = new FakeNode();
    node.frequency = new FakeParam();
    return node;
  }

  createBufferSource() {
    return new FakeNode();
  }

  createDynamicsCompressor() {
    const node = new FakeNode();
    node.threshold = new FakeParam();
    node.knee = new FakeParam();
    node.ratio = new FakeParam();
    node.attack = new FakeParam();
    node.release = new FakeParam();
    return node;
  }

  createAnalyser() {
    const node = new FakeNode();
    node.fftSize = 512;
    node.getFloatTimeDomainData = (data) => data.fill(0.014);
    return node;
  }

  createBuffer(channels, length, sampleRate) {
    const data = new Float32Array(length);
    return {
      duration: length / sampleRate,
      getChannelData: () => data,
    };
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }

  async close() {
    this.state = 'closed';
  }
}

function createClassList() {
  const values = new Set();
  return {
    contains: (name) => values.has(name),
    toggle: (name, force) => {
      if (force) values.add(name);
      else values.delete(name);
    },
  };
}

const icon = { src: '', draggable: false };
const status = { textContent: '' };
const prompt = { textContent: '', classList: createClassList() };
const listeners = new Map();
const attributes = new Map();
const styles = new Map();
const toggle = {
  dataset: {},
  classList: createClassList(),
  disabled: false,
  title: '',
  querySelector: () => icon,
  addEventListener: (type, listener) => listeners.set(type, listener),
  removeEventListener: (type) => listeners.delete(type),
  setAttribute: (name, value) => attributes.set(name, value),
  contains: (target) => target === toggle,
  style: { setProperty: (name, value) => styles.set(name, value) },
};

const storage = new Map();
const documentListeners = new Map();
const fakeDocument = {
  hidden: false,
  getElementById: (id) => {
    if (id === 'soundStatus') return status;
    if (id === 'soundPrompt') return prompt;
    return null;
  },
  addEventListener: (type, listener) => documentListeners.set(type, listener),
  removeEventListener: (type) => documentListeners.delete(type),
};
const fakeWindow = {
  AudioContext: FakeAudioContext,
  innerWidth: 1672,
  innerHeight: 941,
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  setTimeout,
  clearTimeout,
};

const source = await fs.readFile(new URL('../living-soundscape.js', import.meta.url), 'utf8');
vm.runInNewContext(source, {
  window: fakeWindow,
  document: fakeDocument,
  performance,
  Float32Array,
  Math,
  Map,
  Set,
  console,
});

const soundscape = new fakeWindow.LivingSoundscape(toggle);
assert.equal(toggle.dataset.soundState, 'armed');
assert.equal(attributes.get('aria-pressed'), 'true');
assert.equal(attributes.get('aria-busy'), 'false');
assert.match(icon.src, /volume\.svg$/);
assert.equal(prompt.textContent, '轻触开启声音');
assert.equal(prompt.classList.contains('is-visible'), true);

await listeners.get('click')({ preventDefault() {}, stopPropagation() {} });
assert.equal(toggle.dataset.soundState, 'on');
assert.equal(attributes.get('aria-pressed'), 'true');
assert.equal(attributes.get('aria-busy'), 'false');
assert.match(icon.src, /volume\.svg$/);
assert.equal(soundscape.getState().contextState, 'running');
assert.equal(prompt.textContent, '声音已开启');
assert.equal(
  soundscape.activeEvents.filter((event) => event.kind === 'enable').length,
  1,
  'one valid gesture emits exactly one audible enable confirmation'
);

const now = performance.now();
const state = {
  phase: 'aligned',
  pointer: {
    x: 1280,
    y: 330,
    speed: 720,
    disturbance: 0.84,
    stillness: 0.18,
  },
  presence: { study: 0.55, approach: 0.72 },
  pupil: { active: true, amplitude: 0.92, value: 0.71 },
  encounter: {
    phase: 'aligned',
    noticeSerial: 1,
    outerDwell: 420,
    hold: 0.55,
    entry: 0,
    boundarySilence: 0,
  },
  metabolism: {
    events: [
      { x: -0.4, kind: 1, energy: 0.96, seed: 0.4, directionX: 0.7, startedAt: now - 2100, duration: 5600 },
      { x: 0.45, kind: -1, energy: 0.94, seed: 0.6, directionX: -0.5, startedAt: now - 3100, duration: 6500 },
      { x: 0.2, kind: 0, energy: 0.91, seed: 0.9, directionX: -0.6, startedAt: now - 1700, duration: 4500 },
    ],
  },
  waves: [
    { energy: 0.8, startedAt: now - 900, duration: 4300 },
  ],
};

for (let index = 0; index < 8; index += 1) {
  soundscape.lastControlAt = 0;
  soundscape.update(state, 1 / 60);
}
const activeState = soundscape.getState();
assert.ok(activeState.telemetry.level > 0);
assert.equal(activeState.architecture, 'sparse-low-frequency-presence');
assert.ok(activeState.telemetry.presence > 0 && activeState.telemetry.presence < 0.003);
assert.ok(activeState.telemetry.movement > 0);
assert.ok(activeState.telemetry.focus > 0.6);
assert.ok(activeState.telemetry.events > 0, 'notice is emitted as a bounded event');
assert.ok(soundscape.nodes.movementFilter.frequency.value < 260);
assert.ok(soundscape.nodes.focusFilter.frequency.value < 680);
assert.ok(soundscape.nodes.presenceGain.gain.value < 0.003, 'the presence floor yields to notice');
assert.ok(soundscape.nodes.presenceUpper.frequency.value >= 90);
assert.ok(Number(toggle.dataset.soundLevel) > 0);
assert.ok(Number(toggle.dataset.presenceLevel) < 0.003);

soundscape.duckUntil = 0;
for (let index = 0; index < 8; index += 1) {
  soundscape.lastControlAt = 0;
  soundscape.update(state, 1 / 60);
}
const recoveredPresence = soundscape.getState().telemetry.presence;
assert.ok(recoveredPresence >= 0.006, 'the audible narrow-band floor returns after notice');
assert.ok(soundscape.nodes.presenceGain.gain.value >= 0.006);
assert.ok(Number(toggle.dataset.presenceLevel) >= 0.006);

await documentListeners.get('keydown')({
  key: 'm',
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  preventDefault() {},
});
assert.equal(toggle.dataset.soundState, 'off');
assert.equal(attributes.get('aria-pressed'), 'false');
assert.match(icon.src, /volume-off\.svg$/);
assert.equal(storage.get('human-unknown:sound-enabled'), 'off');

const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /id="soundToggle"/);
assert.match(html, /id="soundPrompt"/);
assert.match(html, /data-sound-state="armed"/);
assert.match(html, /living-soundscape\.js\?v=4\.3\.0-rc\.2/);
assert.match(html, /assets\/tabler-volume\.svg/);

const appSource = await fs.readFile(new URL('../app.js', import.meta.url), 'utf8');
assert.match(appSource, /soundscape\.update\(\{/);
assert.match(appSource, /closest\('#soundToggle'\)/);
assert.match(appSource, /soundscape \? soundscape\.getState\(\) : null/);

assert.doesNotMatch(source, /createNoiseBuffer|createBufferSource|airNoise|worldNoise/);
assert.doesNotMatch(source, /2240|3900|DynamicsCompressor|metabolismBus/);
assert.match(source, /randomBetween\(36\.5, 52\.5\)/);
assert.match(source, /base \* ratio/);
assert.match(source, /safeStoredPreference\(\) !== 'off'/);
assert.match(source, /randomBetween\(5000, 9000\)/);
assert.match(source, /triggerEnableCue\(\)/);
assert.match(source, /soundState === 'starting'/);

await soundscape.setEnabled(true);
soundscape.destroy();

const restoredSoundscape = new fakeWindow.LivingSoundscape(toggle);
assert.equal(toggle.dataset.soundState, 'armed');
assert.equal(attributes.get('aria-pressed'), 'true');
await documentListeners.get('keydown')({
  key: 'a',
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  preventDefault() {},
});
assert.equal(toggle.dataset.soundState, 'on');
assert.equal(restoredSoundscape.getState().contextState, 'running');
restoredSoundscape.destroy();
console.log('soundscape contract: passed');
