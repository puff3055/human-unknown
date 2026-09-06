(() => {
  "use strict";
  const world = document.querySelector("[data-world]");
  const canvas = document.querySelector("[data-canvas]");
  const premise = document.querySelector("[data-premise]");
  const prompt = document.querySelector("[data-prompt]");
  const revealCopy = document.querySelector("[data-reveal]");
  const depthLabel = document.querySelector("[data-depth]");
  const status = document.querySelector("[data-status]");
  const soundButton = document.querySelector("[data-sound]");
  const soundLabel = document.querySelector("[data-sound-label]");
  const scaleControl = document.querySelector("[data-scale-control]");
  const scaleInput = document.querySelector("[data-scale-input]");
  const scaleValue = document.querySelector("[data-scale-value]");
  const scaleStepButtons = document.querySelectorAll("[data-scale-step]");
  const scaleRail = document.querySelector(".scale-control__rail-wrap");
  const renderer = new window.PlanetNeuronRenderer(canvas);
  const sound = new window.PlanetNeuronSound();
  const HERO = { x: 0.466, y: 0.505 };
  const pointer = { source: { ...HERO }, active: false, overNode: false, speed: 0, lastX: innerWidth / 2, lastY: innerHeight / 2, lastMoveAt: 0, energy: 0, parallax: { x: 0, y: 0 }, parallaxTarget: { x: 0, y: 0 } };
  const state = { phase: "loading", depth: 0, targetDepth: 0, lastLevel: 0, clickedAt: -1, signalAt: -1, diveAt: -1, diveStartDepth: 0, diveTargetDepth: 1, firstCycleComplete: false, secondCycleComplete: false, nextAmbientAt: performance.now() + 1800, ambientIndex: 0, lastFrameAt: performance.now(), scaleEnergy: 0, hidden: false };
  let scaleDragging = false;
  const eventPositions = [
    { x: 0.184, y: 0.812 }, { x: 0.278, y: 0.485 }, { x: 0.748, y: 0.824 },
    { x: 0.826, y: 0.286 }, { x: 0.535, y: 0.638 }, { x: 0.371, y: 0.235 },
  ];
  const MIN_DEPTH = Number(scaleInput.min);
  const MAX_DEPTH = Number(scaleInput.max);

  function clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
  function easeInOutCubic(value) { return value < .5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2; }
  function setPhase(phase) { state.phase = phase; world.dataset.phase = phase; }

  function cancelAutomaticDive() {
    if (state.clickedAt < 0) return;
    state.clickedAt = -1;
    renderer.setClick(-1);
    renderer.setSignal(-1);
    renderer.setSeam(0);
    prompt.classList.add("is-visible");
    status.textContent = "观察距离已由你接管。";
    setPhase("exploring");
  }

  function setManualDepth(nextDepth, immediate = false) {
    cancelAutomaticDive();
    state.targetDepth = clamp(nextDepth, MIN_DEPTH, MAX_DEPTH);
    if (immediate) state.depth = state.targetDepth;
    state.scaleEnergy = 1;
    premise.classList.add("is-gone");
    setPhase("exploring");
    sound.setScaleMotion(1, Math.sign(state.targetDepth - state.depth));
  }

  function updateScaleControl() {
    const progress = (state.depth - MIN_DEPTH) / (MAX_DEPTH - MIN_DEPTH);
    scaleInput.value = String(state.depth);
    scaleControl.style.setProperty("--scale-position", ((1 - clamp(progress)) * 100) + "%");
    const displayLevel = Math.max(0, Math.floor(state.depth)) + 1;
    scaleValue.textContent = "尺度 " + String(displayLevel).padStart(2, "0");
  }

  function setDepthFromScalePointer(event) {
    const rect = scaleRail.getBoundingClientRect();
    const progress = 1 - clamp((event.clientY - rect.top) / rect.height);
    setManualDepth(MIN_DEPTH + progress * (MAX_DEPTH - MIN_DEPTH), true);
  }

  function updatePointer(event) {
    const now = performance.now();
    const elapsed = Math.max(16, now - pointer.lastMoveAt);
    const distance = Math.hypot(event.clientX - pointer.lastX, event.clientY - pointer.lastY);
    pointer.speed = distance / elapsed * 1000;
    pointer.lastX = event.clientX; pointer.lastY = event.clientY; pointer.lastMoveAt = now;
    pointer.active = true;
    pointer.source = renderer.screenToSource(event.clientX, event.clientY);
    pointer.overNode = renderer.isOverLivingNode(pointer.source);
    pointer.parallaxTarget.x = (event.clientX / innerWidth - .5) * 2;
    pointer.parallaxTarget.y = (.5 - event.clientY / innerHeight) * 2;
  }

  function leaveWorld() {
    pointer.active = false; pointer.overNode = false;
    pointer.parallaxTarget.x = 0; pointer.parallaxTarget.y = 0;
  }

  function handleWheel(event) {
    event.preventDefault();
    if (["compressing", "transmitting", "diving"].includes(state.phase)) return;
    const modeScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const delta = clamp(event.deltaY * modeScale, -160, 160);
    state.targetDepth = clamp(state.targetDepth + delta * .00135, MIN_DEPTH, MAX_DEPTH);
    state.scaleEnergy = clamp(state.scaleEnergy + Math.abs(delta) / 130);
    setPhase("exploring");
    premise.classList.add("is-gone");
    sound.setScaleMotion(state.scaleEnergy, Math.sign(delta));
  }

  function handleClick(event) {
    if (event.target.closest("[data-sound]") || ["compressing", "transmitting", "diving"].includes(state.phase)) return;
    pointer.source = renderer.screenToSource(event.clientX, event.clientY);
    if (!renderer.isOverLivingNode(pointer.source)) return;
    const now = performance.now();
    state.clickedAt = now; state.signalAt = now + 460; state.diveAt = now + 1280;
    state.diveStartDepth = state.depth; state.diveTargetDepth = Math.floor(state.depth) + 1;
    renderer.setClick(0, pointer.source); renderer.setSignal(-1); renderer.addEvent("burst", pointer.source, 1350);
    setPhase("compressing");
    premise.classList.add("is-gone"); prompt.classList.add("is-gone");
    status.textContent = "信号正在聚拢。";
    sound.triggerSignal();
  }

  function updateNarrative() {
    const displayLevel = Math.max(0, Math.floor(state.depth));
    depthLabel.textContent = "SCALE " + String(displayLevel + 1).padStart(2, "0");
    if (displayLevel >= 2 && !state.secondCycleComplete) {
      state.secondCycleComplete = true;
      revealCopy.textContent = "尺度改变了。它没有。";
      revealCopy.classList.add("is-visible");
    } else if (displayLevel >= 1 && !state.firstCycleComplete) {
      state.firstCycleComplete = true;
      revealCopy.textContent = "靠近，没有使它变小。";
      revealCopy.classList.add("is-visible");
    }
  }

  function scheduleAmbientEvent(now) {
    if (now < state.nextAmbientAt || ["compressing", "transmitting"].includes(state.phase)) return;
    const position = eventPositions[state.ambientIndex % eventPositions.length];
    const kind = state.ambientIndex % 3 === 1 ? "annihilation" : "burst";
    renderer.addEvent(kind, position, kind === "burst" ? 1450 : 2250);
    sound.ambientEvent(kind, position.x);
    state.ambientIndex += 1;
    state.nextAmbientAt = now + 2700 + Math.random() * 3900;
  }

  function update(now, delta) {
    const calm = 1 - clamp(pointer.speed / 880);
    const targetEnergy = pointer.active && pointer.overNode ? .38 + calm * .62 : 0;
    pointer.energy += (targetEnergy - pointer.energy) * clamp(delta / 135);
    pointer.speed *= Math.pow(.84, delta / 16.67);
    pointer.parallax.x += (pointer.parallaxTarget.x - pointer.parallax.x) * clamp(delta / 260);
    pointer.parallax.y += (pointer.parallaxTarget.y - pointer.parallax.y) * clamp(delta / 260);

    if (state.clickedAt >= 0) {
      const clickAge = clamp((now - state.clickedAt) / 1120);
      renderer.setClick(clickAge);
      if (now >= state.signalAt) {
        setPhase(now < state.diveAt ? "transmitting" : "diving");
        renderer.setSignal(clamp((now - state.signalAt) / 1380));
      }
      if (now >= state.diveAt) {
        const diveProgress = clamp((now - state.diveAt) / 3650);
        const eased = easeInOutCubic(diveProgress);
        state.depth = state.diveStartDepth + (state.diveTargetDepth - state.diveStartDepth) * eased;
        state.targetDepth = state.depth;
        renderer.setSeam(Math.sin(clamp((diveProgress - .68) / .32) * Math.PI) * .88);
        sound.setScaleMotion(.5 + eased * .5, 1);
        if (diveProgress >= 1) {
          state.depth = state.diveTargetDepth; state.targetDepth = state.depth; state.clickedAt = -1;
          renderer.setClick(-1); renderer.setSignal(-1); renderer.setSeam(0); setPhase("free");
          prompt.textContent = "拖动右侧尺度，或滚动继续。点击，再注入一次信号。";
          prompt.classList.add("is-visible");
          status.textContent = "同一种结构仍在更深处延续。";
        }
      }
    } else {
      const depthDelta = state.targetDepth - state.depth;
      state.depth += depthDelta * clamp(delta / 145);
      state.scaleEnergy += (Math.min(1, Math.abs(depthDelta) * 4.5) - state.scaleEnergy) * clamp(delta / 150);
      renderer.setSeam(Math.pow(Math.max(0, (state.depth - Math.floor(state.depth) - .78) / .22), 1.4) * .55);
      if (Math.abs(depthDelta) < .0008) {
        state.depth = state.targetDepth;
        if (state.phase === "exploring") setPhase("free");
      }
    }

    const level = Math.floor(state.depth);
    if (level !== state.lastLevel) { sound.scaleCrossing(Math.sign(level - state.lastLevel)); state.lastLevel = level; updateNarrative(); }
    renderer.setDepth(state.depth);
    pointer.source = renderer.screenToSource(pointer.lastX, pointer.lastY);
    pointer.overNode = pointer.active && renderer.isOverLivingNode(pointer.source);
    renderer.setPointer(pointer.source, pointer.energy); renderer.setParallax(pointer.parallax);
    sound.setPointerEnergy(pointer.energy); updateScaleControl(); scheduleAmbientEvent(now);
  }

  function frame(now) {
    const delta = Math.min(50, now - state.lastFrameAt); state.lastFrameAt = now;
    if (!state.hidden) { update(now, delta); renderer.render(now); }
    requestAnimationFrame(frame);
  }

  async function toggleSound() {
    const shouldEnable = !sound.enabled;
    if (shouldEnable) await sound.enable(); else sound.disable();
    soundButton.setAttribute("aria-pressed", String(shouldEnable));
    soundLabel.textContent = shouldEnable ? "SOUND ON" : "SOUND OFF";
  }

  async function initialize() {
    try {
      await renderer.initialize("./assets"); renderer.setDepth(0); setPhase("idle");
      status.textContent = "拖动右侧尺度或滚动改变观察距离；点击任意球形节点注入信号。";
      updateScaleControl();
      window.setTimeout(() => premise.classList.add("is-visible"), 420);
      window.setTimeout(() => prompt.classList.add("is-visible"), 860);
      requestAnimationFrame(frame);
    } catch (error) { console.error(error); setPhase("error"); status.textContent = "这个世界未能正常加载。"; }
  }

  window.addEventListener("resize", () => renderer.resize());
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerleave", leaveWorld);
  window.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("click", handleClick);
  scaleInput.addEventListener("pointerdown", cancelAutomaticDive);
  scaleInput.addEventListener("input", () => setManualDepth(Number(scaleInput.value), true));
  scaleRail.addEventListener("pointerdown", (event) => {
    scaleDragging = true;
    scaleRail.setPointerCapture(event.pointerId);
    setDepthFromScalePointer(event);
    event.preventDefault();
  });
  scaleRail.addEventListener("pointermove", (event) => {
    if (scaleDragging) setDepthFromScalePointer(event);
  });
  scaleRail.addEventListener("pointerup", (event) => {
    scaleDragging = false;
    if (scaleRail.hasPointerCapture(event.pointerId)) scaleRail.releasePointerCapture(event.pointerId);
    setPhase("free");
  });
  scaleStepButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isNear = button.dataset.scaleStep === "near";
      const nextLevel = isNear ? Math.floor(state.depth) + 1 : Math.ceil(state.depth) - 1;
      setManualDepth(nextLevel);
    });
  });
  soundButton.addEventListener("click", toggleSound);
  document.addEventListener("visibilitychange", () => { state.hidden = document.hidden; sound.setVisible(!document.hidden); });
  initialize();
})();
