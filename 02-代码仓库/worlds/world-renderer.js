(() => {
  'use strict';

  const TAU = Math.PI * 2;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function seededRandom(seed) {
    let value = seed >>> 0 || 1;
    return () => {
      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      return (value >>> 0) / 4294967295;
    };
  }

  class HumanUnknownRenderer {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.context = canvas.getContext('2d', { alpha: true, desynchronized: true });
      this.reducedMotion = Boolean(options.reducedMotion);
      this.seed = options.seed || 41773;
      this.width = 1;
      this.height = 1;
      this.density = 1;
      this.thresholdParticles = [];
      this.exchangeThreads = [];
      this.frame = 0;
      this.createGeometry();
      this.resize();
    }

    createGeometry() {
      const random = seededRandom(this.seed);
      this.thresholdParticles = Array.from({ length: 120 }, (_, index) => ({
        angle: random() * TAU,
        radius: 0.08 + Math.pow(random(), 0.68) * 0.64,
        depth: 0.25 + random() * 0.75,
        speed: (0.025 + random() * 0.09) * (index % 2 ? 1 : -1),
        drift: random() * TAU,
        size: 0.35 + random() * 1.2,
      }));
      this.exchangeThreads = Array.from({ length: 9 }, (_, index) => ({
        y: 0.12 + index * 0.095 + (random() - 0.5) * 0.04,
        amplitude: 0.018 + random() * 0.055,
        frequency: 1.4 + random() * 1.8,
        phase: random() * TAU,
        depth: 0.2 + random() * 0.8,
      }));
    }

    setReducedMotion(value) {
      this.reducedMotion = Boolean(value);
    }

    resize() {
      const bounds = this.canvas.getBoundingClientRect();
      this.width = Math.max(1, bounds.width || window.innerWidth);
      this.height = Math.max(1, bounds.height || window.innerHeight);
      this.density = Math.min(window.devicePixelRatio || 1, this.width > 1100 ? 1.5 : 1.25);
      this.canvas.width = Math.round(this.width * this.density);
      this.canvas.height = Math.round(this.height * this.density);
      this.context.setTransform(this.density, 0, 0, this.density, 0, 0);
    }

    render(now, snapshot) {
      const context = this.context;
      context.setTransform(this.density, 0, 0, this.density, 0, 0);
      context.clearRect(0, 0, this.width, this.height);
      context.save();

      if (snapshot.chapter === 'entry') this.drawEntry(now, snapshot);
      if (snapshot.chapter === 'threshold') this.drawThreshold(now, snapshot);
      if (snapshot.chapter === 'section') this.drawSection(now, snapshot);
      if (snapshot.chapter === 'exchange') this.drawExchange(now, snapshot);
      if (snapshot.chapter === 'reality') this.drawReality(now, snapshot);
      if (snapshot.chapter === 'archive') this.drawArchive(now, snapshot);

      if (snapshot.transition > 0) this.drawTransition(snapshot.transition, snapshot.pointer);
      if (snapshot.chapter !== 'entry' && snapshot.chapter !== 'archive') {
        this.drawProbe(snapshot.pointer, snapshot.chapter, snapshot.stage);
      }

      context.restore();
      this.frame += 1;
    }

    drawEntry(now) {
      const context = this.context;
      const pulse = this.reducedMotion ? 0.42 : 0.36 + Math.sin(now * 0.00031) * 0.06;
      context.save();
      context.globalCompositeOperation = 'screen';
      context.strokeStyle = `rgba(210, 194, 176, ${pulse * 0.12})`;
      context.lineWidth = 0.8;
      context.beginPath();
      context.ellipse(this.width * 0.5, this.height * 0.49, this.width * 0.045, this.height * 0.07, 0, 0, TAU);
      context.stroke();
      context.restore();
    }

    drawThreshold(now, snapshot) {
      const context = this.context;
      const pointerX = snapshot.pointer.x * this.width;
      const pointerY = snapshot.pointer.y * this.height;
      const evidence = clamp(snapshot.threshold.coherence, 0, 1);
      const contact = snapshot.pointer.active ? 1 : 0;
      const time = this.reducedMotion ? 0 : now * 0.001;
      const centerX = lerp(this.width * 0.5, pointerX, contact * 0.5);
      const centerY = lerp(this.height * 0.5, pointerY, contact * 0.5);

      context.save();
      context.globalCompositeOperation = 'screen';
      for (let index = 0; index < this.thresholdParticles.length; index += 1) {
        const particle = this.thresholdParticles[index];
        const angle = particle.angle + time * particle.speed;
        const compressedRadius = particle.radius * (1 - evidence * 0.58);
        const orbitX = this.width * (0.5 + Math.cos(angle) * compressedRadius);
        const orbitY = this.height * (0.5 + Math.sin(angle + Math.sin(particle.drift) * 0.4) * compressedRadius * 0.62);
        const pull = clamp(contact * (0.16 + evidence * 0.62) * particle.depth, 0, 0.86);
        const x = lerp(orbitX, centerX, pull);
        const y = lerp(orbitY, centerY, pull);
        const alpha = 0.08 + particle.depth * 0.24 + contact * 0.09;

        context.fillStyle = `rgba(209, 201, 191, ${alpha})`;
        context.fillRect(x, y, particle.size, particle.size);

        if (contact && index % 7 === 0) {
          context.strokeStyle = `rgba(194, 177, 158, ${0.025 + evidence * 0.085})`;
          context.lineWidth = 0.55;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(centerX, centerY);
          context.stroke();
        }
      }

      if (snapshot.threshold.axisLength > 0.02) {
        const axisX = snapshot.threshold.axisX * this.width * 0.18;
        const axisY = snapshot.threshold.axisY * this.height * 0.18;
        context.strokeStyle = `rgba(222, 205, 183, ${0.12 + evidence * 0.55})`;
        context.lineWidth = 0.7 + evidence * 1.1;
        context.beginPath();
        context.moveTo(centerX - axisX, centerY - axisY);
        context.lineTo(centerX + axisX, centerY + axisY);
        context.stroke();
      }
      context.restore();
    }

    drawSection(now, snapshot) {
      const context = this.context;
      const pointerX = snapshot.pointer.x * this.width;
      const pointerY = snapshot.pointer.y * this.height;
      const stage = snapshot.stage;
      const time = this.reducedMotion ? snapshot.pointer.x * 2.4 : now * 0.001;
      const sharedPulse = 0.5 + Math.sin(time * 1.35) * 0.5;
      const sectionPoints = [
        { x: 0.22, y: 0.46, rx: 0.075, ry: 0.15, tilt: -0.18 },
        { x: 0.52, y: 0.51, rx: 0.055, ry: 0.12, tilt: 0.13 },
        { x: 0.79, y: 0.48, rx: 0.07, ry: 0.16, tilt: 0.22 },
      ];

      context.save();
      context.globalCompositeOperation = 'screen';

      const planeTilt = (snapshot.pointer.x - 0.5) * 0.5 + (snapshot.pointer.y - 0.5) * 0.16;
      context.translate(pointerX, pointerY);
      context.rotate(planeTilt);
      context.strokeStyle = `rgba(176, 194, 207, ${snapshot.pointer.active ? 0.34 : 0.12})`;
      context.lineWidth = snapshot.pointer.active ? 1.1 : 0.6;
      context.beginPath();
      context.moveTo(-this.width * 0.62, 0);
      context.lineTo(this.width * 0.62, 0);
      context.stroke();
      context.strokeStyle = `rgba(220, 204, 184, ${snapshot.pointer.active ? 0.08 : 0.025})`;
      context.lineWidth = snapshot.pointer.active ? 18 : 8;
      context.stroke();
      context.setTransform(this.density, 0, 0, this.density, 0, 0);

      sectionPoints.forEach((point, index) => {
        const visited = snapshot.section.visitedZones.includes(index);
        const alpha = 0.16 + sharedPulse * 0.18 + (visited ? 0.22 : 0) + stage * 0.04;
        context.save();
        context.translate(point.x * this.width, point.y * this.height);
        context.rotate(point.tilt + planeTilt * 0.38);
        context.strokeStyle = `rgba(215, 199, 181, ${alpha})`;
        context.lineWidth = 0.75 + sharedPulse * 0.75;
        context.beginPath();
        context.ellipse(0, 0, point.rx * this.width * (0.9 + sharedPulse * 0.12), point.ry * this.height * (0.92 + sharedPulse * 0.1), 0, 0, TAU);
        context.stroke();
        context.strokeStyle = `rgba(179, 196, 208, ${alpha * 0.55})`;
        context.lineWidth = 0.55;
        context.beginPath();
        context.ellipse(0, 0, point.rx * this.width * 0.58, point.ry * this.height * 0.61, 0.1, 0, TAU);
        context.stroke();
        context.restore();
      });

      if (stage >= 1) {
        context.strokeStyle = `rgba(213, 195, 173, ${0.08 + sharedPulse * 0.16})`;
        context.lineWidth = 0.7;
        context.beginPath();
        sectionPoints.forEach((point, index) => {
          const x = point.x * this.width;
          const y = point.y * this.height;
          if (index === 0) context.moveTo(x, y);
          else context.bezierCurveTo(x - this.width * 0.09, y - this.height * 0.035, x - this.width * 0.035, y + this.height * 0.035, x, y);
        });
        context.stroke();
      }

      this.drawPath(snapshot.section.memoryPath, {
        color: [172, 188, 201],
        alpha: stage >= 2 ? 0.17 : 0.055,
        width: 0.75,
      });
      this.drawPath(snapshot.section.path, {
        color: [220, 179, 137],
        alpha: snapshot.pointer.active ? 0.66 : 0.3,
        width: 1.15,
      });

      if (snapshot.section.resolved) {
        this.drawPath(snapshot.section.memoryPath, {
          color: [225, 207, 187],
          alpha: 0.5,
          width: 1.45,
        });
      }
      context.restore();
    }

    drawExchange(now, snapshot) {
      const context = this.context;
      const time = this.reducedMotion ? snapshot.pointer.x * 0.8 : now * 0.00034;
      const energy = clamp(snapshot.exchange.injectionEnergy, 0, 1);
      const coherence = clamp(snapshot.exchange.coherence, 0, 1);

      context.save();
      context.globalCompositeOperation = 'screen';
      this.exchangeThreads.forEach((thread, index) => {
        context.strokeStyle = `rgba(${index % 3 === 0 ? '210, 190, 168' : '166, 186, 201'}, ${0.028 + thread.depth * 0.055 + coherence * 0.045})`;
        context.lineWidth = 0.4 + thread.depth * 0.65;
        context.beginPath();
        for (let step = 0; step <= 40; step += 1) {
          const x = (step / 40) * this.width;
          const unitX = step / 40;
          const offset = Math.sin(unitX * TAU * thread.frequency + thread.phase + time * (index % 2 ? 1 : -1));
          const y = (thread.y + offset * thread.amplitude) * this.height;
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      });

      if (snapshot.exchange.injectionOrigin) {
        const originX = snapshot.exchange.injectionOrigin.x * this.width;
        const originY = snapshot.exchange.injectionOrigin.y * this.height;
        const radius = Math.min(this.width, this.height) * (0.07 + energy * 0.16 + snapshot.micLevel * 0.08);
        const glow = context.createRadialGradient(originX, originY, 0, originX, originY, radius);
        glow.addColorStop(0, `rgba(224, 182, 137, ${0.13 + energy * 0.28})`);
        glow.addColorStop(0.38, `rgba(196, 177, 158, ${0.06 + energy * 0.11})`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = glow;
        context.fillRect(originX - radius, originY - radius, radius * 2, radius * 2);

        if (snapshot.exchange.remoteSeen) {
          const remoteX = (1 - snapshot.exchange.injectionOrigin.x) * this.width;
          const remoteY = (1 - snapshot.exchange.injectionOrigin.y) * this.height;
          context.save();
          context.globalCompositeOperation = 'source-over';
          const absence = context.createRadialGradient(remoteX, remoteY, 0, remoteX, remoteY, radius * 1.35);
          absence.addColorStop(0, `rgba(0, 0, 0, ${0.3 + energy * 0.25})`);
          absence.addColorStop(1, 'rgba(0, 0, 0, 0)');
          context.fillStyle = absence;
          context.fillRect(remoteX - radius * 1.35, remoteY - radius * 1.35, radius * 2.7, radius * 2.7);
          context.restore();

          context.strokeStyle = `rgba(178, 191, 200, ${0.08 + coherence * 0.24})`;
          context.lineWidth = 0.8 + coherence * 1.8;
          context.beginPath();
          context.moveTo(originX, originY);
          context.bezierCurveTo(
            this.width * 0.5,
            originY - this.height * 0.18,
            this.width * 0.5,
            remoteY + this.height * 0.18,
            remoteX,
            remoteY,
          );
          context.stroke();
        }
      }

      if (snapshot.exchange.resolved) {
        const exitX = snapshot.exchange.exitPoint.x * this.width;
        const exitY = snapshot.exchange.exitPoint.y * this.height;
        for (let band = 0; band < 7; band += 1) {
          const spread = (band - 3) * this.height * 0.027;
          context.strokeStyle = `rgba(${band % 2 ? '171, 190, 204' : '214, 194, 172'}, ${0.09 + (3 - Math.abs(band - 3)) * 0.018})`;
          context.lineWidth = 0.7 + (3 - Math.abs(band - 3)) * 0.22;
          context.beginPath();
          context.moveTo(-this.width * 0.05, this.height * 0.62 + spread);
          context.bezierCurveTo(this.width * 0.27, this.height * 0.26 + spread, this.width * 0.62, this.height * 0.75 + spread, exitX, exitY + spread * 0.35);
          context.stroke();
        }
        context.fillStyle = 'rgba(222, 210, 196, .52)';
        context.beginPath();
        context.arc(exitX, exitY, 2.3, 0, TAU);
        context.fill();
      }
      context.restore();
    }

    drawReality(now, snapshot) {
      const context = this.context;
      const targetX = snapshot.reality.target.x * this.width;
      const targetY = snapshot.reality.target.y * this.height;
      const time = this.reducedMotion ? snapshot.pointer.x : now * 0.001;

      context.save();
      context.globalCompositeOperation = 'screen';

      snapshot.reality.echoPaths.forEach((path, index) => {
        const selected = index === snapshot.reality.selectedEcho;
        const depth = 0.34 + (index % 3) * 0.17;
        this.drawPath(path, {
          color: [164, 184, 201],
          alpha: selected ? 0.72 : depth * 0.42,
          width: selected ? 1.45 : 0.72 + depth * 0.3,
          dash: selected ? [] : [2, 7 + index * 2],
        });
        const tail = path[path.length - 1];
        if (tail) {
          context.strokeStyle = `rgba(193, 207, 217, ${selected ? 0.7 : 0.23})`;
          context.lineWidth = 0.7;
          context.beginPath();
          context.arc(tail.x * this.width, tail.y * this.height, selected ? 5 : 3.2, 0, TAU);
          context.stroke();
        }
      });

      this.drawPath(snapshot.reality.currentPath, {
        color: [226, 181, 139],
        alpha: 0.78,
        width: 1.35,
      });

      if (snapshot.stage >= 1) {
        const targetPulse = this.reducedMotion ? 0.55 : 0.48 + Math.sin(time * 1.7) * 0.08;
        context.strokeStyle = `rgba(205, 195, 184, ${snapshot.reality.stalled ? targetPulse : 0.16})`;
        context.lineWidth = snapshot.reality.stalled ? 1.2 : 0.65;
        context.beginPath();
        context.moveTo(targetX - this.width * 0.055, targetY + this.height * 0.022);
        context.bezierCurveTo(targetX - this.width * 0.018, targetY - this.height * 0.06, targetX + this.width * 0.018, targetY + this.height * 0.052, targetX + this.width * 0.052, targetY - this.height * 0.026);
        context.stroke();
      }

      if (snapshot.reality.resolved) {
        for (let index = 0; index < 11; index += 1) {
          const offset = (index - 5) * this.height * 0.014;
          context.strokeStyle = `rgba(${index % 2 ? '172, 192, 207' : '221, 195, 168'}, ${0.075 + (5 - Math.abs(index - 5)) * 0.02})`;
          context.lineWidth = 0.55 + (5 - Math.abs(index - 5)) * 0.13;
          context.beginPath();
          context.moveTo(this.width * 0.18, this.height * 0.72 + offset);
          context.bezierCurveTo(this.width * 0.38, this.height * 0.34 + offset * 0.4, targetX - this.width * 0.04, targetY + offset * 0.2, targetX, targetY);
          context.bezierCurveTo(targetX + this.width * 0.08, targetY - offset * 0.3, this.width * 0.77, this.height * 0.38 + offset * 0.45, this.width * 0.94, this.height * 0.26 + offset);
          context.stroke();
        }
        context.fillStyle = 'rgba(236, 215, 193, .64)';
        context.fillRect(targetX - 1.5, targetY - 1.5, 3, 3);
      }
      context.restore();
    }

    drawArchive(now, snapshot) {
      const context = this.context;
      const time = this.reducedMotion ? 0 : now * 0.00016;
      context.save();
      context.globalCompositeOperation = 'screen';
      for (let index = 0; index < 18; index += 1) {
        const x = this.width * (0.12 + ((index * 0.149 + time) % 0.78));
        const y = this.height * (0.18 + ((index * 0.263) % 0.64));
        context.fillStyle = `rgba(194, 189, 183, ${0.025 + (index % 3) * 0.012})`;
        context.fillRect(x, y, 1, 1);
      }
      context.restore();
    }

    drawTransition(amount, pointer) {
      const context = this.context;
      const eased = amount * amount * (3 - 2 * amount);
      const x = pointer.x * this.width;
      const y = pointer.y * this.height;
      const radius = Math.hypot(this.width, this.height) * (0.08 + (1 - eased) * 0.74);
      context.save();
      context.globalCompositeOperation = 'source-over';
      const shade = context.createRadialGradient(x, y, 0, x, y, radius);
      shade.addColorStop(0, `rgba(0, 0, 0, ${0.1 + eased * 0.42})`);
      shade.addColorStop(1, `rgba(0, 0, 0, ${0.52 * eased})`);
      context.fillStyle = shade;
      context.fillRect(0, 0, this.width, this.height);
      context.restore();
    }

    drawProbe(pointer, chapter, stage) {
      if (!pointer.visible) return;
      const context = this.context;
      const x = pointer.x * this.width;
      const y = pointer.y * this.height;
      const radius = pointer.active ? 7.5 : 10.5;
      const color = chapter === 'reality' || chapter === 'exchange'
        ? [219, 192, 166]
        : [200, 208, 214];
      context.save();
      context.globalCompositeOperation = 'screen';
      context.strokeStyle = `rgba(${color.join(', ')}, ${pointer.active ? 0.82 : 0.58})`;
      context.lineWidth = pointer.active ? 1.15 : 0.75;
      context.beginPath();
      context.arc(x, y, radius, 0, TAU);
      context.stroke();
      context.fillStyle = `rgba(${color.join(', ')}, ${pointer.active ? 0.9 : 0.48})`;
      context.fillRect(x - 1, y - 1, 2, 2);
      if (stage >= 2) {
        context.strokeStyle = `rgba(${color.join(', ')}, .16)`;
        context.beginPath();
        context.arc(x, y, radius + 5.5, 0, TAU);
        context.stroke();
      }
      context.restore();
    }

    drawPath(path, options = {}) {
      if (!path || path.length < 2) return;
      const context = this.context;
      const color = options.color || [210, 210, 210];
      context.save();
      context.globalCompositeOperation = 'screen';
      context.strokeStyle = `rgba(${color.join(', ')}, ${options.alpha ?? 0.5})`;
      context.lineWidth = options.width || 1;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.setLineDash(options.dash || []);
      context.beginPath();
      path.forEach((point, index) => {
        const x = point.x * this.width;
        const y = point.y * this.height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
      context.restore();
    }
  }

  window.HumanUnknownRenderer = HumanUnknownRenderer;
})();
