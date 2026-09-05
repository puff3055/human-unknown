(() => {
  'use strict';

  const SCENE_COUNT = 6;
  const SCENE_COPY = Object.freeze({
    1: {
      instruction: '向下滚动进入这具身体',
      action: '开始坠入',
      announcement: '第一幕。你正在坠入一具更大的身体。',
    },
    2: {
      instruction: '按住画面，沿亮线向右上拖动',
      action: '观看伸展',
      announcement: '第二幕。按住叶面，朝光慢慢拖动。',
    },
    3: {
      instruction: '继续向右上拖动，唤醒远处节点',
      action: '观看回应',
      announcement: '第三幕。远处也在回应。',
    },
    4: {
      instruction: '向下滚动，光会沿同一脉络下潜',
      action: '观看下潜',
      announcement: '第四幕。顺着脉络，向下。',
    },
    5: {
      instruction: '点击中央光点，让资源开始流动',
      action: '让它流过去',
      announcement: '第五幕。丰沛区和需求区属于同一个生命。',
    },
    6: {
      instruction: '',
      action: '',
      announcement: '第六幕。你经历的是一整个正在感知、流动、彼此构成的生命。',
    },
  });

  const SOURCE_LABELS = Object.freeze({
    'green-planet': '候选灵感：纪录片《绿色星球》。',
    semiosis: '候选灵感：苏·伯克的小说《共生》 Semiosis。',
    'vaster-than-empires': '候选灵感：厄休拉·勒古恩的短篇《比帝国辽阔，比帝国缓慢》。',
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(from, to, amount) {
    return from + (to - from) * amount;
  }

  function easeOutQuart(value) {
    return 1 - Math.pow(1 - clamp(value, 0, 1), 4);
  }

  function easeInOutCubic(value) {
    const amount = clamp(value, 0, 1);
    return amount < 0.5
      ? 4 * amount * amount * amount
      : 1 - Math.pow(-2 * amount + 2, 3) / 2;
  }

  function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function padScene(scene) {
    return String(scene).padStart(2, '0');
  }

  class SignalRenderer {
    constructor(canvas, reducedMotion) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d', { alpha: true });
      this.reducedMotion = reducedMotion;
      this.width = 0;
      this.height = 0;
      this.pixelRatio = 1;
      this.motes = Array.from({ length: 28 }, (_, index) => ({
        x: ((index * 73) % 997) / 997,
        y: ((index * 191) % 991) / 991,
        phase: index * 0.71,
        size: 0.55 + (index % 4) * 0.33,
      }));
      this.resize();
    }

    resize() {
      this.width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
      this.height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
      this.pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = Math.round(this.width * this.pixelRatio);
      this.canvas.height = Math.round(this.height * this.pixelRatio);
      this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }

    clear() {
      this.context.clearRect(0, 0, this.width, this.height);
    }

    drawGlow(x, y, intensity = 1, radius = 4) {
      const context = this.context;
      const strength = clamp(intensity, 0, 1.6);
      const haloRadius = 34 + strength * 28;
      context.save();
      context.globalCompositeOperation = 'lighter';
      const halo = context.createRadialGradient(x, y, 0, x, y, haloRadius);
      halo.addColorStop(0, `rgba(255, 248, 211, ${0.38 * strength})`);
      halo.addColorStop(.2, `rgba(255, 226, 142, ${0.2 * strength})`);
      halo.addColorStop(1, 'rgba(255, 214, 126, 0)');
      context.fillStyle = halo;
      context.beginPath();
      context.arc(x, y, haloRadius, 0, Math.PI * 2);
      context.fill();
      context.shadowColor = `rgba(255, 238, 181, ${0.9 * strength})`;
      context.shadowBlur = 20 + strength * 25;
      context.fillStyle = `rgba(255, 249, 221, ${0.68 + strength * 0.2})`;
      context.beginPath();
      context.arc(x, y, radius + strength * 2.2, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 6;
      context.strokeStyle = `rgba(255, 250, 226, ${0.5 + strength * 0.28})`;
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(x, y, radius + 13 + strength * 5, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    drawRing(x, y, phase, intensity = 1) {
      const amount = clamp(phase, 0, 1);
      const context = this.context;
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = `rgba(255, 235, 172, ${(1 - amount) * .42 * intensity})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(x, y, 18 + amount * 48, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    drawLine(from, to, amount, alpha = 0.5, bend = 0) {
      if (amount <= 0) return;
      const context = this.context;
      const end = {
        x: lerp(from.x, to.x, amount),
        y: lerp(from.y, to.y, amount),
      };
      const control = {
        x: (from.x + end.x) / 2 + (end.y - from.y) * bend,
        y: (from.y + end.y) / 2 - (end.x - from.x) * bend,
      };
      context.save();
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = `rgba(239, 207, 117, ${alpha * .28})`;
      context.lineWidth = 5.5;
      context.shadowColor = 'rgba(244, 218, 145, .72)';
      context.shadowBlur = 20;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.quadraticCurveTo(control.x, control.y, end.x, end.y);
      context.stroke();
      context.shadowBlur = 8;
      context.strokeStyle = `rgba(255, 241, 194, ${alpha})`;
      context.lineWidth = 1.7;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.quadraticCurveTo(control.x, control.y, end.x, end.y);
      context.stroke();
      context.restore();
    }

    quadraticPoint(from, control, to, amount) {
      const inverse = 1 - amount;
      return {
        x: inverse * inverse * from.x + 2 * inverse * amount * control.x + amount * amount * to.x,
        y: inverse * inverse * from.y + 2 * inverse * amount * control.y + amount * amount * to.y,
      };
    }

    drawMotes(time, energy) {
      if (energy <= 0.02) return;
      const context = this.context;
      context.save();
      context.globalCompositeOperation = 'lighter';
      this.motes.forEach((mote) => {
        const drift = this.reducedMotion ? 0 : Math.sin(time * 0.00032 + mote.phase) * 8;
        const alpha = (0.08 + Math.sin(time * 0.0011 + mote.phase) * 0.035) * energy;
        context.fillStyle = `rgba(247, 230, 174, ${Math.max(0.025, alpha)})`;
        context.beginPath();
        context.arc(
          mote.x * this.width + drift,
          mote.y * this.height - drift * 0.45,
          mote.size,
          0,
          Math.PI * 2
        );
        context.fill();
      });
      context.restore();
    }

    sceneSignalPoint(scene, progress, time, sceneEnteredAt) {
      const width = this.width;
      const height = this.height;
      if (scene === 1) {
        const intro = this.reducedMotion ? 1 : easeOutQuart((time - sceneEnteredAt) / 1700);
        return { x: width * .5, y: height * lerp(.18, .57, intro) };
      }
      if (scene === 2) {
        return {
          x: width * lerp(.29, .725, progress.growth),
          y: height * lerp(.635, .16, progress.growth),
        };
      }
      if (scene === 3) {
        return {
          x: width * lerp(.532, .635, progress.response),
          y: height * lerp(.526, .348, progress.response),
        };
      }
      if (scene === 4) {
        return { x: width * .5, y: height * lerp(.6, .85, progress.descent) };
      }
      if (scene === 5) {
        return this.quadraticPoint(
          { x: width * .105, y: height * .37 },
          { x: width * .51, y: height * .58 },
          { x: width * .91, y: height * .41 },
          progress.flow
        );
      }
      return { x: width * .5, y: height * .49 };
    }

    render(time, model) {
      this.clear();
      const width = this.width;
      const height = this.height;
      const scene = model.scene;
      const progress = model.progress;
      const sceneAge = Math.max(0, time - model.sceneEnteredAt);
      const actionPhase = this.reducedMotion ? .4 : (time * .0011) % 1;
      const accumulated = Math.max(progress.growth, progress.response, progress.descent, progress.flow);
      const purposefulMotion = model.actionActive || model.transition || (scene === 1 && sceneAge < 1800);
      const ambientEnergy = this.reducedMotion ? 0 : .16 + accumulated * .16;

      this.drawMotes(time, purposefulMotion ? .48 + accumulated * .52 : ambientEnergy);

      if (scene === 1) {
        const signal = this.sceneSignalPoint(scene, progress, time, model.sceneEnteredAt);
        const start = { x: width * .5, y: height * .12 };
        const intro = this.reducedMotion ? 1 : easeOutQuart(sceneAge / 1700);
        this.drawLine(start, signal, 1, .28 + intro * .42, 0);
        this.drawGlow(signal.x, signal.y, .72 + intro * .34, 4.8);
        if (intro < 1) this.drawRing(signal.x, signal.y, actionPhase, .9);
      } else if (scene === 2) {
        const from = { x: width * .29, y: height * .635 };
        const to = { x: width * .725, y: height * .16 };
        this.drawLine(from, to, 1, .13, -.035);
        this.drawLine(from, to, Math.max(.015, progress.growth), .48 + progress.growth * .46, -.035);
        const signal = this.sceneSignalPoint(scene, progress, time, model.sceneEnteredAt);
        this.drawGlow(to.x, to.y, .28, 3.2);
        this.drawGlow(signal.x, signal.y, .92 + progress.growth * .35, 5.2);
        if (model.actionActive || progress.growth < .04) this.drawRing(signal.x, signal.y, actionPhase, 1);
      } else if (scene === 3) {
        const origin = { x: width * .532, y: height * .526 };
        const signal = this.sceneSignalPoint(scene, progress, time, model.sceneEnteredAt);
        this.drawLine(origin, { x: width * .635, y: height * .348 }, Math.max(.05, progress.response), .58, -.05);
        const nodes = [
          { x: width * .29, y: height * .25 },
          { x: width * .43, y: height * .39 },
          { x: width * .77, y: height * .25 },
          { x: width * .83, y: height * .54 },
          { x: width * .28, y: height * .62 },
          { x: width * .68, y: height * .68 },
        ];
        nodes.forEach((node, index) => {
          const staggered = clamp(progress.response * 1.48 - index * .1, 0, 1);
          this.drawLine(signal, node, staggered, .18 + staggered * .52, index % 2 ? .055 : -.05);
          if (staggered > .46) {
            this.drawGlow(node.x, node.y, .46 + staggered * .34, 2.7);
            if (model.actionActive) this.drawRing(node.x, node.y, (actionPhase + index * .13) % 1, .44);
          }
        });
        this.drawGlow(signal.x, signal.y, .96 + progress.response * .34, 5.2);
        if (progress.response < .04) this.drawRing(signal.x, signal.y, actionPhase, .72);
      } else if (scene === 4) {
        const from = { x: width * .5, y: height * .6 };
        const to = { x: width * .5, y: height * .85 };
        this.drawLine(from, to, 1, .13, 0);
        this.drawLine(from, to, Math.max(.02, progress.descent), .55 + progress.descent * .4, 0);
        const signal = this.sceneSignalPoint(scene, progress, time, model.sceneEnteredAt);
        this.drawGlow(signal.x, signal.y, .92 + progress.descent * .34, 4.8);
        if (model.actionActive || progress.descent < .03) this.drawRing(signal.x, signal.y, actionPhase, .8);
        if (progress.descent > .32) {
          const branchAmount = clamp((progress.descent - .32) / .68, 0, 1);
          this.drawLine(signal, { x: width * .37, y: height * .91 }, branchAmount, .42, .08);
          this.drawLine(signal, { x: width * .64, y: height * .9 }, branchAmount, .4, -.08);
        }
      } else if (scene === 5) {
        const from = { x: width * .105, y: height * .37 };
        const control = { x: width * .51, y: height * .58 };
        const to = { x: width * .91, y: height * .41 };
        this.drawLine(from, to, 1, .11, -.17);
        this.drawLine(from, to, Math.max(.015, progress.flow), .54 + progress.flow * .45, -.17);
        const signal = this.sceneSignalPoint(scene, progress, time, model.sceneEnteredAt);
        this.drawGlow(from.x, from.y, .48 + (1 - progress.flow) * .46, 4.2);
        this.drawGlow(signal.x, signal.y, .95 + progress.flow * .38, 5.1);
        if (progress.flow < .02) this.drawRing(signal.x, signal.y, actionPhase, .88);
        if (progress.flow > 0 && progress.flow < 1) {
          const pulseCount = this.reducedMotion ? 1 : 7;
          for (let index = 0; index < pulseCount; index += 1) {
            const moving = clamp(progress.flow - index * .075, 0, 1);
            if (moving <= 0) continue;
            const pulse = this.quadraticPoint(from, control, to, moving);
            this.drawGlow(pulse.x, pulse.y, .55 + progress.flow * .4, 2.4);
          }
        }
        if (progress.flow > .44) {
          const arrival = clamp((progress.flow - .44) / .56, 0, 1);
          const receivingNodes = [
            { x: width * .79, y: height * .28 },
            { x: width * .86, y: height * .51 },
            { x: width * .72, y: height * .61 },
            { x: width * .92, y: height * .68 },
          ];
          receivingNodes.forEach((node, index) => {
            const amount = clamp(arrival * 1.35 - index * .09, 0, 1);
            this.drawLine(to, node, amount, .2 + amount * .46, index % 2 ? -.08 : .06);
            if (amount > .45) this.drawGlow(node.x, node.y, amount * .72, 2.4);
          });
        }
      } else if (scene === 6) {
        const center = { x: width * .5, y: height * .49 };
        const nodes = [
          { x: width * .23, y: height * .3 },
          { x: width * .36, y: height * .2 },
          { x: width * .64, y: height * .18 },
          { x: width * .78, y: height * .34 },
          { x: width * .3, y: height * .62 },
          { x: width * .72, y: height * .63 },
        ];
        nodes.forEach((node, index) => {
          this.drawLine(center, node, accumulated, .18 + accumulated * .28, index % 2 ? .05 : -.05);
          if (accumulated > .65) this.drawGlow(node.x, node.y, .32, 2.1);
        });
        this.drawGlow(center.x, center.y, .46 + accumulated * .45, 4);
      }

      if (model.transition) {
        const transitionAmount = easeInOutCubic((time - model.transition.start) / model.transition.duration);
        const from = this.sceneSignalPoint(model.transition.from, progress, time, model.sceneEnteredAt);
        const to = this.sceneSignalPoint(model.transition.to, progress, time, model.sceneEnteredAt);
        const carrier = {
          x: lerp(from.x, to.x, transitionAmount),
          y: lerp(from.y, to.y, transitionAmount),
        };
        this.drawLine(from, to, transitionAmount, .7, 0);
        this.drawGlow(carrier.x, carrier.y, 1.34, 6);
        if (!this.reducedMotion) this.drawRing(carrier.x, carrier.y, actionPhase, 1.1);
      }

      if (model.pointer.visible) {
        this.drawGlow(model.pointer.x, model.pointer.y, model.pointer.down ? .96 : .5, 2.1);
      }
    }
  }

  class WorldOneExperience {
    constructor(root) {
      this.root = root;
      this.contact = document.getElementById('contact');
      this.guideText = document.getElementById('guideText');
      this.canvas = document.getElementById('worldSignalCanvas');
      this.visual = document.getElementById('worldVisual');
      this.progressCurrent = document.getElementById('worldProgressCurrent');
      this.assistCopy = document.getElementById('worldAssistCopy');
      this.assistAction = document.getElementById('worldAssistAction');
      this.interactionMeter = document.getElementById('worldInteractionMeter');
      this.sceneAction = document.getElementById('worldSceneAction');
      this.menuToggle = document.getElementById('worldMenuToggle');
      this.controls = document.getElementById('worldControls');
      this.pauseButton = document.getElementById('worldPause');
      this.soundButton = document.getElementById('worldSound');
      this.pausedPanel = document.getElementById('worldPaused');
      this.status = document.getElementById('worldStatus');
      this.sceneImages = Array.from(root.querySelectorAll('[data-scene-art]'));
      this.sourceButtons = Array.from(root.querySelectorAll('[data-source]'));
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        || new URLSearchParams(window.location.search).get('motion') === 'reduced';
      this.root.dataset.motion = this.reduceMotion ? 'reduced' : 'full';
      this.renderer = new SignalRenderer(this.canvas, this.reduceMotion);
      this.soundscape = window.WorldOneSoundscape ? new window.WorldOneSoundscape() : null;
      this.active = false;
      this.entering = false;
      this.paused = false;
      this.scene = 1;
      this.sceneEnteredAt = 0;
      this.inputLockedUntil = 0;
      this.pendingAdvance = null;
      this.transition = null;
      this.transitionTimers = [];
      this.guidedAction = null;
      this.flowStartedAt = 0;
      this.flowCompletedAnnounced = false;
      this.entranceProgress = 0;
      this.entranceInside = false;
      this.entranceGuideShown = false;
      this.keyboardEntryHeld = false;
      this.keyboardEntryArmedUntil = 0;
      this.lastFrame = performance.now();
      this.lastSoundEnabled = null;
      this.dragging = false;
      this.dragScene = 0;
      this.pointer = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        previousX: window.innerWidth / 2,
        previousY: window.innerHeight / 2,
        down: false,
        visible: false,
        type: 'mouse',
        lastMovedAt: 0,
      };
      this.progress = {
        growth: 0,
        response: 0,
        descent: 0,
        flow: 0,
      };
      this.continuitySignalId = this.createSignalId();

      this.handlePointerMove = this.handlePointerMove.bind(this);
      this.handlePointerDown = this.handlePointerDown.bind(this);
      this.handlePointerUp = this.handlePointerUp.bind(this);
      this.handleWheel = this.handleWheel.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.handleVisibility = this.handleVisibility.bind(this);
      this.animate = this.animate.bind(this);

      this.bindEvents();
      this.updateSceneUi();
      requestAnimationFrame(this.animate);
    }

    createSignalId() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      return `signal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    get homeApi() {
      return window.__humanUnknown || null;
    }

    bindEvents() {
      window.addEventListener('pointermove', this.handlePointerMove, { passive: false });
      window.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
      window.addEventListener('pointerup', this.handlePointerUp, { passive: true });
      window.addEventListener('pointercancel', this.handlePointerUp, { passive: true });
      window.addEventListener('wheel', this.handleWheel, { passive: false });
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('resize', this.handleResize);
      document.addEventListener('visibilitychange', this.handleVisibility);

      document.getElementById('worldHomeHotspot').addEventListener('click', () => this.exit());
      document.getElementById('worldReplay').addEventListener('click', () => this.resetExperience());
      document.getElementById('worldReturn').addEventListener('click', () => this.exit());
      document.getElementById('worldRestart').addEventListener('click', () => this.resetExperience());
      document.getElementById('worldExit').addEventListener('click', () => this.exit());
      document.getElementById('worldResume').addEventListener('click', () => this.setPaused(false));
      this.menuToggle.addEventListener('click', () => this.toggleMenu());
      this.pauseButton.addEventListener('click', () => this.setPaused(!this.paused));
      this.soundButton.addEventListener('click', () => this.toggleSound());
      this.sceneAction.addEventListener('click', () => this.advanceFromAction());
      this.assistAction.addEventListener('click', () => this.advanceFromAction());
      this.sourceButtons.forEach((button) => {
        button.addEventListener('click', () => this.selectSource(button));
      });
      window.addEventListener('pagehide', () => this.destroy(), { once: true });
    }

    handleResize() {
      this.renderer.resize();
    }

    pointerInStage() {
      const bounds = this.visual.getBoundingClientRect();
      const inside = this.pointer.x >= bounds.left
        && this.pointer.x <= bounds.right
        && this.pointer.y >= bounds.top
        && this.pointer.y <= bounds.bottom;
      return {
        x: clamp(this.pointer.x - bounds.left, 0, bounds.width),
        y: clamp(this.pointer.y - bounds.top, 0, bounds.height),
        down: this.pointer.down,
        visible: this.pointer.visible && inside,
      };
    }

    setActionActive(active) {
      if (active) this.root.dataset.action = 'active';
      else if (!this.guidedAction && this.root.dataset.flow !== 'running') delete this.root.dataset.action;
    }

    handleVisibility() {
      if (this.soundscape) this.soundscape.setPaused(this.paused || document.hidden);
    }

    isControlTarget(target) {
      return Boolean(target.closest && target.closest('button, [role="button"], #worldControls'));
    }

    setInput(input) {
      if (!input) return;
      this.root.dataset.input = input;
    }

    handlePointerMove(event) {
      this.pointer.previousX = this.pointer.x;
      this.pointer.previousY = this.pointer.y;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.visible = true;
      this.pointer.type = event.pointerType || 'mouse';
      this.pointer.lastMovedAt = performance.now();

      if (!this.active) return;
      this.setInput(this.pointer.type === 'touch' ? 'touch' : 'pointer');
      if (this.paused || !this.dragging) return;

      const deltaX = this.pointer.x - this.pointer.previousX;
      const deltaY = this.pointer.y - this.pointer.previousY;
      if (this.dragScene === 2 || this.dragScene === 3) {
        event.preventDefault();
        this.applyLightDrag(deltaX, deltaY);
      } else if (this.dragScene === 4) {
        event.preventDefault();
        const amount = Math.max(0, -deltaY) / Math.max(180, window.innerHeight * 0.56);
        this.addDescent(amount);
      }
    }

    handlePointerDown(event) {
      this.pointer.previousX = event.clientX;
      this.pointer.previousY = event.clientY;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.down = true;
      this.pointer.visible = true;
      this.pointer.type = event.pointerType || 'mouse';
      this.pointer.lastMovedAt = performance.now();

      if (!this.active) return;
      this.setInput(this.pointer.type === 'touch' ? 'touch' : 'pointer');
      if (this.soundscape) this.soundscape.arm();
      if (this.paused || this.isControlTarget(event.target)) return;

      if (this.scene === 2 || this.scene === 3 || this.scene === 4) {
        this.dragging = true;
        this.dragScene = this.scene;
        this.setActionActive(true);
        if (this.root.setPointerCapture) {
          try {
            this.root.setPointerCapture(event.pointerId);
          } catch (error) {
            // Pointer capture is optional; window-level listeners still preserve the drag.
          }
        }
        event.preventDefault();
      }
    }

    handlePointerUp() {
      this.pointer.down = false;
      this.dragging = false;
      this.dragScene = 0;
      this.setActionActive(false);
    }

    handleWheel(event) {
      if (!this.active || this.paused || Math.abs(event.deltaY) < 3) return;
      event.preventDefault();
      if (performance.now() < this.inputLockedUntil) return;

      if (this.scene === 1 && event.deltaY > 0) {
        this.setScene(2);
      } else if (this.scene === 4 && event.deltaY > 0) {
        this.setActionActive(true);
        this.addDescent(event.deltaY / Math.max(520, window.innerHeight * 1.25));
        window.setTimeout(() => this.setActionActive(false), 180);
      }
    }

    handleKeyDown(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key;

      if (!this.active) {
        if (key === 'Enter' || key === ' ' || key === 'ArrowDown') {
          event.preventDefault();
          this.setInput('keyboard');
          this.keyboardEntryHeld = true;
          this.keyboardEntryArmedUntil = performance.now() + 4200;
          if (this.homeApi && this.homeApi.prepareKeyboardEntry) {
            this.homeApi.prepareKeyboardEntry();
          }
        }
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        if (!this.controls.hidden) this.toggleMenu(false);
        else this.toggleMenu(true);
        return;
      }

      if (key.toLowerCase() === 'm') return;
      if (this.paused) {
        if (key === 'Enter' || key === ' ') {
          event.preventDefault();
          this.setPaused(false);
        }
        return;
      }

      if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowRight') {
        event.preventDefault();
        this.setInput('keyboard');
        if (this.soundscape) this.soundscape.arm();
        this.advanceFromAction();
      }
    }

    handleKeyUp(event) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        this.keyboardEntryHeld = false;
      }
    }

    applyLightDrag(deltaX, deltaY) {
      const direction = normalize(0.72, -0.69);
      const projection = Math.max(0, deltaX * direction.x + deltaY * direction.y);
      if (projection <= 0) return;
      const amount = projection / Math.max(240, Math.min(window.innerWidth, window.innerHeight) * 0.48);

      if (this.scene === 2) {
        const previous = this.progress.growth;
        this.progress.growth = clamp(previous + amount, 0, 1);
        this.pulseAtThreshold(previous, this.progress.growth, 'signal');
        if (this.progress.growth >= 1 && previous < 1) {
          this.announce('这次伸展已经进入同一条脉络。');
          this.queueScene(3, this.reduceMotion ? 80 : 760);
        }
      } else if (this.scene === 3) {
        const previous = this.progress.response;
        this.progress.response = clamp(previous + amount, 0, 1);
        this.pulseAtThreshold(previous, this.progress.response, 'signal');
        if (this.progress.response >= 1 && previous < 1) {
          this.announce('远处的部分已经沿同一信号回应。');
          this.queueScene(4, this.reduceMotion ? 120 : 1450);
        }
      }
    }

    pulseAtThreshold(previous, current, kind) {
      const thresholds = [0.25, 0.5, 0.75, 1];
      const crossed = thresholds.find((threshold) => previous < threshold && current >= threshold);
      if (crossed && this.soundscape) {
        this.soundscape.pulse(kind, 0.38 + crossed * 0.5, lerp(-0.45, 0.45, current));
      }
    }

    addDescent(amount) {
      if (this.scene !== 4 || amount <= 0) return;
      const previous = this.progress.descent;
      this.progress.descent = clamp(previous + amount, 0, 1);
      this.pulseAtThreshold(previous, this.progress.descent, 'root');
      if (this.progress.descent >= 1 && previous < 1) {
        this.announce('同一条脉络已经抵达根部与水。');
        this.queueScene(5, this.reduceMotion ? 100 : 720);
      }
    }

    queueScene(scene, delay) {
      this.pendingAdvance = {
        scene,
        at: performance.now() + delay,
      };
    }

    advanceFromAction() {
      if (!this.active || this.paused || performance.now() < this.inputLockedUntil) return;

      if (this.scene === 1) {
        this.setScene(2);
      } else if (this.scene >= 2 && this.scene <= 4) {
        this.startGuidedAction();
      } else if (this.scene === 5) {
        if (this.progress.flow >= 1) this.setScene(6);
        else this.startFlow();
      }
    }

    startGuidedAction() {
      if (this.guidedAction || this.transition) return;
      const config = {
        2: { key: 'growth', sound: 'signal', next: 3, duration: 1450, pause: 520 },
        3: { key: 'response', sound: 'signal', next: 4, duration: 1650, pause: 620 },
        4: { key: 'descent', sound: 'root', next: 5, duration: 1750, pause: 460 },
      }[this.scene];
      if (!config) return;
      this.guidedAction = {
        ...config,
        scene: this.scene,
        from: this.progress[config.key],
        start: performance.now(),
        duration: this.reduceMotion ? 90 : config.duration,
      };
      this.assistAction.disabled = true;
      this.setActionActive(true);
      this.announce('同一束光开始沿你的方向移动。');
    }

    updateGuidedAction(now) {
      const action = this.guidedAction;
      if (!action || this.paused || this.scene !== action.scene) return;
      const amount = easeInOutCubic((now - action.start) / action.duration);
      const previous = this.progress[action.key];
      this.progress[action.key] = lerp(action.from, 1, amount);
      this.pulseAtThreshold(previous, this.progress[action.key], action.sound);
      if (amount < 1) return;

      this.progress[action.key] = 1;
      this.guidedAction = null;
      this.assistAction.disabled = false;
      this.setActionActive(false);
      this.queueScene(action.next, this.reduceMotion ? 80 : action.pause);
    }

    startFlow() {
      if (this.flowStartedAt || this.progress.flow >= 1) return;
      this.flowStartedAt = performance.now() + (this.reduceMotion ? 0 : 420);
      this.root.dataset.flow = 'running';
      this.setActionActive(true);
      this.sceneAction.setAttribute('aria-label', '资源正在同一生命中流动');
      this.assistAction.disabled = true;
      if (this.soundscape) this.soundscape.pulse('flow', 0.82, -0.38);
      this.announce('资源开始在同一生命的不同部分之间流动。');
    }

    updateFlow(now) {
      if (!this.flowStartedAt || this.progress.flow >= 1 || this.paused) return;
      if (now < this.flowStartedAt) return;
      const duration = this.reduceMotion ? 180 : 3400;
      const previous = this.progress.flow;
      this.progress.flow = clamp((now - this.flowStartedAt) / duration, 0, 1);
      this.pulseAtThreshold(previous, this.progress.flow, 'flow');

      if (this.progress.flow >= 1) {
        this.root.dataset.flow = 'complete';
        this.setActionActive(false);
        this.sceneAction.setAttribute('aria-label', '继续到本章余韵');
        this.assistCopy.textContent = '在这里，没有谁单独活着。';
        this.assistAction.textContent = '继续';
        this.assistAction.disabled = false;
        if (!this.flowCompletedAnnounced) {
          this.flowCompletedAnnounced = true;
          this.announce('流动已经抵达需求区域。可以继续进入本章余韵。');
          if (this.soundscape) this.soundscape.pulse('flow', 1, 0.48);
        }
      }
    }

    selectSource(button) {
      this.sourceButtons.forEach((item) => item.classList.toggle('is-selected', item === button));
      const label = SOURCE_LABELS[button.dataset.source] || '候选灵感来源。';
      this.announce(`${label} 正式入口将在来源核对后提供。`);
      if (this.soundscape) this.soundscape.pulse('signal', 0.42, 0);
    }

    toggleMenu(force) {
      const shouldOpen = typeof force === 'boolean' ? force : this.controls.hidden;
      this.controls.hidden = !shouldOpen;
      this.menuToggle.setAttribute('aria-expanded', String(shouldOpen));
      this.menuToggle.setAttribute('aria-label', shouldOpen ? '关闭体验控制' : '打开体验控制');
      if (shouldOpen) this.pauseButton.focus({ preventScroll: true });
      else this.root.focus({ preventScroll: true });
    }

    setPaused(paused) {
      this.paused = Boolean(paused);
      this.root.dataset.paused = String(this.paused);
      this.pausedPanel.hidden = !this.paused;
      this.pauseButton.setAttribute('aria-pressed', String(this.paused));
      this.pauseButton.textContent = this.paused ? '继续动态' : '暂停动态';
      if (this.soundscape) this.soundscape.setPaused(this.paused || document.hidden);
      if (this.paused) {
        this.toggleMenu(false);
        document.getElementById('worldResume').focus({ preventScroll: true });
        this.announce('体验已暂停。');
      } else {
        this.lastFrame = performance.now();
        this.root.focus({ preventScroll: true });
        this.announce('体验继续。');
      }
    }

    async toggleSound() {
      const state = this.homeApi && this.homeApi.getState ? this.homeApi.getState() : null;
      const enabled = !(state && state.sound && state.sound.enabled);
      if (this.homeApi && this.homeApi.setSoundEnabled) {
        await this.homeApi.setSoundEnabled(enabled);
      }
      if (this.soundscape) {
        await this.soundscape.setEnabled(enabled);
        if (enabled) await this.soundscape.arm();
      }
      this.lastSoundEnabled = enabled;
      this.updateSoundButton(enabled);
      this.announce(enabled ? '声音已开启。' : '声音已关闭。');
    }

    updateSoundButton(enabled) {
      this.soundButton.setAttribute('aria-pressed', String(enabled));
      this.soundButton.textContent = enabled ? '关闭声音' : '开启声音';
    }

    syncSoundPreference() {
      const state = this.homeApi && this.homeApi.getState ? this.homeApi.getState() : null;
      const enabled = Boolean(state && state.sound && state.sound.enabled);
      if (enabled === this.lastSoundEnabled) return;
      this.lastSoundEnabled = enabled;
      this.updateSoundButton(enabled);
      if (this.soundscape) this.soundscape.setEnabled(enabled);
    }

    announce(copy) {
      this.status.textContent = '';
      requestAnimationFrame(() => {
        this.status.textContent = copy;
      });
    }

    updateSceneUi({ announce = true } = {}) {
      const copy = SCENE_COPY[this.scene];
      this.root.dataset.scene = String(this.scene);
      this.progressCurrent.textContent = padScene(this.scene);
      this.assistCopy.textContent = copy.instruction;
      this.assistAction.textContent = copy.action;
      this.assistAction.disabled = false;
      this.sceneAction.setAttribute('aria-label', copy.action || `第 ${this.scene} 幕`);
      if (this.scene === 5) {
        this.root.dataset.flow = this.progress.flow >= 1 ? 'complete' : 'idle';
      } else {
        delete this.root.dataset.flow;
      }
      if (this.soundscape) this.soundscape.setScene(this.scene);
      if (announce) this.announce(copy.announcement);
    }

    sceneProgress() {
      if (this.scene === 1) return 0;
      if (this.scene === 2) return this.progress.growth;
      if (this.scene === 3) return this.progress.response;
      if (this.scene === 4) return this.progress.descent;
      if (this.scene === 5) return this.progress.flow;
      return 1;
    }

    updateInteractionUi() {
      const value = clamp(this.sceneProgress(), 0, 1);
      const percent = Math.round(value * 100);
      this.root.style.setProperty('--interaction-progress', `${percent}%`);

      if (this.scene === 2 && value > .01) {
        this.assistCopy.textContent = `伸展 ${percent}% · 保持向右上拖动`;
      } else if (this.scene === 3 && value > .01) {
        this.assistCopy.textContent = `回应 ${percent}% · 远处正在依次亮起`;
      } else if (this.scene === 4 && value > .01) {
        this.assistCopy.textContent = `下潜 ${percent}% · 继续向下滚动`;
      } else if (this.scene === 5 && this.root.dataset.flow === 'running') {
        this.assistCopy.textContent = value > 0
          ? `资源正在同一生命中流动 ${percent}%`
          : '停一下——让流动真正发生';
      } else if (this.scene === 5 && this.root.dataset.flow === 'complete') {
        this.assistCopy.textContent = '丰沛与需求，从来不是两个生命';
      }

      const point = {
        2: { x: lerp(29, 72.5, this.progress.growth), y: lerp(63.5, 16, this.progress.growth) },
        3: { x: lerp(53.2, 63.5, this.progress.response), y: lerp(52.6, 34.8, this.progress.response) },
        4: { x: 50, y: lerp(60, 85, this.progress.descent) },
        5: { x: lerp(10.5, 76, this.progress.flow), y: lerp(37, 47, this.progress.flow) },
      }[this.scene];
      if (point) {
        this.root.style.setProperty('--signal-label-x', `${point.x}%`);
        this.root.style.setProperty('--signal-label-y', `${point.y}%`);
      }
    }

    updateTelemetry() {
      this.root.dataset.growth = this.progress.growth.toFixed(3);
      this.root.dataset.response = this.progress.response.toFixed(3);
      this.root.dataset.descent = this.progress.descent.toFixed(3);
      this.root.dataset.flowProgress = this.progress.flow.toFixed(3);
      this.root.dataset.signalId = this.continuitySignalId;
    }

    clearTransitionTimers() {
      this.transitionTimers.forEach((timer) => window.clearTimeout(timer));
      this.transitionTimers = [];
      this.sceneImages.forEach((image) => image.classList.remove('is-incoming', 'is-exiting', 'is-entering'));
    }

    transitionMode(from, to) {
      if (to === 6) return 'arrival';
      if (from === 4) return 'down';
      return 'push';
    }

    setScene(nextScene, options = {}) {
      const next = clamp(Math.round(nextScene), 1, SCENE_COUNT);
      if (next === this.scene && !options.force) return;
      const now = performance.now();
      const currentImage = this.sceneImages.find((image) => image.classList.contains('is-current'));
      const nextImage = this.sceneImages.find((image) => Number(image.dataset.sceneArt) === next);
      if (!nextImage) return;

      this.pendingAdvance = null;
      this.guidedAction = null;
      this.dragging = false;
      this.dragScene = 0;
      this.setActionActive(false);
      this.clearTransitionTimers();

      const nextAsset = nextImage.querySelector('img');
      if (nextAsset) nextAsset.loading = 'eager';
      const followingImage = this.sceneImages.find((image) => Number(image.dataset.sceneArt) === next + 1);
      const followingAsset = followingImage && followingImage.querySelector('img');
      if (followingAsset) followingAsset.loading = 'eager';

      if (this.reduceMotion || options.immediate || !currentImage || currentImage === nextImage) {
        this.transition = null;
        delete this.root.dataset.transition;
        this.sceneImages.forEach((image) => image.classList.toggle('is-current', image === nextImage));
        this.scene = next;
        this.sceneEnteredAt = now;
        this.inputLockedUntil = now + 80;
        this.updateSceneUi({ announce: options.announce !== false });
        return;
      }

      const from = this.scene;
      const mode = this.transitionMode(from, next);
      const cutDelay = mode === 'arrival' ? 300 : 270;
      const duration = mode === 'arrival' ? 920 : 790;
      this.inputLockedUntil = now + duration;
      this.transition = { from, to: next, start: now, duration };
      this.root.dataset.transition = mode;
      currentImage.classList.add('is-exiting');
      nextImage.classList.add('is-incoming');

      const cutTimer = window.setTimeout(() => {
        if (!this.transition || this.transition.to !== next) return;
        currentImage.classList.remove('is-current', 'is-exiting');
        nextImage.classList.remove('is-incoming');
        nextImage.classList.add('is-current', 'is-entering');
        this.scene = next;
        this.sceneEnteredAt = performance.now();
        this.updateSceneUi({ announce: options.announce !== false });
      }, cutDelay);

      const finishTimer = window.setTimeout(() => {
        nextImage.classList.remove('is-entering');
        delete this.root.dataset.transition;
        this.transition = null;
        this.transitionTimers = [];
      }, duration);
      this.transitionTimers = [cutTimer, finishTimer];
    }

    updateEntrance(now, deltaSeconds) {
      if (this.entering || this.active || !this.homeApi || !this.homeApi.getState) return;
      const homeState = this.homeApi.getState();
      const phase = homeState.phase;

      if (phase === 'closer' && !this.entranceGuideShown) {
        this.entranceGuideShown = true;
        if (this.homeApi.setGuide) this.homeApi.setGuide('把光点停留在瞳孔中。');
      }

      const gaze = homeState.gaze || { x: 0, y: 0 };
      const pupilX = window.innerWidth / 2 + gaze.x;
      const pupilY = window.innerHeight / 2 + gaze.y;
      const distance = Math.hypot(this.pointer.x - pupilX, this.pointer.y - pupilY);
      const threshold = Math.max(34, Math.min(window.innerWidth, window.innerHeight) * 0.075);
      const touchRequiresHold = this.pointer.type !== 'touch' || this.pointer.down;
      const pointerEligible = this.pointer.visible && touchRequiresHold && distance <= threshold;
      const keyboardEligible = (
        this.keyboardEntryHeld || now < this.keyboardEntryArmedUntil
      ) && phase !== 'waiting';
      this.entranceInside = phase === 'closer' && (pointerEligible || keyboardEligible);

      const duration = this.reduceMotion ? 0.72 : 1.65;
      if (this.entranceInside) {
        this.entranceProgress = clamp(this.entranceProgress + deltaSeconds / duration, 0, 1);
      } else {
        this.entranceProgress = clamp(this.entranceProgress - deltaSeconds / 0.62, 0, 1);
      }

      this.contact.dataset.entryHolding = String(this.entranceInside);
      this.contact.style.setProperty('--entry-progress', this.entranceProgress.toFixed(3));
      if (this.entranceProgress >= 1) this.enter();
      if (now - this.lastFrame > 2000) this.lastFrame = now;
    }

    enter(options = {}) {
      if (this.active || this.entering) return;
      this.entering = true;
      this.entranceProgress = 1;
      this.keyboardEntryArmedUntil = 0;
      this.contact.dataset.entryHolding = 'false';
      this.contact.classList.add('is-entering');
      this.announce('正在进入群体生命。');

      const delay = this.reduceMotion || options.immediate ? 40 : 680;
      window.setTimeout(() => {
        this.root.hidden = false;
        this.root.setAttribute('aria-hidden', 'false');
        this.root.dataset.active = 'true';
        document.body.classList.add('world-one-active');
        requestAnimationFrame(() => {
          this.root.classList.add('is-visible');
          this.renderer.resize();
        });

        this.contact.classList.add('is-world-hidden');
        this.contact.inert = true;
        if (this.homeApi && this.homeApi.suspend) this.homeApi.suspend();

        this.active = true;
        this.entering = false;
        this.sceneEnteredAt = performance.now();
        this.lastFrame = this.sceneEnteredAt;
        this.inputLockedUntil = this.sceneEnteredAt + (this.reduceMotion ? 80 : 920);
        if (this.soundscape) this.soundscape.setActive(true);
        this.syncSoundPreference();
        this.updateSceneUi();
        this.root.focus({ preventScroll: true });
      }, delay);
    }

    clearProgress() {
      this.clearTransitionTimers();
      this.transition = null;
      this.guidedAction = null;
      this.progress.growth = 0;
      this.progress.response = 0;
      this.progress.descent = 0;
      this.progress.flow = 0;
      this.flowStartedAt = 0;
      this.flowCompletedAnnounced = false;
      this.pendingAdvance = null;
      delete this.root.dataset.transition;
      delete this.root.dataset.action;
      delete this.root.dataset.flow;
      this.root.style.setProperty('--interaction-progress', '0%');
      this.continuitySignalId = this.createSignalId();
      this.sourceButtons.forEach((button) => button.classList.remove('is-selected'));
    }

    resetExperience() {
      this.clearProgress();
      this.setPaused(false);
      this.toggleMenu(false);
      this.setScene(1, { force: true, immediate: this.reduceMotion });
      this.announce('群体生命从第一次坠入重新开始。');
    }

    exit(options = {}) {
      if (!this.active && !this.entering) return;
      this.pendingAdvance = null;
      this.guidedAction = null;
      this.transition = null;
      this.clearTransitionTimers();
      this.dragging = false;
      this.pointer.down = false;
      this.active = false;
      this.entering = false;
      this.root.dataset.active = 'false';
      this.root.classList.remove('is-visible', 'show-assist');
      delete this.root.dataset.transition;
      delete this.root.dataset.action;
      this.root.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('world-one-active');
      this.controls.hidden = true;
      this.pausedPanel.hidden = true;
      this.paused = false;
      if (this.soundscape) {
        this.soundscape.setPaused(false);
        this.soundscape.setActive(false);
      }

      this.contact.inert = false;
      this.contact.classList.remove('is-world-hidden', 'is-entering');
      this.contact.dataset.entryHolding = 'false';
      this.contact.style.setProperty('--entry-progress', '0');
      this.entranceProgress = 0;
      this.entranceInside = false;
      if (this.homeApi && this.homeApi.resume) this.homeApi.resume();

      const delay = this.reduceMotion || options.immediate ? 20 : 1050;
      window.setTimeout(() => {
        if (!this.active) {
          this.root.hidden = true;
          this.clearProgress();
          this.setScene(1, { force: true, immediate: true, announce: false });
          this.updateTelemetry();
        }
      }, delay);
      this.announce('已返回 HUMAN UNKNOWN 入口。');
    }

    animate(now) {
      const deltaSeconds = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
      this.lastFrame = now;

      if (!this.active) {
        this.updateEntrance(now, deltaSeconds);
        requestAnimationFrame(this.animate);
        return;
      }

      this.syncSoundPreference();
      if (!this.paused) {
        this.updateGuidedAction(now);
        if (this.pendingAdvance && now >= this.pendingAdvance.at) {
          const next = this.pendingAdvance.scene;
          this.pendingAdvance = null;
          this.setScene(next);
        }
        this.updateFlow(now);
        this.updateInteractionUi();
        this.updateTelemetry();
        if (this.soundscape) {
          this.soundscape.update({
            scene: this.scene,
            progress: this.progress,
          });
        }
        const stagePointer = this.pointerInStage();
        this.renderer.render(now, {
          scene: this.scene,
          sceneEnteredAt: this.sceneEnteredAt,
          progress: this.progress,
          transition: this.transition,
          actionActive: Boolean(this.dragging || this.guidedAction || this.root.dataset.flow === 'running'),
          pointer: {
            ...stagePointer,
            visible: stagePointer.visible && now - this.pointer.lastMovedAt < 1500,
          },
          input: this.root.dataset.input,
        });
      }

      requestAnimationFrame(this.animate);
    }

    getState() {
      return {
        active: this.active,
        entering: this.entering,
        paused: this.paused,
        scene: this.scene,
        sceneCount: SCENE_COUNT,
        input: this.root.dataset.input,
        entrance: {
          progress: this.entranceProgress,
          inside: this.entranceInside,
        },
        progress: { ...this.progress },
        continuity: {
          signalId: this.continuitySignalId,
          growthCarried: this.scene >= 3 ? this.progress.growth : 0,
          responseCarried: this.scene >= 4 ? this.progress.response : 0,
          descentCarried: this.scene >= 5 ? this.progress.descent : 0,
          flowCarried: this.scene >= 6 ? this.progress.flow : 0,
        },
        reducedMotion: this.reduceMotion,
        sound: this.soundscape ? this.soundscape.getState() : null,
      };
    }

    destroy() {
      if (this.soundscape) this.soundscape.destroy();
      window.removeEventListener('pointermove', this.handlePointerMove);
      window.removeEventListener('pointerdown', this.handlePointerDown);
      window.removeEventListener('pointerup', this.handlePointerUp);
      window.removeEventListener('pointercancel', this.handlePointerUp);
      window.removeEventListener('wheel', this.handleWheel);
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('resize', this.handleResize);
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
  }

  const root = document.getElementById('worldOne');
  if (!root) return;
  const experience = new WorldOneExperience(root);
  window.__worldOne = {
    getState: () => experience.getState(),
    enterForTesting: () => experience.enter({ immediate: true }),
    goToScene: (scene) => experience.setScene(scene, { force: true, immediate: true }),
    advance: () => experience.advanceFromAction(),
    reset: () => experience.resetExperience(),
    exit: () => experience.exit({ immediate: true }),
  };
})();
