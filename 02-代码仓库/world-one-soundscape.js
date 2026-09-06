(() => {
  'use strict';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  class WorldOneSoundscape {
    constructor() {
      this.supported = Boolean(AudioContextClass);
      this.enabled = false;
      this.active = false;
      this.paused = false;
      this.scene = 1;
      this.context = null;
      this.nodes = null;
      this.sources = [];
      this.noiseBuffer = null;
      this.lastUpdateAt = 0;
      this.lastPulseAt = -Infinity;
      this.telemetry = {
        canopy: 0,
        roots: 0,
        signal: 0,
        master: 0,
      };
    }

    createNoiseBuffer(duration = 6) {
      const length = Math.floor(this.context.sampleRate * duration);
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      let brown = 0;

      for (let index = 0; index < length; index += 1) {
        const white = Math.random() * 2 - 1;
        brown = (brown + white * 0.024) / 1.019;
        data[index] = clamp(brown * 2.5 + white * 0.06, -1, 1);
      }

      return buffer;
    }

    createGain(value = 0) {
      const node = this.context.createGain();
      node.gain.value = value;
      return node;
    }

    createPanner(value = 0) {
      if (typeof this.context.createStereoPanner === 'function') {
        const node = this.context.createStereoPanner();
        node.pan.value = value;
        return node;
      }

      const node = this.createGain(1);
      node.pan = {
        value,
        cancelScheduledValues() {},
        setTargetAtTime() {},
      };
      return node;
    }

    createNoiseSource(offset = 0) {
      const source = this.context.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      source.start(this.context.currentTime, offset % this.noiseBuffer.duration);
      this.sources.push(source);
      return source;
    }

    buildGraph() {
      this.noiseBuffer = this.createNoiseBuffer();

      const master = this.createGain(0);
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -26;
      compressor.knee.value = 18;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.05;
      compressor.release.value = 0.8;
      master.connect(compressor);
      compressor.connect(this.context.destination);

      const canopyNoise = this.createNoiseSource(0.7);
      const canopyFilter = this.context.createBiquadFilter();
      canopyFilter.type = 'bandpass';
      canopyFilter.frequency.value = 1250;
      canopyFilter.Q.value = 0.5;
      const canopyGain = this.createGain(0);
      const canopyPan = this.createPanner(-0.1);
      canopyNoise.connect(canopyFilter);
      canopyFilter.connect(canopyGain);
      canopyGain.connect(canopyPan);
      canopyPan.connect(master);

      const rootNoise = this.createNoiseSource(2.4);
      const rootFilter = this.context.createBiquadFilter();
      rootFilter.type = 'lowpass';
      rootFilter.frequency.value = 360;
      rootFilter.Q.value = 0.7;
      const rootGain = this.createGain(0);
      const rootPan = this.createPanner(0.12);
      rootNoise.connect(rootFilter);
      rootFilter.connect(rootGain);
      rootGain.connect(rootPan);
      rootPan.connect(master);

      const bodyTone = this.context.createOscillator();
      bodyTone.type = 'sine';
      bodyTone.frequency.value = 62;
      const bodyToneGain = this.createGain(0);
      bodyTone.connect(bodyToneGain);
      bodyToneGain.connect(master);
      bodyTone.start();
      this.sources.push(bodyTone);

      this.nodes = {
        master,
        compressor,
        canopyFilter,
        canopyGain,
        canopyPan,
        rootFilter,
        rootGain,
        rootPan,
        bodyTone,
        bodyToneGain,
      };
    }

    glide(parameter, value, timeConstant = 0.24) {
      if (!this.context) return;
      const now = this.context.currentTime;
      parameter.cancelScheduledValues(now);
      parameter.setTargetAtTime(value, now, timeConstant);
    }

    async arm() {
      if (!this.supported || !this.enabled || !this.active) return false;

      try {
        if (!this.context) {
          this.context = new AudioContextClass();
          this.buildGraph();
        }
        if (this.context.state === 'suspended') await this.context.resume();
        this.syncMaster();
        return this.context.state === 'running';
      } catch (error) {
        console.warn('World one sound fallback enabled:', error.message);
        return false;
      }
    }

    async setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      if (!this.enabled) {
        this.syncMaster();
        return false;
      }
      return this.arm();
    }

    setActive(active) {
      this.active = Boolean(active);
      this.syncMaster();
    }

    setPaused(paused) {
      this.paused = Boolean(paused);
      this.syncMaster();
    }

    setScene(scene) {
      this.scene = clamp(Number(scene) || 1, 1, 6);
    }

    syncMaster() {
      if (!this.nodes || !this.context) return;
      const target = this.active && this.enabled && !this.paused && !document.hidden
        ? 0.5
        : 0;
      this.glide(this.nodes.master.gain, target, target > 0 ? 0.55 : 0.16);
    }

    update(state = {}) {
      if (!this.nodes || !this.context || this.context.state !== 'running') return;
      const now = performance.now();
      if (now - this.lastUpdateAt < 48) return;
      this.lastUpdateAt = now;

      const progress = state.progress || {};
      const scene = clamp(Number(state.scene) || this.scene, 1, 6);
      const growth = clamp(progress.growth || 0, 0, 1);
      const response = clamp(progress.response || 0, 0, 1);
      const descent = clamp(progress.descent || 0, 0, 1);
      const flow = clamp(progress.flow || 0, 0, 1);

      const canopy = scene <= 3
        ? 0.010 + growth * 0.009 + response * 0.008
        : scene === 6
          ? 0.016
          : 0.007;
      const roots = scene === 4
        ? 0.010 + descent * 0.015
        : scene === 5
          ? 0.012 + flow * 0.014
          : scene === 6
            ? 0.011
            : 0.0045;
      const body = 0.0026 + (growth + response + flow) * 0.0014;

      this.glide(this.nodes.canopyGain.gain, canopy, 0.42);
      this.glide(this.nodes.rootGain.gain, roots, 0.42);
      this.glide(this.nodes.bodyToneGain.gain, body, 0.7);
      this.glide(this.nodes.canopyFilter.frequency, 920 + growth * 780 + response * 420, 0.48);
      this.glide(this.nodes.rootFilter.frequency, 260 + descent * 350 + flow * 260, 0.48);
      this.glide(this.nodes.canopyPan.pan, -0.18 + response * 0.36, 0.55);
      this.glide(this.nodes.rootPan.pan, 0.16 - flow * 0.32, 0.55);
      this.glide(this.nodes.bodyTone.frequency, 58 + scene * 2.4 + flow * 7, 0.7);

      this.telemetry.canopy = canopy;
      this.telemetry.roots = roots;
      this.telemetry.signal = Math.max(growth, response, descent, flow);
      this.telemetry.master = this.nodes.master.gain.value;
    }

    pulse(kind = 'signal', strength = 0.7, pan = 0) {
      if (!this.nodes || !this.context || this.context.state !== 'running') return;
      const nowMs = performance.now();
      if (nowMs - this.lastPulseAt < 110) return;
      this.lastPulseAt = nowMs;

      const amount = clamp(strength, 0.2, 1);
      const now = this.context.currentTime;
      const panner = this.createPanner(clamp(pan, -0.72, 0.72));
      const gain = this.createGain(0.0001);
      const tone = this.context.createOscillator();
      tone.type = kind === 'root' ? 'triangle' : 'sine';
      const startFrequency = kind === 'root' ? 76 : kind === 'flow' ? 118 : 168;
      const endFrequency = kind === 'flow' ? 286 : kind === 'root' ? 104 : 340;
      tone.frequency.setValueAtTime(startFrequency, now);
      tone.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.018 * amount, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
      tone.connect(gain);
      gain.connect(panner);
      panner.connect(this.nodes.master);
      tone.start(now);
      tone.stop(now + 1.1);
      tone.addEventListener('ended', () => {
        tone.disconnect();
        gain.disconnect();
        panner.disconnect();
      }, { once: true });
    }

    getState() {
      return {
        supported: this.supported,
        enabled: this.enabled,
        active: this.active,
        paused: this.paused,
        scene: this.scene,
        contextState: this.context ? this.context.state : 'uninitialized',
        telemetry: { ...this.telemetry },
      };
    }

    destroy() {
      this.sources.forEach((source) => {
        try {
          source.stop();
        } catch (error) {
          // A source that has already stopped needs no additional cleanup.
        }
        source.disconnect();
      });
      this.sources = [];
      if (this.context && this.context.state !== 'closed') {
        this.context.close().catch(() => {});
      }
      this.context = null;
      this.nodes = null;
    }
  }

  window.WorldOneSoundscape = WorldOneSoundscape;
})();
