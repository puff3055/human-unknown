(() => {
  'use strict';

  const contact = document.getElementById('contact');
  const nebulaCanvas = document.getElementById('nebulaCanvas');
  const nebulaFallback = document.getElementById('nebulaFallback');
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
    speed: 0,
    lastMovedAt: 0,
  };

  const gaze = {
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    perceivedX: 0,
    perceivedY: 0,
  };

  const presence = {
    awareness: 0,
    targetAwareness: 0,
    approach: 0,
    targetApproach: 0,
    study: 0,
    targetStudy: 0,
    hold: 0,
    targetHold: 0,
    studyStartedAt: 0,
  };

  const rhythm = {
    duration: 10.4,
    offset: Math.random() * 10.4,
    stage: 'gathering',
    value: 0,
    progress: 0,
  };

  const awakening = {
    startedAt: 0,
    stage: 'waiting',
    value: 0,
  };

  let nebula = null;
  let phase = 'waiting';
  let lifeState = 'resting';
  let awarenessScheduled = false;
  let firstContactAt = 0;
  let noticedAt = 0;
  let awarenessTimer = 0;
  let holdTimer = 0;
  let observeTimer = 0;
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

  function easeInOut(value) {
    return value * value * (3 - 2 * value);
  }

  function damp(current, target, rate, deltaSeconds) {
    return current + (target - current) * (1 - Math.exp(-rate * deltaSeconds));
  }

  function reveal() {
    contact.classList.add('is-ready');
  }

  function showStaticFallback() {
    contact.classList.add('no-webgl');
    nebulaCanvas.dataset.renderer = 'fallback';
  }

  function recoverNebula() {
    const interruptedNebula = nebula;
    nebula = null;
    if (interruptedNebula) interruptedNebula.destroy();
    bootNebula();
  }

  async function bootNebula() {
    try {
      if (!window.LivingNebula) throw new Error('Living nebula renderer is unavailable');
      nebula = new window.LivingNebula(nebulaCanvas, {
        reducedMotion: reduceMotion,
        onContextLost: showStaticFallback,
        onContextRestored: recoverNebula,
      });
      await nebula.init('assets/home-contact-background.png');
      contact.classList.remove('no-webgl');
      nebulaCanvas.dataset.renderer = 'living-nebula';
      nebulaCanvas.dataset.texture = 'continuous';
      awakening.startedAt = performance.now();
      awakening.stage = 'emerging';
      nebula.render(0, {
        pointerX: 0,
        pointerY: 0,
      });
      requestAnimationFrame(reveal);
    } catch (error) {
      console.warn('Living nebula fallback enabled:', error.message);
      showStaticFallback();
      if (nebulaFallback.complete) {
        requestAnimationFrame(reveal);
      } else {
        nebulaFallback.addEventListener('load', reveal, { once: true });
      }
    }
  }

  function setLifeState(nextState) {
    if (lifeState === nextState) return;
    lifeState = nextState;
    contact.dataset.life = nextState;
  }

  function setGuide(copy) {
    window.clearTimeout(guideSwapTimer);

    if (!guideText.textContent) {
      guideText.textContent = copy;
      requestAnimationFrame(() => guideText.classList.add('is-visible'));
      return;
    }

    if (guideText.textContent === copy) return;
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
    presence.targetAwareness = 1;
    contact.dataset.phase = phase;
    setLifeState('orienting');
    setGuide('它注意到你了。');

    observeTimer = window.setTimeout(() => {
      if (lifeState === 'orienting') setLifeState('observing');
    }, reduceMotion ? 50 : 1320);
  }

  function scheduleAwareness(now) {
    if (awarenessScheduled || pointer.travel < 56) return;
    awarenessScheduled = true;
    firstContactAt = now;
    presence.targetHold = 1;
    setLifeState('sensing');

    holdTimer = window.setTimeout(() => {
      presence.targetHold = 0;
    }, reduceMotion ? 40 : 280);

    awarenessTimer = window.setTimeout(
      becomeAware,
      reduceMotion ? 80 : 310
    );
  }

  function askCloser() {
    if (phase !== 'noticed') return;
    phase = 'closer';
    contact.dataset.phase = phase;
    setLifeState('approaching');
    setGuide('再靠近一点。');
  }

  function updatePointer(clientX, clientY, pointerType = 'mouse', now = performance.now()) {
    const distance = Math.hypot(
      clientX - pointer.previousX,
      clientY - pointer.previousY
    );
    const elapsed = Math.max(16, now - pointer.lastMovedAt);

    pointer.travel += distance;
    pointer.speed = distance / elapsed * 1000;
    pointer.x = clientX;
    pointer.y = clientY;
    pointer.previousX = clientX;
    pointer.previousY = clientY;
    pointer.hasMoved = true;
    pointer.inside = true;

    if (distance > 1.5) {
      pointer.lastMovedAt = now;
      presence.targetStudy = 0;
      presence.studyStartedAt = 0;
      if (phase === 'noticed') setLifeState('observing');
      if (phase === 'closer') setLifeState('approaching');
    }

    scheduleAwareness(now);

    if (pointerType !== 'touch') {
      contact.classList.add('has-pointer');
      contactCursor.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
    }
  }

  window.addEventListener('pointermove', (event) => {
    updatePointer(event.clientX, event.clientY, event.pointerType, performance.now());
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    updatePointer(event.clientX, event.clientY, event.pointerType, performance.now());
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    pointer.inside = false;
    presence.targetStudy = 0;
    contact.classList.remove('has-pointer');
  });

  document.documentElement.addEventListener('mouseenter', () => {
    pointer.inside = true;
    pointer.lastMovedAt = performance.now();
    if (pointer.hasMoved) contact.classList.add('has-pointer');
  });

  window.addEventListener('blur', () => {
    pointer.inside = false;
    presence.targetStudy = 0;
    contact.classList.remove('has-pointer');
  });

  window.addEventListener('focus', () => {
    pointer.inside = true;
    pointer.lastMovedAt = performance.now();
  });

  window.addEventListener('resize', () => {
    if (!pointer.hasMoved) {
      pointer.x = window.innerWidth / 2;
      pointer.y = window.innerHeight / 2;
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
    }
  });

  function computeRhythm(timeSeconds) {
    if (reduceMotion) {
      rhythm.value = 0;
      rhythm.progress = 0;
      rhythm.stage = 'resting';
      return;
    }

    const cyclePosition = ((timeSeconds + rhythm.offset) % rhythm.duration)
      / rhythm.duration;
    rhythm.progress = cyclePosition;

    let baseValue = 0;

    if (cyclePosition < 0.32) {
      const progress = easeInOut(cyclePosition / 0.32);
      rhythm.stage = 'gathering';
      baseValue = -0.35 + progress * 1.10;
    } else if (cyclePosition < 0.45) {
      const progress = (cyclePosition - 0.32) / 0.13;
      rhythm.stage = 'suspending';
      baseValue = 0.75 - Math.sin(progress * Math.PI) * 0.04;
    } else if (cyclePosition < 0.80) {
      const progress = easeInOut((cyclePosition - 0.45) / 0.35);
      rhythm.stage = 'releasing';
      baseValue = 0.75 - progress * 1.30;
    } else {
      const progress = (cyclePosition - 0.80) / 0.20;
      rhythm.stage = 'afterwave';
      baseValue = -0.55 * (1 - easeInOut(progress))
        + Math.sin(progress * Math.PI * 2) * 0.10 * (1 - progress);
    }

    const microRhythm = Math.sin(
      (timeSeconds + rhythm.offset * 0.31) * Math.PI * 2 / 3.7
    ) * 0.11 + Math.sin(
      (timeSeconds - rhythm.offset * 0.17) * Math.PI * 2 / 5.9
    ) * 0.055;
    rhythm.value = clamp(baseValue + microRhythm, -0.68, 0.88);
  }

  function computeAwakening(now) {
    if (reduceMotion || !awakening.startedAt) {
      awakening.stage = 'resting';
      awakening.value = 0;
      return;
    }

    const elapsed = (now - awakening.startedAt) / 1000;

    if (elapsed < 0.55) {
      awakening.stage = 'emerging';
      awakening.value = 0;
    } else if (elapsed < 1.62) {
      awakening.stage = 'gathering';
      awakening.value = easeInOut((elapsed - 0.55) / 1.07);
    } else if (elapsed < 1.92) {
      awakening.stage = 'holding';
      awakening.value = 1;
    } else if (elapsed < 2.82) {
      const release = easeInOut((elapsed - 1.92) / 0.90);
      awakening.stage = 'releasing';
      awakening.value = 1 - release;
    } else {
      awakening.stage = 'resting';
      awakening.value = 0;
    }
  }

  function updateCuriosity(deltaSeconds, now) {
    const canStudy = pointer.hasMoved
      && pointer.inside
      && phase !== 'waiting'
      && now - pointer.lastMovedAt > 800
      && pointer.speed < 80;

    presence.targetStudy = canStudy && !reduceMotion ? 1 : 0;
    presence.study = damp(
      presence.study,
      presence.targetStudy,
      presence.targetStudy ? 3.8 : 4.6,
      deltaSeconds
    );

    if (presence.targetStudy && !presence.studyStartedAt) {
      presence.studyStartedAt = now;
      setLifeState('studying');
    } else if (!presence.targetStudy && presence.study < 0.06) {
      presence.studyStartedAt = 0;
    }
  }

  function updateGaze(deltaSeconds) {
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const canTrack = pointer.hasMoved
      && pointer.inside
      && phase !== 'waiting'
      && !reduceMotion;

    const directionX = canTrack
      ? clamp((pointer.x - viewportCenterX) / Math.max(1, viewportCenterX), -1, 1)
      : 0;
    const directionY = canTrack
      ? clamp((pointer.y - viewportCenterY) / Math.max(1, viewportCenterY), -1, 1)
      : 0;
    const directionLength = Math.hypot(directionX, directionY) || 1;
    const studyReach = presence.study * 8;
    const rawTargetX = directionX * 48 + directionX / directionLength * studyReach;
    const rawTargetY = directionY * 31 + directionY / directionLength * studyReach * 0.68;
    const perceptionRate = canTrack ? 3.05 : 1.35;

    gaze.perceivedX = damp(gaze.perceivedX, rawTargetX, perceptionRate, deltaSeconds);
    gaze.perceivedY = damp(gaze.perceivedY, rawTargetY, perceptionRate, deltaSeconds);

    const stiffness = 18.5;
    const damping = 8.1;
    gaze.velocityX += (
      (gaze.perceivedX - gaze.x) * stiffness - gaze.velocityX * damping
    ) * deltaSeconds;
    gaze.velocityY += (
      (gaze.perceivedY - gaze.y) * stiffness - gaze.velocityY * damping
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
      && distance < shortSide * 0.285
    ) {
      askCloser();
    }

    presence.targetApproach = phase === 'closer' && !reduceMotion ? proximity : 0;
    presence.approach = damp(
      presence.approach,
      presence.targetApproach,
      4.6,
      deltaSeconds
    );
  }

  function updatePresence(deltaSeconds) {
    presence.awareness = damp(
      presence.awareness,
      presence.targetAwareness,
      1.35,
      deltaSeconds
    );
    presence.hold = damp(
      presence.hold,
      presence.targetHold,
      presence.targetHold ? 8.0 : 2.6,
      deltaSeconds
    );
  }

  function getSignalProgress(now) {
    if (!presence.studyStartedAt || presence.study < 0.05) return 0;
    return ((now - presence.studyStartedAt) % 3200) / 3200;
  }

  function updateTelemetry(now, signalProgress) {
    telemetryFrame += 1;
    if (telemetryFrame % 8 !== 0) return;

    nebulaCanvas.dataset.phase = phase;
    nebulaCanvas.dataset.life = lifeState;
    nebulaCanvas.dataset.rhythm = rhythm.stage;
    nebulaCanvas.dataset.rhythmProgress = rhythm.progress.toFixed(3);
    nebulaCanvas.dataset.breath = rhythm.value.toFixed(3);
    nebulaCanvas.dataset.gazeX = gaze.x.toFixed(2);
    nebulaCanvas.dataset.gazeY = gaze.y.toFixed(2);
    nebulaCanvas.dataset.awareness = presence.awareness.toFixed(3);
    nebulaCanvas.dataset.hold = presence.hold.toFixed(3);
    nebulaCanvas.dataset.study = presence.study.toFixed(3);
    nebulaCanvas.dataset.signal = signalProgress.toFixed(3);
    nebulaCanvas.dataset.approach = presence.approach.toFixed(3);
    nebulaCanvas.dataset.awakening = awakening.stage;
    nebulaCanvas.dataset.awaken = awakening.value.toFixed(3);
    nebulaCanvas.dataset.uptime = (now / 1000).toFixed(2);
  }

  function animate(now) {
    const deltaSeconds = Math.min(0.04, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;

    pointer.speed = damp(pointer.speed, 0, 5.5, deltaSeconds);
    computeAwakening(now);
    computeRhythm(now / 1000);
    updatePresence(deltaSeconds);
    updateCuriosity(deltaSeconds, now);
    updateGaze(deltaSeconds);
    updateApproach(deltaSeconds, now);
    const signalProgress = getSignalProgress(now);

    if (nebula) {
      nebula.render(now / 1000, {
        gazeX: gaze.x,
        gazeY: gaze.y,
        pointerX: pointer.x - window.innerWidth / 2,
        pointerY: pointer.y - window.innerHeight / 2,
        breath: rhythm.value,
        hold: presence.hold,
        awareness: presence.awareness,
        study: presence.study,
        signalProgress,
        approach: presence.approach,
        awaken: awakening.value,
      });
      updateTelemetry(now, signalProgress);
    }

    frameWindowCount += 1;
    if (now - frameWindowStartedAt >= 1000) {
      nebulaCanvas.dataset.fps = (
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
      lifeState,
      renderer: nebula && nebula.ready ? 'living-nebula' : 'fallback',
      textureMode: 'continuous',
      rhythm: {
        stage: rhythm.stage,
        progress: rhythm.progress,
        breath: rhythm.value,
        duration: rhythm.duration,
      },
      awakening: {
        stage: awakening.stage,
        value: awakening.value,
      },
      gaze: {
        x: gaze.x,
        y: gaze.y,
        perceivedX: gaze.perceivedX,
        perceivedY: gaze.perceivedY,
        velocityX: gaze.velocityX,
        velocityY: gaze.velocityY,
      },
      awareness: presence.awareness,
      hold: presence.hold,
      study: presence.study,
      approach: presence.approach,
      pointerTravel: pointer.travel,
      firstContactAt,
    }),
  };

  contact.dataset.life = lifeState;
  bootNebula();
  requestAnimationFrame(animate);

  window.addEventListener('pagehide', () => {
    window.clearTimeout(awarenessTimer);
    window.clearTimeout(holdTimer);
    window.clearTimeout(observeTimer);
    window.clearTimeout(guideSwapTimer);
    if (nebula) nebula.destroy();
  });
})();
