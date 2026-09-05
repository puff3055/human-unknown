(() => {
  'use strict';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const STORAGE_KEY = 'human-unknown:sound-enabled';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function safeStoredPreference() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function savePreference(enabled) {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch (error) {
      // The sound control remains functional when storage is unavailable.
    }
  }

  class LivingSoundscape {
    constructor(toggle) {
      this.toggle = toggle;
      this.icon = toggle ? toggle.querySelector('img') : null;
      this.status = document.getElementById('soundStatus');
      this.supported = Boolean(AudioContextClass && toggle);
      this.enabled = safeStoredPreference() === 'on';
      this.sceneActive = true;
      this.activated = false;
      this.context = null;
      this.nodes = null;
      this.voices = [];
      this.noiseBuffer = null;
      this.levelData = null;
      this.driftTimers = new Set();
      this.suspendTimer = 0;
      this.visibilityTimer = 0;
      this.operationSerial = 0;
      this.telemetryFrame = 0;
      this.lastControlAt = 0;
      this.lastPupilActive = false;
      this.lastCuriosityAt = -Infinity;
      this.telemetry = {
        level: 0,
        world: 0,
        contact: 0,
        stillness: 0,
        approach: 0,
        growth: 0,
        decay: 0,
        transfer: 0,
      };

      this.handleToggle = this.handleToggle.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      this.handleGesture = this.handleGesture.bind(this);
      this.handleVisibility = this.handleVisibility.bind(this);

      if (!this.supported) {
        this.setUiState('unsupported');
        if (this.toggle) this.toggle.disabled = true;
        return;
      }

      this.toggle.addEventListener('click', this.handleToggle);
      document.addEventListener('keydown', this.handleKeydown);
      document.addEventListener('pointerdown', this.handleGesture, { capture: true });
      document.addEventListener('visibilitychange', this.handleVisibility);
      this.setUiState(this.enabled ? 'armed' : 'off');
    }

    createGain(value = 0) {
      const gain = this.context.createGain();
      gain.gain.value = value;
      return gain;
    }

    createPanner(value = 0) {
      if (typeof this.context.createStereoPanner === 'function') {
        const panner = this.context.createStereoPanner();
        panner.pan.value = value;
        return panner;
      }

      const gain = this.context.createGain();
      gain.pan = {
        value,
        cancelScheduledValues() {},
        setTargetAtTime() {},
      };
      return gain;
    }

    glide(parameter, value, now, timeConstant) {
      parameter.cancelScheduledValues(now);
      parameter.setTargetAtTime(value, now, timeConstant);
    }

    createNoiseBuffer(duration = 8) {
      const length = Math.floor(this.context.sampleRate * duration);
      const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      let brown = 0;
      let drift = 0;

      for (let index = 0; index < length; index += 1) {
        const white = Math.random() * 2 - 1;
        brown = (brown + white * 0.026) / 1.022;
        drift = drift * 0.9992 + white * 0.0008;
        data[index] = clamp(brown * 2.7 + white * 0.075 + drift * 0.42, -1, 1);
      }

      return buffer;
    }

    createNoiseSource(offset = 0) {
      const source = this.context.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      source.start(this.context.currentTime, offset % this.noiseBuffer.duration);
      return source;
    }

    createMetabolismVoice(index) {
      const noise = this.createNoiseSource(randomBetween(0, this.noiseBuffer.duration));
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 420 + index * 170;
      filter.Q.value = 0.72;

      const noiseGain = this.createGain(0);
      const tone = this.context.createOscillator();
      tone.type = index === 1 ? 'triangle' : 'sine';
      tone.frequency.value = 96 + index * 31;
      const toneGain = this.createGain(0);
      const panner = this.createPanner(0);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(panner);
      tone.connect(toneGain);
      toneGain.connect(panner);
      panner.connect(this.nodes.metabolismBus);
      tone.start();

      return {
        noise,
        filter,
        noiseGain,
        tone,
        toneGain,
        panner,
      };
    }

    buildGraph() {
      const context = this.context;
      const master = this.createGain(0);
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 20;
      compressor.ratio.value = 3.2;
      compressor.attack.value = 0.045;
      compressor.release.value = 0.72;

      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.84;

      const mix = this.createGain(1);
      const worldBus = this.createGain(1);
      const interactionBus = this.createGain(1);
      const metabolismBus = this.createGain(1);

      worldBus.connect(mix);
      interactionBus.connect(mix);
      metabolismBus.connect(mix);
      mix.connect(compressor);
      compressor.connect(master);
      master.connect(analyser);
      analyser.connect(context.destination);

      this.nodes = {
        master,
        compressor,
        analyser,
        mix,
        worldBus,
        interactionBus,
        metabolismBus,
      };
      this.noiseBuffer = this.createNoiseBuffer();
      this.levelData = new Float32Array(analyser.fftSize);

      const massFilter = context.createBiquadFilter();
      massFilter.type = 'lowpass';
      massFilter.frequency.value = 178;
      massFilter.Q.value = 0.76;
      const massA = context.createOscillator();
      massA.type = 'sine';
      massA.frequency.value = 47.5;
      const massAGain = this.createGain(0.020);
      const massB = context.createOscillator();
      massB.type = 'sine';
      massB.frequency.value = 74.2;
      const massBGain = this.createGain(0.008);

      massA.connect(massAGain);
      massB.connect(massBGain);
      massAGain.connect(massFilter);
      massBGain.connect(massFilter);
      massFilter.connect(worldBus);
      massA.start();
      massB.start();

      const worldNoise = this.createNoiseSource(randomBetween(0, this.noiseBuffer.duration));
      const worldNoiseFilter = context.createBiquadFilter();
      worldNoiseFilter.type = 'lowpass';
      worldNoiseFilter.frequency.value = 540;
      worldNoiseFilter.Q.value = 0.88;
      const worldNoisePanner = this.createPanner(-0.08);
      const worldNoiseGain = this.createGain(0.018);
      worldNoise.connect(worldNoiseFilter);
      worldNoiseFilter.connect(worldNoisePanner);
      worldNoisePanner.connect(worldNoiseGain);
      worldNoiseGain.connect(worldBus);

      const airNoise = this.createNoiseSource(randomBetween(0, this.noiseBuffer.duration));
      const airFilter = context.createBiquadFilter();
      airFilter.type = 'bandpass';
      airFilter.frequency.value = 2240;
      airFilter.Q.value = 0.62;
      const airPanner = this.createPanner(0.12);
      const airGain = this.createGain(0.005);
      airNoise.connect(airFilter);
      airFilter.connect(airPanner);
      airPanner.connect(airGain);
      airGain.connect(worldBus);

      const contactNoise = this.createNoiseSource(randomBetween(0, this.noiseBuffer.duration));
      const contactFilter = context.createBiquadFilter();
      contactFilter.type = 'bandpass';
      contactFilter.frequency.value = 780;
      contactFilter.Q.value = 1.1;
      const contactPanner = this.createPanner(0);
      const contactGain = this.createGain(0);
      contactNoise.connect(contactFilter);
      contactFilter.connect(contactPanner);
      contactPanner.connect(contactGain);
      contactGain.connect(interactionBus);

      const focusTone = context.createOscillator();
      focusTone.type = 'sine';
      focusTone.frequency.value = 103;
      const focusOvertone = context.createOscillator();
      focusOvertone.type = 'sine';
      focusOvertone.frequency.value = 227;
      const focusToneGain = this.createGain(0);
      const focusOvertoneGain = this.createGain(0);
      const focusPanner = this.createPanner(0);
      focusTone.connect(focusToneGain);
      focusOvertone.connect(focusOvertoneGain);
      focusToneGain.connect(focusPanner);
      focusOvertoneGain.connect(focusPanner);
      focusPanner.connect(interactionBus);
      focusTone.start();
      focusOvertone.start();

      Object.assign(this.nodes, {
        massA,
        massAGain,
        massB,
        massBGain,
        massFilter,
        worldNoise,
        worldNoiseFilter,
        worldNoisePanner,
        worldNoiseGain,
        airNoise,
        airFilter,
        airPanner,
        airGain,
        contactNoise,
        contactFilter,
        contactPanner,
        contactGain,
        focusTone,
        focusOvertone,
        focusToneGain,
        focusOvertoneGain,
        focusPanner,
      });

      this.voices = [0, 1, 2].map((index) => this.createMetabolismVoice(index));
      this.scheduleWorldDrift();
    }

    scheduleWorldDrift() {
      const schedule = (minimum, maximum, callback) => {
        const queue = () => {
          const timer = window.setTimeout(() => {
            this.driftTimers.delete(timer);
            if (!this.context || !this.nodes) return;
            callback(this.context.currentTime);
            queue();
          }, randomBetween(minimum, maximum));
          this.driftTimers.add(timer);
        };
        queue();
      };

      schedule(3600, 8400, (now) => {
        this.nodes.massFilter.frequency.setTargetAtTime(randomBetween(132, 228), now, 1.8);
        this.nodes.massAGain.gain.setTargetAtTime(randomBetween(0.016, 0.024), now, 2.4);
        this.nodes.massB.frequency.setTargetAtTime(randomBetween(68, 81), now, 2.8);
      });

      schedule(2700, 6900, (now) => {
        this.nodes.worldNoiseFilter.frequency.setTargetAtTime(randomBetween(390, 760), now, 1.5);
        this.nodes.worldNoiseGain.gain.setTargetAtTime(randomBetween(0.013, 0.022), now, 2.1);
        this.nodes.worldNoisePanner.pan.setTargetAtTime(randomBetween(-0.22, 0.22), now, 2.7);
      });

      schedule(5100, 11800, (now) => {
        this.nodes.airFilter.frequency.setTargetAtTime(randomBetween(1500, 3900), now, 2.6);
        this.nodes.airGain.gain.setTargetAtTime(randomBetween(0.003, 0.0065), now, 2.2);
        this.nodes.airPanner.pan.setTargetAtTime(randomBetween(-0.34, 0.34), now, 3.2);
      });
    }

    async ensureAudio() {
      if (!this.supported) return false;

      if (!this.context) {
        try {
          this.context = new AudioContextClass({ latencyHint: 'interactive' });
        } catch (error) {
          this.context = new AudioContextClass();
        }
        this.buildGraph();
      }

      if (this.context.state !== 'running') {
        try {
          await this.context.resume();
        } catch (error) {
          this.activated = false;
          return false;
        }
      }

      this.activated = this.context.state === 'running';
      return this.activated;
    }

    async setEnabled(enabled, persist = true) {
      if (!this.supported) return false;
      const operation = ++this.operationSerial;
      this.enabled = Boolean(enabled);
      if (persist) savePreference(this.enabled);
      window.clearTimeout(this.suspendTimer);

      if (this.enabled) {
        this.setUiState('starting');
        const didStart = await this.ensureAudio();
        if (operation !== this.operationSerial || !this.enabled) return false;
        if (!didStart) {
          this.setUiState('armed');
          return false;
        }

        const now = this.context.currentTime;
        this.nodes.master.gain.cancelScheduledValues(now);
        this.nodes.master.gain.setValueAtTime(this.nodes.master.gain.value, now);
        this.nodes.master.gain.setTargetAtTime(this.sceneActive ? 0.72 : 0, now, 0.52);
        this.setUiState('on');
        return true;
      }

      this.setUiState('off');
      if (!this.context || !this.nodes) return true;

      const now = this.context.currentTime;
      this.nodes.master.gain.cancelScheduledValues(now);
      this.nodes.master.gain.setValueAtTime(this.nodes.master.gain.value, now);
      this.nodes.master.gain.setTargetAtTime(0, now, 0.20);
      this.suspendTimer = window.setTimeout(() => {
        if (!this.enabled && this.context && this.context.state === 'running') {
          this.context.suspend().catch(() => {});
        }
      }, 1150);
      return true;
    }

    async handleToggle(event) {
      event.preventDefault();
      event.stopPropagation();
      if (this.enabled && !this.activated) {
        await this.setEnabled(true, false);
      } else {
        await this.setEnabled(!this.enabled);
      }
    }

    async handleGesture(event) {
      if (!this.enabled || this.activated) return;
      if (this.toggle && this.toggle.contains(event.target)) return;
      await this.setEnabled(true, false);
    }

    async handleKeydown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        if (this.enabled && !this.activated) {
          await this.setEnabled(true, false);
        } else {
          await this.setEnabled(!this.enabled);
        }
      }
    }

    handleVisibility() {
      if (!this.context || !this.nodes) return;
      window.clearTimeout(this.visibilityTimer);

      if (document.hidden) {
        const now = this.context.currentTime;
        this.nodes.master.gain.cancelScheduledValues(now);
        this.nodes.master.gain.setTargetAtTime(0, now, 0.12);
        this.visibilityTimer = window.setTimeout(() => {
          if (document.hidden && this.context && this.context.state === 'running') {
            this.context.suspend().catch(() => {});
          }
        }, 620);
      } else if (this.enabled) {
        this.ensureAudio().then((didStart) => {
          if (!didStart || !this.nodes || !this.enabled || document.hidden) return;
          const now = this.context.currentTime;
          this.nodes.master.gain.setTargetAtTime(this.sceneActive ? 0.72 : 0, now, 0.42);
          this.setUiState('on');
        });
      }
    }

    setSceneActive(active) {
      this.sceneActive = Boolean(active);
      if (!this.context || !this.nodes) return;

      const now = this.context.currentTime;
      const target = this.enabled && this.sceneActive && !document.hidden ? 0.72 : 0;
      this.nodes.master.gain.cancelScheduledValues(now);
      this.nodes.master.gain.setValueAtTime(this.nodes.master.gain.value, now);
      this.nodes.master.gain.setTargetAtTime(target, now, target > 0 ? 0.42 : 0.16);
    }

    setUiState(state) {
      if (!this.toggle) return;
      const visiblyOn = state === 'on' || state === 'starting' || state === 'armed';
      const label = visiblyOn
        ? state === 'armed'
          ? '声音已开启，触碰页面后播放'
          : '关闭声音'
        : state === 'unsupported'
          ? '当前浏览器不支持声音'
          : '开启声音';

      this.toggle.dataset.soundState = state;
      this.toggle.classList.toggle('is-on', visiblyOn);
      this.toggle.setAttribute('aria-pressed', String(visiblyOn));
      this.toggle.setAttribute('aria-busy', String(state === 'starting'));
      this.toggle.setAttribute('aria-label', label);
      this.toggle.title = label;
      if (this.icon) {
        this.icon.src = visiblyOn
          ? 'assets/tabler-volume.svg'
          : 'assets/tabler-volume-off.svg';
      }
      if (this.status) {
        this.status.textContent = state === 'on'
          ? '声音已开启'
          : state === 'armed'
            ? '声音将在触碰页面后开启'
            : '声音已关闭';
      }
    }

    getWaveEnergy(waves, now) {
      if (!Array.isArray(waves) || waves.length === 0) return 0;
      return clamp(waves.reduce((total, wave) => {
        const progress = clamp((now - wave.startedAt) / wave.duration, 0, 1);
        return total + wave.energy * Math.pow(1 - progress, 1.45);
      }, 0), 0, 1);
    }

    updateMetabolismVoices(events, now, audioNow) {
      const levels = { growth: 0, decay: 0, transfer: 0 };

      this.voices.forEach((voice, index) => {
        const event = events && events[index];
        if (!event) {
          this.glide(voice.noiseGain.gain, 0, audioNow, 0.15);
          this.glide(voice.toneGain.gain, 0, audioNow, 0.15);
          return;
        }

        const rawProgress = (now - event.startedAt) / event.duration;
        const active = rawProgress >= 0 && rawProgress <= 1;
        const progress = clamp(rawProgress, 0, 1);
        const energy = active ? clamp(event.energy || 0.9, 0, 1.18) : 0;
        let envelope = 0;
        let frequency = 520;
        let resonance = 0.8;
        let noiseLevel = 0;
        let toneLevel = 0;
        let toneFrequency = 110;
        let type = 'transfer';

        if (event.kind > 0.5) {
          type = 'growth';
          envelope = smoothstep(0.02, 0.18, progress)
            * (1 - smoothstep(0.80, 1, progress));
          frequency = 380 + progress * 920 + Math.sin(progress * Math.PI * 3) * 80;
          resonance = 0.72 + progress * 0.68;
          noiseLevel = envelope * energy * 0.0125;
          toneLevel = envelope * energy * 0.0024;
          toneFrequency = 102 + progress * 96;
        } else if (event.kind < -0.5) {
          type = 'decay';
          envelope = smoothstep(0.01, 0.10, progress)
            * (1 - smoothstep(0.84, 1, progress));
          frequency = 1420 - progress * 1050 + Math.sin(progress * 21) * 65;
          resonance = 1.12 + smoothstep(0.24, 0.90, progress) * 1.1;
          noiseLevel = envelope * energy * (0.0115 + progress * 0.0030);
          toneLevel = envelope * energy * 0.0018 * (1 - progress * 0.58);
          toneFrequency = 164 - progress * 78;
        } else {
          envelope = smoothstep(0.02, 0.13, progress)
            * (1 - smoothstep(0.82, 1, progress));
          frequency = 660 + Math.sin(progress * Math.PI) * 940;
          resonance = 0.64 + Math.sin(progress * Math.PI) * 0.72;
          noiseLevel = envelope * energy * 0.008;
          toneLevel = envelope * energy * 0.0014;
          toneFrequency = 128 + Math.sin(progress * Math.PI) * 82;
        }

        const travel = type === 'transfer'
          ? event.directionX * event.seed * progress * 0.55
          : 0;
        const pan = clamp(event.x + travel, -0.78, 0.78);
        this.glide(voice.filter.frequency, clamp(frequency, 120, 2600), audioNow, 0.08);
        this.glide(voice.filter.Q, resonance, audioNow, 0.10);
        this.glide(voice.noiseGain.gain, noiseLevel, audioNow, 0.08);
        this.glide(voice.tone.frequency, toneFrequency, audioNow, 0.12);
        this.glide(voice.toneGain.gain, toneLevel, audioNow, 0.10);
        this.glide(voice.panner.pan, pan, audioNow, 0.09);
        levels[type] += noiseLevel + toneLevel;
      });

      return levels;
    }

    triggerCuriosity(strength, pan) {
      if (!this.context || !this.nodes || this.context.state !== 'running') return;
      const audioNow = this.context.currentTime;
      const amount = clamp(strength || 0.8, 0.55, 1);
      const panner = this.createPanner(clamp(pan, -0.34, 0.34));
      const eventBus = this.createGain(1);
      eventBus.connect(panner);
      panner.connect(this.nodes.interactionBus);

      const low = this.context.createOscillator();
      low.type = 'sine';
      low.frequency.setValueAtTime(82 + amount * 12, audioNow);
      low.frequency.exponentialRampToValueAtTime(43, audioNow + 1.35);
      const lowGain = this.createGain(0.0001);
      lowGain.gain.exponentialRampToValueAtTime(0.026 * amount, audioNow + 0.22);
      lowGain.gain.setTargetAtTime(0.0001, audioNow + 0.56, 0.42);
      low.connect(lowGain);
      lowGain.connect(eventBus);

      const upper = this.context.createOscillator();
      upper.type = 'sine';
      upper.frequency.setValueAtTime(178, audioNow);
      upper.frequency.exponentialRampToValueAtTime(438 + amount * 170, audioNow + 0.92);
      const upperGain = this.createGain(0.0001);
      upperGain.gain.exponentialRampToValueAtTime(0.006 * amount, audioNow + 0.36);
      upperGain.gain.setTargetAtTime(0.0001, audioNow + 0.88, 0.36);
      upper.connect(upperGain);
      upperGain.connect(eventBus);

      const noise = this.context.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;
      const noiseFilter = this.context.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(540, audioNow);
      noiseFilter.frequency.exponentialRampToValueAtTime(1760, audioNow + 1.18);
      noiseFilter.Q.value = 0.86;
      const noiseGain = this.createGain(0.0001);
      noiseGain.gain.exponentialRampToValueAtTime(0.010 * amount, audioNow + 0.30);
      noiseGain.gain.setTargetAtTime(0.0001, audioNow + 0.74, 0.40);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(eventBus);

      low.start(audioNow);
      upper.start(audioNow);
      noise.start(audioNow, randomBetween(0, this.noiseBuffer.duration), 2.3);
      low.stop(audioNow + 2.5);
      upper.stop(audioNow + 2.5);

      low.addEventListener('ended', () => {
        low.disconnect();
        upper.disconnect();
        noise.disconnect();
        lowGain.disconnect();
        upperGain.disconnect();
        noiseFilter.disconnect();
        noiseGain.disconnect();
        eventBus.disconnect();
        panner.disconnect();
      }, { once: true });
    }

    update(state, deltaSeconds) {
      if (!this.enabled || !this.activated || !this.context || !this.nodes) {
        return;
      }
      if (this.context.state !== 'running') return;

      const now = performance.now();
      if (now - this.lastControlAt < 42) return;
      this.lastControlAt = now;

      const pointer = state.pointer || {};
      const presence = state.presence || {};
      const pupil = state.pupil || {};
      const metabolism = state.metabolism || {};
      const audioNow = this.context.currentTime;
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const pan = clamp((pointer.x / width) * 2 - 1, -0.72, 0.72);
      const vertical = clamp(pointer.y / height, 0, 1);
      const speed = Math.max(0, pointer.speed || 0);
      const speedAmount = 1 - Math.exp(-speed / 430);
      const disturbance = clamp(pointer.disturbance || 0, 0, 1);
      const stillness = clamp(pointer.stillness || 0, 0, 1);
      const waveEnergy = this.getWaveEnergy(state.waves, now);
      const study = clamp(presence.study || 0, 0, 1);
      const approach = clamp(presence.approach || 0, 0, 1);
      const movingLevel = clamp(
        disturbance * 0.72 + speedAmount * 0.24 + waveEnergy * 0.34,
        0,
        1
      );
      const contactLevel = movingLevel * (0.007 + speedAmount * 0.034);
      const focusLevel = clamp(study * 0.76 + stillness * 0.18, 0, 1)
        * (1 - speedAmount * 0.72);

      this.glide(
        this.nodes.contactFilter.frequency,
        420 + speedAmount * 1680 + (1 - vertical) * 360,
        audioNow,
        speedAmount > 0.18 ? 0.028 : 0.11
      );
      this.glide(this.nodes.contactFilter.Q, 0.82 + focusLevel * 2.4, audioNow, 0.08);
      this.glide(this.nodes.contactPanner.pan, pan, audioNow, 0.035);
      this.glide(this.nodes.contactGain.gain, contactLevel, audioNow, 0.055);

      this.glide(this.nodes.focusTone.frequency, 92 + pan * 8 + approach * 17, audioNow, 0.18);
      this.glide(this.nodes.focusOvertone.frequency, 214 + vertical * 42 + study * 51, audioNow, 0.24);
      this.glide(
        this.nodes.focusToneGain.gain,
        focusLevel * 0.0046 + approach * 0.0078,
        audioNow,
        0.22
      );
      this.glide(
        this.nodes.focusOvertoneGain.gain,
        focusLevel * 0.0016 + approach * 0.0022,
        audioNow,
        0.28
      );
      this.glide(this.nodes.focusPanner.pan, pan * 0.46, audioNow, 0.18);
      this.glide(
        this.nodes.worldBus.gain,
        1 - approach * 0.17 - study * 0.08,
        audioNow,
        0.36
      );

      const metabolismLevels = this.updateMetabolismVoices(
        metabolism.events,
        now,
        audioNow
      );

      if (
        pupil.active
        && !this.lastPupilActive
        && now - this.lastCuriosityAt > 2200
      ) {
        this.triggerCuriosity(pupil.amplitude || pupil.value || 0.8, pan);
        this.lastCuriosityAt = now;
      }
      this.lastPupilActive = Boolean(pupil.active);

      this.telemetry.world = this.nodes.worldBus.gain.value;
      this.telemetry.contact = contactLevel;
      this.telemetry.stillness = focusLevel;
      this.telemetry.approach = approach;
      this.telemetry.growth = metabolismLevels.growth;
      this.telemetry.decay = metabolismLevels.decay;
      this.telemetry.transfer = metabolismLevels.transfer;

      this.telemetryFrame += 1;
      if (this.telemetryFrame % 8 === 0) this.updateTelemetry(deltaSeconds);
    }

    updateTelemetry() {
      if (!this.nodes || !this.levelData || !this.toggle) return;
      this.nodes.analyser.getFloatTimeDomainData(this.levelData);
      let sum = 0;
      for (let index = 0; index < this.levelData.length; index += 1) {
        sum += this.levelData[index] * this.levelData[index];
      }
      const rms = Math.sqrt(sum / this.levelData.length);
      this.telemetry.level = rms;
      this.toggle.dataset.soundLevel = rms.toFixed(4);
      this.toggle.dataset.worldLevel = this.telemetry.world.toFixed(3);
      this.toggle.dataset.contactLevel = this.telemetry.contact.toFixed(4);
      this.toggle.dataset.stillnessLevel = this.telemetry.stillness.toFixed(3);
      this.toggle.dataset.approachLevel = this.telemetry.approach.toFixed(3);
      this.toggle.dataset.growthLevel = this.telemetry.growth.toFixed(4);
      this.toggle.dataset.decayLevel = this.telemetry.decay.toFixed(4);
      this.toggle.dataset.transferLevel = this.telemetry.transfer.toFixed(4);
      const visibleLevel = clamp(rms * 24, 0, 1);
      this.toggle.style.setProperty('--sound-glow', `${8 + visibleLevel * 15}px`);
      this.toggle.style.setProperty(
        '--sound-glow-alpha',
        (0.015 + visibleLevel * 0.04).toFixed(3)
      );
    }

    getState() {
      return {
        supported: this.supported,
        enabled: this.enabled,
        sceneActive: this.sceneActive,
        activated: this.activated,
        contextState: this.context ? this.context.state : 'uninitialized',
        uiState: this.toggle ? this.toggle.dataset.soundState : 'missing',
        telemetry: { ...this.telemetry },
      };
    }

    destroy() {
      window.clearTimeout(this.suspendTimer);
      window.clearTimeout(this.visibilityTimer);
      this.driftTimers.forEach((timer) => window.clearTimeout(timer));
      this.driftTimers.clear();
      if (this.toggle) this.toggle.removeEventListener('click', this.handleToggle);
      document.removeEventListener('keydown', this.handleKeydown);
      document.removeEventListener('pointerdown', this.handleGesture, { capture: true });
      document.removeEventListener('visibilitychange', this.handleVisibility);
      if (this.context && this.context.state !== 'closed') {
        this.context.close().catch(() => {});
      }
    }
  }

  window.LivingSoundscape = LivingSoundscape;
})();
