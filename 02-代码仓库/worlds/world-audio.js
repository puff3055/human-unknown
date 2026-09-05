(() => {
  'use strict';

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  class HumanUnknownAudio {
    constructor() {
      this.context = null;
      this.master = null;
      this.compressor = null;
      this.bedGain = null;
      this.noiseGain = null;
      this.filter = null;
      this.oscillators = [];
      this.enabled = false;
      this.chapter = 'entry';
      this.micStream = null;
      this.micSource = null;
      this.micAnalyser = null;
      this.micData = null;
      this.micEnabled = false;
      this.lastContact = false;
    }

    get available() {
      return Boolean(AudioContextCtor);
    }

    async enable() {
      if (!this.available) return false;
      if (!this.context) this.createGraph();
      if (this.context.state === 'suspended') await this.context.resume();
      this.enabled = true;
      this.ramp(this.master.gain, 0.14, 0.7);
      this.setChapter(this.chapter);
      return true;
    }

    disable() {
      if (!this.context || !this.master) return;
      this.enabled = false;
      this.ramp(this.master.gain, 0, 0.28);
    }

    createGraph() {
      this.context = new AudioContextCtor({ latencyHint: 'interactive' });
      const now = this.context.currentTime;

      this.master = this.context.createGain();
      this.master.gain.setValueAtTime(0, now);

      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-25, now);
      this.compressor.knee.setValueAtTime(18, now);
      this.compressor.ratio.setValueAtTime(5, now);
      this.compressor.attack.setValueAtTime(0.02, now);
      this.compressor.release.setValueAtTime(0.4, now);

      this.filter = this.context.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(420, now);
      this.filter.Q.setValueAtTime(0.7, now);

      this.bedGain = this.context.createGain();
      this.bedGain.gain.setValueAtTime(0.11, now);

      const oscillatorA = this.context.createOscillator();
      oscillatorA.type = 'sine';
      oscillatorA.frequency.setValueAtTime(43, now);
      const gainA = this.context.createGain();
      gainA.gain.setValueAtTime(0.62, now);
      oscillatorA.connect(gainA).connect(this.bedGain);
      oscillatorA.start();

      const oscillatorB = this.context.createOscillator();
      oscillatorB.type = 'triangle';
      oscillatorB.frequency.setValueAtTime(71, now);
      const gainB = this.context.createGain();
      gainB.gain.setValueAtTime(0.18, now);
      oscillatorB.connect(gainB).connect(this.bedGain);
      oscillatorB.start();

      const noise = this.context.createBufferSource();
      const noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      let previous = 0;
      for (let index = 0; index < channel.length; index += 1) {
        const white = Math.random() * 2 - 1;
        previous = previous * 0.985 + white * 0.015;
        channel[index] = previous * 0.7;
      }
      noise.buffer = noiseBuffer;
      noise.loop = true;
      this.noiseGain = this.context.createGain();
      this.noiseGain.gain.setValueAtTime(0.12, now);
      noise.connect(this.noiseGain).connect(this.bedGain);
      noise.start();

      this.bedGain.connect(this.filter).connect(this.compressor).connect(this.master).connect(this.context.destination);
      this.oscillators = [oscillatorA, oscillatorB];
    }

    ramp(parameter, target, duration = 0.2) {
      if (!this.context || !parameter) return;
      const now = this.context.currentTime;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(parameter.value, now);
      parameter.linearRampToValueAtTime(target, now + Math.max(0.01, duration));
    }

    setChapter(chapter) {
      this.chapter = chapter;
      if (!this.context || !this.oscillators.length) return;
      const settings = {
        entry: [38, 61, 280, 0.06],
        threshold: [41, 67, 340, 0.09],
        section: [47, 73, 560, 0.12],
        exchange: [36, 89, 820, 0.14],
        reality: [52, 79, 690, 0.1],
        archive: [43, 71, 380, 0.055],
      }[chapter] || [43, 71, 420, 0.08];
      const now = this.context.currentTime;
      this.oscillators[0].frequency.setTargetAtTime(settings[0], now, 0.8);
      this.oscillators[1].frequency.setTargetAtTime(settings[1], now, 0.8);
      this.filter.frequency.setTargetAtTime(settings[2], now, 0.7);
      this.bedGain.gain.setTargetAtTime(settings[3], now, 0.7);
    }

    update(snapshot) {
      if (!this.enabled || !this.context || !this.filter) return;
      const x = clamp(snapshot.pointer.x, 0, 1);
      const y = clamp(snapshot.pointer.y, 0, 1);
      const contact = snapshot.pointer.active;
      const energy = clamp(snapshot.pointer.energy + snapshot.micLevel * 0.65, 0, 1);
      const now = this.context.currentTime;

      let baseFrequency = 460 + (1 - y) * 520;
      if (snapshot.chapter === 'section') baseFrequency = 310 + (1 - y) * 880;
      if (snapshot.chapter === 'exchange') baseFrequency = 420 + snapshot.exchange.coherence * 980;
      if (snapshot.chapter === 'reality') baseFrequency = 330 + snapshot.reality.echoes * 135;
      this.filter.frequency.setTargetAtTime(baseFrequency + energy * 260, now, 0.09);

      if (contact && !this.lastContact) this.pulse('contact', x, 0.24 + energy * 0.36);
      this.lastContact = contact;
    }

    pulse(kind = 'contact', x = 0.5, strength = 0.4) {
      if (!this.enabled || !this.context || !this.master) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      const panner = this.context.createStereoPanner ? this.context.createStereoPanner() : null;
      const profiles = {
        contact: [116, 178, 0.36],
        evidence: [154, 233, 0.82],
        remote: [82, 126, 1.15],
        reply: [96, 247, 1.5],
        echo: [132, 198, 1.22],
      };
      const profile = profiles[kind] || profiles.contact;
      oscillator.type = kind === 'remote' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(profile[0], now);
      oscillator.frequency.exponentialRampToValueAtTime(profile[1], now + profile[2]);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(profile[1] * 2.4, now);
      filter.Q.setValueAtTime(1.3, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.075 * clamp(strength, 0.08, 1), now + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + profile[2]);
      oscillator.connect(filter).connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(clamp(x * 2 - 1, -0.85, 0.85), now);
        gain.connect(panner).connect(this.master);
      } else {
        gain.connect(this.master);
      }
      oscillator.start(now);
      oscillator.stop(now + profile[2] + 0.05);
    }

    async startMic() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('microphone-unavailable');
      }
      if (!this.context) await this.enable();
      if (this.context.state === 'suspended') await this.context.resume();
      if (this.micEnabled) return true;

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      this.micSource = this.context.createMediaStreamSource(this.micStream);
      this.micAnalyser = this.context.createAnalyser();
      this.micAnalyser.fftSize = 256;
      this.micAnalyser.smoothingTimeConstant = 0.74;
      this.micData = new Uint8Array(this.micAnalyser.fftSize);
      this.micSource.connect(this.micAnalyser);
      this.micEnabled = true;
      return true;
    }

    stopMic() {
      if (this.micSource) this.micSource.disconnect();
      if (this.micStream) {
        this.micStream.getTracks().forEach((track) => track.stop());
      }
      this.micStream = null;
      this.micSource = null;
      this.micAnalyser = null;
      this.micData = null;
      this.micEnabled = false;
    }

    getMicLevel() {
      if (!this.micEnabled || !this.micAnalyser || !this.micData) return 0;
      this.micAnalyser.getByteTimeDomainData(this.micData);
      let sum = 0;
      for (let index = 0; index < this.micData.length; index += 1) {
        const centered = (this.micData[index] - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / this.micData.length);
      return clamp((rms - 0.015) * 6.8, 0, 1);
    }

    destroy() {
      this.stopMic();
      if (this.context && this.context.state !== 'closed') this.context.close();
      this.context = null;
      this.enabled = false;
    }
  }

  window.HumanUnknownAudio = HumanUnknownAudio;
})();
