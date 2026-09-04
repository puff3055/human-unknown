(() => {
  'use strict';

  const contact = document.getElementById('contact');
  const particleCanvas = document.getElementById('particleCanvas');
  const particleFallback = document.getElementById('particleFallback');
  const guideText = document.getElementById('guideText');
  const contactCursor = document.getElementById('contactCursor');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    previousX: window.innerWidth / 2,
    previousY: window.innerHeight / 2,
    hasMoved: false,
    inside: true,
    travel: 0,
  };

  const gaze = {
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    targetX: 0,
    targetY: 0,
  };

  const presence = {
    approach: 0,
    targetApproach: 0,
  };

  let eye = null;
  let phase = 'waiting';
  let awarenessScheduled = false;
  let noticeTimer = 0;
  let noticedAt = 0;
  let guideSwapTimer = 0;
  let lastFrame = performance.now();
  let telemetryFrame = 0;
  let frameWindowStartedAt = lastFrame;
  let frameWindowCount = 0;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function reveal() {
    contact.classList.add('is-ready');
  }

  async function bootParticleEye() {
    try {
      if (!window.ParticleEye) throw new Error('Particle renderer is unavailable');
      eye = new window.ParticleEye(particleCanvas, {
        reducedMotion: reduceMotion,
      });
      await eye.init('assets/home-contact-background.png');
      particleCanvas.dataset.pointCount = String(eye.pointCount);
      particleCanvas.dataset.lineVertexCount = String(eye.lineVertexCount);
      eye.render(0, 0, 0, 0);
      requestAnimationFrame(reveal);
    } catch (error) {
      console.warn('Particle field fallback enabled:', error.message);
      contact.classList.add('no-webgl');
      if (particleFallback.complete) {
        requestAnimationFrame(reveal);
      } else {
        particleFallback.addEventListener('load', reveal, { once: true });
      }
    }
  }

  function setGuide(copy) {
    window.clearTimeout(guideSwapTimer);

    if (!guideText.textContent) {
      guideText.textContent = copy;
      requestAnimationFrame(() => guideText.classList.add('is-visible'));
      return;
    }

    guideText.classList.remove('is-visible');
    guideSwapTimer = window.setTimeout(() => {
      guideText.textContent = copy;
      guideText.classList.add('is-visible');
    }, 480);
  }

  function becomeAware() {
    if (phase !== 'waiting') return;
    phase = 'noticed';
    noticedAt = performance.now();
    contact.dataset.phase = phase;
    setGuide('它注意到你了。');
  }

  function scheduleAwareness() {
    if (awarenessScheduled || pointer.travel < 64) return;
    awarenessScheduled = true;
    noticeTimer = window.setTimeout(becomeAware, reduceMotion ? 120 : 760);
  }

  function askCloser() {
    if (phase !== 'noticed') return;
    phase = 'closer';
    contact.dataset.phase = phase;
    setGuide('再靠近一点。');
  }

  function updatePointer(clientX, clientY, pointerType = 'mouse') {
    pointer.travel += Math.hypot(
      clientX - pointer.previousX,
      clientY - pointer.previousY
    );
    pointer.x = clientX;
    pointer.y = clientY;
    pointer.previousX = clientX;
    pointer.previousY = clientY;
    pointer.hasMoved = true;
    pointer.inside = true;
    scheduleAwareness();

    if (pointerType !== 'touch') {
      contact.classList.add('has-pointer');
      contactCursor.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
    }
  }

  window.addEventListener('pointermove', (event) => {
    updatePointer(event.clientX, event.clientY, event.pointerType);
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    updatePointer(event.clientX, event.clientY, event.pointerType);
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    pointer.inside = false;
    contact.classList.remove('has-pointer');
  });

  document.documentElement.addEventListener('mouseenter', () => {
    pointer.inside = true;
    if (pointer.hasMoved) contact.classList.add('has-pointer');
  });

  window.addEventListener('blur', () => {
    pointer.inside = false;
    contact.classList.remove('has-pointer');
  });

  window.addEventListener('focus', () => {
    pointer.inside = true;
  });

  window.addEventListener('resize', () => {
    if (!pointer.hasMoved) {
      pointer.x = window.innerWidth / 2;
      pointer.y = window.innerHeight / 2;
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
    }
  });

  function updateGaze(deltaSeconds) {
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const canTrack = pointer.hasMoved && pointer.inside && !reduceMotion;

    const rawTargetX = canTrack
      ? clamp((pointer.x - viewportCenterX) / Math.max(1, viewportCenterX), -1, 1) * 30
      : 0;
    const rawTargetY = canTrack
      ? clamp((pointer.y - viewportCenterY) / Math.max(1, viewportCenterY), -1, 1) * 20
      : 0;
    const perceptionRate = reduceMotion ? 1 : 1 - Math.exp(-deltaSeconds * 4.5);
    gaze.targetX += (rawTargetX - gaze.targetX) * perceptionRate;
    gaze.targetY += (rawTargetY - gaze.targetY) * perceptionRate;

    const stiffness = 28;
    const damping = 10.4;
    gaze.velocityX += (
      (gaze.targetX - gaze.x) * stiffness - gaze.velocityX * damping
    ) * deltaSeconds;
    gaze.velocityY += (
      (gaze.targetY - gaze.y) * stiffness - gaze.velocityY * damping
    ) * deltaSeconds;
    gaze.x += gaze.velocityX * deltaSeconds;
    gaze.y += gaze.velocityY * deltaSeconds;
  }

  function updateApproach(deltaSeconds, now) {
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const pupilX = viewportCenterX + gaze.x;
    const pupilY = viewportCenterY + gaze.y;
    const distance = Math.hypot(pointer.x - pupilX, pointer.y - pupilY);
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    const proximity = 1 - smoothstep(shortSide * 0.065, shortSide * 0.36, distance);

    if (
      phase === 'noticed'
      && now - noticedAt > 1150
      && distance < shortSide * 0.29
    ) {
      askCloser();
    }

    presence.targetApproach = phase === 'closer' && !reduceMotion ? proximity : 0;
    const approachRate = 1 - Math.exp(-deltaSeconds * 5.4);
    presence.approach += (
      presence.targetApproach - presence.approach
    ) * approachRate;
  }

  function animate(now) {
    const deltaSeconds = Math.min(0.04, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;

    updateGaze(deltaSeconds);
    updateApproach(deltaSeconds, now);

    if (eye) {
      eye.render(now / 1000, gaze.x, gaze.y, presence.approach);
      telemetryFrame += 1;
      if (telemetryFrame % 8 === 0) {
        particleCanvas.dataset.gazeX = gaze.x.toFixed(2);
        particleCanvas.dataset.gazeY = gaze.y.toFixed(2);
        particleCanvas.dataset.approach = presence.approach.toFixed(3);
      }
    }

    frameWindowCount += 1;
    if (now - frameWindowStartedAt >= 1000) {
      particleCanvas.dataset.fps = (
        frameWindowCount * 1000 / (now - frameWindowStartedAt)
      ).toFixed(1);
      frameWindowCount = 0;
      frameWindowStartedAt = now;
    }

    requestAnimationFrame(animate);
  }

  window.__humanUnknown = {
    getState: () => ({
      phase,
      particleRenderer: Boolean(eye && eye.ready),
      particleCount: eye ? eye.pointCount : 0,
      lineVertexCount: eye ? eye.lineVertexCount : 0,
      gaze: {
        x: gaze.x,
        y: gaze.y,
        targetX: gaze.targetX,
        targetY: gaze.targetY,
        velocityX: gaze.velocityX,
        velocityY: gaze.velocityY,
      },
      approach: presence.approach,
      pointerTravel: pointer.travel,
    }),
  };

  bootParticleEye();
  requestAnimationFrame(animate);

  window.addEventListener('pagehide', () => {
    window.clearTimeout(noticeTimer);
    window.clearTimeout(guideSwapTimer);
    if (eye) eye.destroy();
  });
})();
