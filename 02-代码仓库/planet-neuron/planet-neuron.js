(() => {
  "use strict";

  const world = document.querySelector("[data-world]");
  const canvas = document.querySelector("[data-canvas]");
  const premise = document.querySelector("[data-premise]");
  const prompt = document.querySelector("[data-prompt]");
  const revealCopy = document.querySelector("[data-reveal]");
  const progressWrap = document.querySelector("[data-progress-wrap]");
  const progressBar = document.querySelector("[data-progress]");
  const status = document.querySelector("[data-status]");
  const soundButton = document.querySelector("[data-sound]");
  const soundLabel = document.querySelector("[data-sound-label]");

  const renderer = new window.PlanetNeuronRenderer(canvas);
  const sound = new window.PlanetNeuronSound();

  const DWELL_MS = 1050;
  const SIGNAL_MS = 4700;
  const REVEAL_DELAY_MS = 1380;
  const REVEAL_MS = 4200;
  const INITIAL_PROMPT = "移动鼠标，寻找会回应你的纹路。";
  const SENSING_PROMPT = "它在回应。停住。";

  const eventPositions = [
    { x: 0.474, y: 0.682 },
    { x: 0.587, y: 0.422 },
    { x: 0.438, y: 0.365 },
    { x: 0.592, y: 0.695 },
    { x: 0.205, y: 0.865 },
    { x: 0.932, y: 0.442 },
  ];

  const pointer = {
    source: { x: 0.54, y: 0.5 },
    active: false,
    overPlanet: false,
    speed: 0,
    lastX: 0,
    lastY: 0,
    lastMoveAt: 0,
    energy: 0,
    movedSinceTrigger: true,
    view: { x: 0, y: 0 },
    viewTarget: { x: 0, y: 0 },
  };

  const state = {
    phase: "loading",
    dwell: 0,
    mainTriggered: false,
    triggeredAt: 0,
    revealStartedAt: 0,
    lastTriggerAt: -10000,
    lastFrameAt: performance.now(),
    nextAmbientAt: performance.now() + 2200,
    ambientIndex: 0,
    rightResponded: false,
    leftResponded: false,
    hidden: false,
  };

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function setPhase(phase) {
    state.phase = phase;
    world.dataset.phase = phase;
  }

  function updatePointer(event) {
    const now = performance.now();
    const elapsed = Math.max(16, now - pointer.lastMoveAt);
    const distance = Math.hypot(event.clientX - pointer.lastX, event.clientY - pointer.lastY);
    pointer.speed = (distance / elapsed) * 1000;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    pointer.lastMoveAt = now;
    if (distance > 4 && now - state.lastTriggerAt > 700) pointer.movedSinceTrigger = true;
    pointer.active = true;
    pointer.source = renderer.screenToSource(event.clientX, event.clientY);
    pointer.overPlanet = renderer.isOverPlanet(pointer.source);
    pointer.viewTarget.x = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.viewTarget.y = (0.5 - event.clientY / window.innerHeight) * 2;
  }

  function leaveWorld() {
    pointer.active = false;
    pointer.overPlanet = false;
    pointer.speed = 0;
    pointer.viewTarget.x = 0;
    pointer.viewTarget.y = 0;
    if (!state.mainTriggered) prompt.textContent = INITIAL_PROMPT;
  }

  function canCharge(now) {
    const restingPhase = state.phase === "idle" || state.phase === "sensing" || state.phase === "revealed";
    const rearmed = state.phase !== "revealed" || pointer.movedSinceTrigger;
    return restingPhase && rearmed && now - state.lastTriggerAt > 4300;
  }

  function triggerSignal(now) {
    state.dwell = 1;
    state.triggeredAt = now;
    state.lastTriggerAt = now;
    state.rightResponded = false;
    state.leftResponded = false;
    pointer.movedSinceTrigger = false;
    renderer.setSignal(0, { ...pointer.source });
    renderer.addEvent("burst", { ...pointer.source }, 1250);
    sound.triggerSignal();
    progressWrap.classList.remove("is-visible");

    if (!state.mainTriggered) {
      state.mainTriggered = true;
      setPhase("transmitting");
      premise.classList.add("is-gone");
      prompt.classList.add("is-gone");
      status.textContent = "信号正沿着同一结构向外分流。";
    } else {
      setPhase("secondary");
      status.textContent = "这个节点再次向远处传递信号。";
    }
  }

  function scheduleAmbientEvent(now) {
    if (now < state.nextAmbientAt) return;
    if (["transmitting", "revealing", "secondary"].includes(state.phase)) return;

    const position = eventPositions[state.ambientIndex % eventPositions.length];
    const kind = state.ambientIndex % 3 === 2 ? "burst" : "annihilation";
    const duration = kind === "burst" ? 1750 : 2550;
    renderer.addEvent(kind, position, duration);
    sound.ambientEvent(kind, position.x);
    state.ambientIndex += 1;
    state.nextAmbientAt = now + 3200 + Math.random() * 4300;
  }

  function update(now, delta) {
    const motionAge = now - pointer.lastMoveAt;
    if (motionAge > 90) pointer.speed *= Math.pow(0.82, delta / 16.67);

    const speedCalm = 1 - clamp(pointer.speed / 950);
    const targetEnergy = pointer.active && pointer.overPlanet ? 0.42 + speedCalm * 0.58 : 0;
    pointer.energy += (targetEnergy - pointer.energy) * clamp(delta / 150);
    pointer.view.x += (pointer.viewTarget.x - pointer.view.x) * clamp(delta / 240);
    pointer.view.y += (pointer.viewTarget.y - pointer.view.y) * clamp(delta / 240);

    if (canCharge(now) && pointer.overPlanet && (motionAge > 110 || pointer.speed < 90)) {
      state.dwell = clamp(state.dwell + delta / DWELL_MS);
      progressWrap.classList.add("is-visible");
      if (state.phase !== "revealed") {
        setPhase("sensing");
        prompt.textContent = SENSING_PROMPT;
      }
    } else if (!["transmitting", "revealing", "secondary"].includes(state.phase)) {
      state.dwell = clamp(state.dwell - delta / 520);
      if (state.dwell === 0) {
        progressWrap.classList.remove("is-visible");
        if (!state.mainTriggered) {
          setPhase("idle");
          prompt.textContent = INITIAL_PROMPT;
        }
      }
    }

    if (state.dwell >= 1 && canCharge(now)) triggerSignal(now);

    if (["transmitting", "revealing", "secondary"].includes(state.phase)) {
      const signalProgress = clamp((now - state.triggeredAt) / SIGNAL_MS);
      renderer.setSignal(signalProgress);

      if (!state.rightResponded && signalProgress >= 0.70) {
        state.rightResponded = true;
        renderer.addEvent("burst", { x: 0.932, y: 0.442 }, 1700);
        sound.remoteResponse("burst", 0.82);
      }

      if (!state.leftResponded && signalProgress >= 0.80) {
        state.leftResponded = true;
        renderer.addEvent("annihilation", { x: 0.075, y: 0.328 }, 2350);
        sound.remoteResponse("annihilation", -0.78);
      }

      if (state.phase === "transmitting" && now - state.triggeredAt >= REVEAL_DELAY_MS) {
        state.revealStartedAt = now;
        setPhase("revealing");
        sound.reveal();
      }

      if (state.phase === "revealing") {
        const revealProgress = clamp((now - state.revealStartedAt) / REVEAL_MS);
        renderer.setReveal(easeInOutCubic(revealProgress));
        if (revealProgress >= 1) {
          renderer.setReveal(1);
          renderer.setSignal(-1);
          state.dwell = 0;
          setPhase("revealed");
          revealCopy.classList.add("is-visible");
          status.textContent = "你的触碰已经传向下一颗；这也许只是某个存在的一次念头。";
        }
      }

      if (state.phase === "secondary" && signalProgress >= 1) {
        renderer.setSignal(-1);
        state.dwell = 0;
        setPhase("revealed");
      }
    }

    renderer.setPointer(pointer.source, pointer.energy);
    renderer.setParallax(pointer.view);
    renderer.setDwell(state.dwell);
    sound.setPointerEnergy(pointer.energy * (0.45 + state.dwell * 0.55));
    progressBar.style.transform = `scaleX(${state.dwell})`;
    scheduleAmbientEvent(now);
  }

  function frame(now) {
    const delta = Math.min(50, now - state.lastFrameAt);
    state.lastFrameAt = now;
    if (!state.hidden) {
      update(now, delta);
      renderer.render(now);
    }
    requestAnimationFrame(frame);
  }

  async function toggleSound() {
    const shouldEnable = !sound.enabled;
    if (shouldEnable) await sound.enable();
    else sound.disable();
    soundButton.setAttribute("aria-pressed", String(shouldEnable));
    soundLabel.textContent = shouldEnable ? "SOUND ON" : "SOUND OFF";
  }

  async function initialize() {
    try {
      await renderer.initialize("./assets");
      setPhase("idle");
      prompt.textContent = INITIAL_PROMPT;
      status.textContent = "移动鼠标，在球体表面寻找会回应的位置并停留片刻。";
      window.setTimeout(() => premise.classList.add("is-visible"), 480);
      window.setTimeout(() => prompt.classList.add("is-visible"), 900);
      requestAnimationFrame(frame);
    } catch (error) {
      console.error(error);
      setPhase("error");
      status.textContent = "这个世界未能正常加载。";
    }
  }

  window.addEventListener("resize", () => renderer.resize());
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerleave", leaveWorld);
  soundButton.addEventListener("click", toggleSound);
  document.addEventListener("visibilitychange", () => {
    state.hidden = document.hidden;
    sound.setVisible(!document.hidden);
  });

  initialize();
})();
