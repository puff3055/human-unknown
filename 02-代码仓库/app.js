(() => {
  const contact = document.getElementById('contact');
  const cosmosImage = document.getElementById('cosmosImage');
  const guideText = document.getElementById('guideText');
  const contactCursor = document.getElementById('contactCursor');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pointer = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    previousX: window.innerWidth / 2,
    previousY: window.innerHeight / 2,
    smoothX: window.innerWidth / 2,
    smoothY: window.innerHeight / 2,
    hasMoved: false,
    travel: 0,
  };

  const presence = {
    x: 0,
    y: 0,
    approach: 0,
    targetApproach: 0,
  };

  let phase = 'waiting';
  let noticeTimer = 0;
  let noticedAt = 0;
  let guideSwapTimer = 0;
  let lastFrame = performance.now();

  function reveal() {
    contact.classList.add('is-ready');
  }

  if (cosmosImage.complete) {
    requestAnimationFrame(reveal);
  } else {
    cosmosImage.addEventListener('load', reveal, { once: true });
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

  function askCloser() {
    if (phase !== 'noticed') return;
    phase = 'closer';
    contact.dataset.phase = phase;
    setGuide('再靠近一点。');
  }

  function updatePointer(clientX, clientY, pointerType = 'mouse') {
    const dx = clientX - pointer.previousX;
    const dy = clientY - pointer.previousY;

    if (pointer.hasMoved) {
      pointer.travel += Math.hypot(dx, dy);
    }

    pointer.x = clientX;
    pointer.y = clientY;
    pointer.previousX = clientX;
    pointer.previousY = clientY;

    if (!pointer.hasMoved) {
      pointer.hasMoved = true;
      pointer.smoothX = clientX;
      pointer.smoothY = clientY;
      noticeTimer = window.setTimeout(becomeAware, reduceMotion ? 120 : 720);
    }

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

  window.addEventListener('pointerleave', () => {
    contact.classList.remove('has-pointer');
  });

  window.addEventListener('pointerenter', () => {
    if (pointer.hasMoved) contact.classList.add('has-pointer');
  });

  window.addEventListener('blur', () => {
    contact.classList.remove('has-pointer');
  });

  window.addEventListener('resize', () => {
    if (!pointer.hasMoved) {
      pointer.x = window.innerWidth / 2;
      pointer.y = window.innerHeight / 2;
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
      pointer.smoothX = pointer.x;
      pointer.smoothY = pointer.y;
    }
  });

  function smoothstep(edge0, edge1, value) {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function animate(now) {
    const delta = Math.min(40, now - lastFrame);
    const frameScale = delta / (1000 / 60);
    lastFrame = now;

    const followRate = reduceMotion ? 1 : 1 - Math.pow(.958, frameScale);
    pointer.smoothX += (pointer.x - pointer.smoothX) * followRate;
    pointer.smoothY += (pointer.y - pointer.smoothY) * followRate;

    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const normalizedX = (pointer.smoothX - viewportCenterX) / Math.max(1, viewportCenterX);
    const normalizedY = (pointer.smoothY - viewportCenterY) / Math.max(1, viewportCenterY);

    presence.x += (normalizedX * 18 - presence.x) * followRate;
    presence.y += (normalizedY * 13 - presence.y) * followRate;

    const pupilX = viewportCenterX + presence.x;
    const pupilY = viewportCenterY + presence.y;
    const distance = Math.hypot(pointer.x - pupilX, pointer.y - pupilY);
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    const proximity = 1 - smoothstep(shortSide * .075, shortSide * .38, distance);

    presence.targetApproach = phase === 'waiting' ? 0 : proximity;
    const approachRate = reduceMotion ? 1 : 1 - Math.pow(.94, frameScale);
    presence.approach += (presence.targetApproach - presence.approach) * approachRate;

    if (
      phase === 'noticed' &&
      now - noticedAt > 1150 &&
      distance < shortSide * .29
    ) {
      askCloser();
    }

    const breath = reduceMotion ? 0 : Math.sin(now * .00042) * .0022;
    const scale = 1 + breath + presence.approach * .052;
    const brightness = 1 + presence.approach * .045;
    const contrast = 1 + presence.approach * .075;

    document.documentElement.style.setProperty('--presence-x', `${presence.x.toFixed(2)}px`);
    document.documentElement.style.setProperty('--presence-y', `${presence.y.toFixed(2)}px`);
    document.documentElement.style.setProperty('--presence-scale', scale.toFixed(4));
    document.documentElement.style.setProperty('--presence-brightness', brightness.toFixed(3));
    document.documentElement.style.setProperty('--presence-contrast', contrast.toFixed(3));

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  window.addEventListener('pagehide', () => {
    window.clearTimeout(noticeTimer);
    window.clearTimeout(guideSwapTimer);
  });
})();
