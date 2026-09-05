(() => {
  'use strict';

  const experience = document.getElementById('experience');
  const canvas = document.getElementById('worldCanvas');
  const entryPanel = document.getElementById('entryPanel');
  const entryAction = document.getElementById('entryAction');
  const guideText = document.getElementById('guideText');
  const actionHint = document.getElementById('actionHint');
  const inputStatus = document.getElementById('inputStatus');
  const soundToggle = document.getElementById('soundToggle');
  const soundState = document.getElementById('soundState');
  const motionToggle = document.getElementById('motionToggle');
  const motionState = document.getElementById('motionState');
  const hintToggle = document.getElementById('hintToggle');
  const hintState = document.getElementById('hintState');
  const micToggle = document.getElementById('micToggle');
  const micState = document.getElementById('micState');
  const archive = document.getElementById('archive');
  const anchors = Array.from(document.querySelectorAll('.anchor'));

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const savedReducedMotion = readPreference('hu:reduced-motion');
  const handoff = readHandoff();
  const params = new URLSearchParams(window.location.search);
  const qaMode = params.get('qa') === '1';

  const GUIDES = {
    threshold: [
      '不要急着辨认它。先让这里有一个方向。',
    ],
    section: [
      '它被困在这些空腔里。',
      '不——被边界分开的，可能只是我们。',
      '别追形状。沿着你留下的路线回来。',
    ],
    exchange: [
      '我找不到个体。先看交换怎样自己经过这里。',
      '它在向你索取。再给它一点。',
      '这里没有谁拥有资源。交换本身，正在决定谁暂时存在。',
    ],
    reality: [
      '这里只有你走过的这一条。其余只是没有发生。',
      '我说“没有发生”，只是因为这里没有把它算作现在。',
      '被我们丢下的关系，仍有能力完成这里。',
    ],
  };

  const HINTS = {
    threshold: [
      '在画面中按住并移动；形成一条清楚的方向后，由你决定何时放开。',
    ],
    section: [
      '按住探针，横向穿过至少两道看似封闭的边界。',
      '让探针到达左、中、右三个断面；观察它们共享的脉冲。',
      '先放开，再按住，沿刚才留下的轨迹返回一段。',
    ],
    exchange: [
      '先不按下，移动到两个相隔较远的区域，看看流动是否依赖你。',
      '按住一处注入，再去看与它相反的远端；看见代价后，换一次更宽的动作。',
      '整体已经回应。再次触碰最后那股离开的流。',
    ],
    reality: [
      '按住画出一条路径再放开；换一个方向重复一次。旧路径不会被清除。',
      '让当前路径先抵达右下方的接缝；停滞后，回到一条冷银旧痕迹，再把它带向接缝。',
      '结果已显露。再触碰一次共同形成的接缝，进入来源档案。',
    ],
  };

  const ANCHOR_KEYS = {
    section: ['section-1', 'section-2', 'section-3'],
    exchange: ['exchange-1', 'exchange-2', 'exchange-3'],
    reality: ['reality-1', 'reality-2', 'reality-3'],
  };

  const initialX = clamp(handoff?.approach?.x ?? 0.5, 0.04, 0.96);
  const initialY = clamp(handoff?.approach?.y ?? 0.52, 0.04, 0.96);
  const seed = Number.isFinite(handoff?.seed) ? handoff.seed : 248731;

  const state = {
    started: false,
    chapter: 'entry',
    stage: 0,
    transition: 0,
    eventSerial: 0,
    events: [],
    revisitMode: false,
    hintsVisible: false,
    reducedMotion: savedReducedMotion === null ? reduceMotionQuery.matches : savedReducedMotion,
    pointer: {
      x: initialX,
      y: initialY,
      previousX: initialX,
      previousY: initialY,
      active: false,
      visible: false,
      type: handoff?.inputType || 'mouse',
      pressure: 0,
      speed: 0,
      energy: 0,
      totalTravel: 0,
      contactSerial: 0,
      pointerId: null,
      keyboardLatched: false,
    },
    threshold: createThresholdState(),
    section: createSectionState(),
    exchange: createExchangeState(),
    reality: createRealityState(),
    micLevel: 0,
  };

  const renderer = new window.HumanUnknownRenderer(canvas, {
    reducedMotion: state.reducedMotion,
    seed,
  });
  const audio = new window.HumanUnknownAudio();

  let lastFrameAt = performance.now();
  let fpsStartedAt = lastFrameAt;
  let fpsFrames = 0;
  let guideRevision = 0;

  function createThresholdState() {
    return {
      travel: 0,
      coherence: 0,
      axisX: handoff?.approach?.directionX || 0,
      axisY: handoff?.approach?.directionY || 0,
      axisLength: 0,
      directionSamples: 0,
      consistentDistance: 0,
    };
  }

  function createSectionState() {
    return {
      visitedZones: new Set(),
      lastZone: null,
      crossings: 0,
      totalDistance: 0,
      continuity: 0,
      path: [],
      memoryPath: [],
      revisitDistance: 0,
      stageTwoContact: -1,
      resolved: false,
      resolveContact: -1,
    };
  }

  function createExchangeState() {
    return {
      probedZones: new Set(),
      probeDistance: 0,
      injectionEnergy: 0,
      injectionOrigin: null,
      remoteSeen: false,
      remoteSeenContact: -1,
      bridgeStart: null,
      bridgeSpan: 0,
      coherence: 0,
      resolved: false,
      resolveContact: -1,
      exitPoint: { x: 0.77, y: 0.56 },
    };
  }

  function createRealityState() {
    return {
      currentPath: [],
      currentDistance: 0,
      echoPaths: [],
      stalled: false,
      selectedEcho: -1,
      target: { x: 0.68, y: 0.61 },
      resolved: false,
      resolveContact: -1,
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function readPreference(key) {
    try {
      const value = window.localStorage.getItem(key);
      if (value === null) return null;
      return value === 'true';
    } catch (error) {
      return null;
    }
  }

  function savePreference(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      // The experience remains complete when storage is unavailable.
    }
  }

  function readHandoff() {
    try {
      const raw = window.sessionStorage.getItem('humanUnknownHandoff:v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.version === 1 ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function recordEvent(type, payload = {}) {
    const event = {
      id: ++state.eventSerial,
      type,
      chapter: state.chapter,
      stage: state.stage,
      at: Math.round(performance.now()),
      payload,
    };
    state.events.push(event);
    if (state.events.length > 80) state.events.shift();
    canvas.dataset.lastEvent = type;
    return event;
  }

  function activateAnchor(key) {
    anchors.forEach((anchor) => {
      anchor.classList.toggle('is-active', anchor.dataset.anchor === key);
    });
    canvas.dataset.anchor = key;
  }

  function setGuide(text) {
    guideRevision += 1;
    const revision = guideRevision;
    guideText.classList.add('is-changing');
    requestAnimationFrame(() => {
      if (revision !== guideRevision) return;
      guideText.textContent = text;
      guideText.classList.remove('is-changing');
    });
  }

  function updateHint() {
    const hints = HINTS[state.chapter];
    const hint = hints ? hints[Math.min(state.stage, hints.length - 1)] : '';
    actionHint.textContent = hint;
    actionHint.hidden = !state.hintsVisible || !hint || state.chapter === 'archive' || state.chapter === 'entry';
  }

  function announce(text) {
    inputStatus.textContent = '';
    requestAnimationFrame(() => {
      inputStatus.textContent = text;
    });
  }

  function setChapter(chapter, options = {}) {
    state.pointer.active = false;
    state.pointer.pressure = 0;
    state.pointer.pointerId = null;
    state.pointer.keyboardLatched = false;

    if (state.chapter === 'exchange' && chapter !== 'exchange' && audio.micEnabled) {
      audio.stopMic();
      micToggle.setAttribute('aria-pressed', 'false');
      micState.textContent = '关闭';
    }

    state.chapter = chapter;
    state.stage = options.stage || 0;
    state.transition = state.reducedMotion ? 0.08 : 1;
    experience.dataset.chapter = chapter;
    experience.dataset.stage = String(state.stage);
    micToggle.hidden = chapter !== 'exchange';
    audio.setChapter(chapter);

    if (chapter === 'threshold') {
      activateAnchor('section-1');
      setGuide(GUIDES.threshold[0]);
      recordEvent('entry.intent', { inputType: state.pointer.type, seed });
    }

    if (ANCHOR_KEYS[chapter]) {
      activateAnchor(ANCHOR_KEYS[chapter][state.stage]);
      setGuide(GUIDES[chapter][state.stage]);
    }

    updateHint();
    canvas.dataset.chapter = chapter;
    canvas.dataset.stage = String(state.stage);
  }

  function setStage(stage, eventType, payload = {}) {
    if (!ANCHOR_KEYS[state.chapter] || stage === state.stage) return;
    state.stage = clamp(stage, 0, 2);
    experience.dataset.stage = String(state.stage);
    canvas.dataset.stage = String(state.stage);
    activateAnchor(ANCHOR_KEYS[state.chapter][state.stage]);
    setGuide(GUIDES[state.chapter][state.stage]);
    updateHint();
    recordEvent(eventType, payload);
    audio.pulse(stage === 2 ? 'reply' : 'evidence', state.pointer.x, stage === 2 ? 0.78 : 0.48);
  }

  function beginJourney() {
    if (state.started) return;
    state.started = true;
    entryPanel.classList.add('is-departing');
    setChapter('threshold');
    announce('入口已经响应。请在画面中按住并移动，形成一个方向。');
    requestAnimationFrame(() => canvas.focus({ preventScroll: true }));
  }

  function updatePointerFromEvent(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
    const y = clamp((event.clientY - bounds.top) / Math.max(1, bounds.height), 0, 1);
    movePointer(x, y, event.timeStamp || performance.now(), event.pointerType || state.pointer.type);
    state.pointer.pressure = clamp(event.pressure || (state.pointer.active ? 0.5 : 0), 0, 1);
  }

  function movePointer(x, y, timestamp, pointerType = state.pointer.type) {
    const previous = { x: state.pointer.x, y: state.pointer.y };
    const next = { x, y };
    const distance = distanceBetween(previous, next);
    const pixelDistance = Math.hypot(
      (x - previous.x) * renderer.width,
      (y - previous.y) * renderer.height,
    );
    const elapsed = Math.max(8, timestamp - (state.pointer.lastEventAt || timestamp - 16));

    state.pointer.previousX = state.pointer.x;
    state.pointer.previousY = state.pointer.y;
    state.pointer.x = x;
    state.pointer.y = y;
    state.pointer.visible = true;
    state.pointer.type = pointerType;
    state.pointer.speed = pixelDistance * 1000 / elapsed;
    state.pointer.energy = clamp(state.pointer.energy + Math.min(0.48, pixelDistance / 130), 0, 1);
    state.pointer.totalTravel += distance;
    state.pointer.lastEventAt = timestamp;

    updateAnchorParallax();
    if (state.started && distance > 0) processMovement(previous, next, distance);
  }

  function updateAnchorParallax() {
    const x = (state.pointer.x - 0.5) * (state.reducedMotion ? 0 : -12);
    const y = (state.pointer.y - 0.5) * (state.reducedMotion ? 0 : -8);
    const active = anchors.find((anchor) => anchor.classList.contains('is-active'));
    if (!active) return;
    active.style.setProperty('--anchor-x', `${x.toFixed(2)}px`);
    active.style.setProperty('--anchor-y', `${y.toFixed(2)}px`);
  }

  function handleContactStart() {
    state.pointer.active = true;
    state.pointer.contactSerial += 1;
    state.pointer.energy = clamp(state.pointer.energy + 0.24, 0, 1);
    recordEvent('input.contact', {
      x: Number(state.pointer.x.toFixed(3)),
      y: Number(state.pointer.y.toFixed(3)),
      pressure: Number(state.pointer.pressure.toFixed(2)),
    });

    if (state.chapter === 'exchange') {
      const field = state.exchange;
      if (!field.injectionOrigin || field.resolved) {
        field.injectionOrigin = { x: state.pointer.x, y: state.pointer.y };
      }
      if (field.remoteSeen && state.pointer.contactSerial > field.remoteSeenContact) {
        field.bridgeStart = { x: state.pointer.x, y: state.pointer.y };
        field.bridgeSpan = 0;
      }
      if (field.resolved && distanceBetween(state.pointer, field.exitPoint) < 0.2) {
        recordEvent('exchange.field_reachable', { from: field.exitPoint });
        if (state.revisitMode) openArchive();
        else enterReality();
      }
    }

    if (state.chapter === 'reality') {
      const reality = state.reality;
      if (reality.resolved && state.pointer.contactSerial > reality.resolveContact && distanceBetween(state.pointer, reality.target) < 0.2) {
        recordEvent('archive.intent', { junction: reality.target });
        openArchive();
        return;
      }
      reality.currentPath = [{ x: state.pointer.x, y: state.pointer.y }];
      reality.currentDistance = 0;
      if (state.stage >= 1 && reality.stalled && reality.selectedEcho < 0) {
        const nearest = findNearestEcho(state.pointer, 0.09);
        if (nearest >= 0) selectEcho(nearest);
      }
    }

    if (state.chapter === 'section' && state.stage === 2) {
      state.section.path = [{ x: state.pointer.x, y: state.pointer.y }];
    }
  }

  function handleContactEnd() {
    if (!state.pointer.active) return;
    state.pointer.active = false;
    state.pointer.pressure = 0;
    recordEvent('input.release', {
      x: Number(state.pointer.x.toFixed(3)),
      y: Number(state.pointer.y.toFixed(3)),
    });

    if (state.chapter === 'threshold') releaseThreshold();
    else if (state.chapter === 'section') releaseSection();
    else if (state.chapter === 'exchange') releaseExchange();
    else if (state.chapter === 'reality') releaseReality();
  }

  function processMovement(previous, next, distance) {
    if (state.chapter === 'threshold') moveThreshold(previous, next, distance);
    else if (state.chapter === 'section') moveSection(previous, next, distance);
    else if (state.chapter === 'exchange') moveExchange(previous, next, distance);
    else if (state.chapter === 'reality') moveReality(previous, next, distance);
  }

  function moveThreshold(previous, next, distance) {
    if (!state.pointer.active) return;
    const threshold = state.threshold;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) return;
    const directionX = dx / length;
    const directionY = dy / length;

    if (threshold.directionSamples === 0) {
      threshold.axisX = directionX;
      threshold.axisY = directionY;
    } else {
      const dot = directionX * threshold.axisX + directionY * threshold.axisY;
      const alignment = Math.abs(dot);
      threshold.consistentDistance += distance * (0.35 + alignment * 0.65);
      const sign = dot < 0 ? -1 : 1;
      threshold.axisX = threshold.axisX * 0.82 + directionX * sign * 0.18;
      threshold.axisY = threshold.axisY * 0.82 + directionY * sign * 0.18;
      const axisLength = Math.hypot(threshold.axisX, threshold.axisY) || 1;
      threshold.axisX /= axisLength;
      threshold.axisY /= axisLength;
    }
    threshold.directionSamples += 1;
    threshold.travel += distance;
    threshold.axisLength = clamp(threshold.travel / 0.34, 0, 1);
    threshold.coherence = clamp(
      threshold.travel * 1.7 + threshold.consistentDistance * 1.45,
      0,
      1,
    );
  }

  function releaseThreshold() {
    const threshold = state.threshold;
    if (threshold.travel >= 0.26 && threshold.coherence >= 0.58) {
      recordEvent('axis.coherent', {
        direction: [Number(threshold.axisX.toFixed(3)), Number(threshold.axisY.toFixed(3))],
        confidence: Number(threshold.coherence.toFixed(3)),
      });
      enterSection();
    } else {
      announce('方向还没有留下来。再次按住，用更连贯的动作带它移动。');
      setGuide('速度只会把入口压得更薄。换一个更连贯的方向。');
    }
  }

  function enterSection() {
    state.section = createSectionState();
    setChapter('section');
    announce('你已进入第一个空间。按住探针穿过看似封闭的区域。');
  }

  function moveSection(previous, next, distance) {
    const section = state.section;
    if (!state.pointer.active) return;

    addPathPoint(section.path, next);
    section.totalDistance += distance;
    const zone = clamp(Math.floor(next.x * 3), 0, 2);
    section.visitedZones.add(zone);
    if (section.lastZone !== null && zone !== section.lastZone) section.crossings += 1;
    section.lastZone = zone;

    if (state.stage === 0 && section.crossings >= 2 && section.totalDistance >= 0.24) {
      setStage(1, 'slice.boundary_crossed', {
        crossings: section.crossings,
        zones: Array.from(section.visitedZones),
      });
      return;
    }

    if (state.stage === 1) {
      section.continuity = clamp(section.visitedZones.size / 3 * 0.5 + section.totalDistance * 0.68, 0, 1);
      if (section.visitedZones.size === 3 && section.totalDistance >= 0.54) {
        section.memoryPath = decimatePath(section.path, 360);
        section.path = [];
        section.stageTwoContact = state.pointer.contactSerial;
        setStage(2, 'being.continuity_proven', {
          segments: 3,
          coherence: Number(section.continuity.toFixed(3)),
        });
        return;
      }
    }

    if (state.stage === 2 && state.pointer.contactSerial > section.stageTwoContact) {
      const nearest = distanceToPath(next, section.memoryPath);
      if (nearest < 0.064) section.revisitDistance += distance;
      if (!section.resolved && section.revisitDistance >= 0.2) {
        section.resolved = true;
        section.resolveContact = state.pointer.contactSerial;
        setGuide('我们没有看见它的全貌。它借我们的路线，看见了我们。');
        recordEvent('being.route_returned', {
          revisit: Number(section.revisitDistance.toFixed(3)),
        });
        audio.pulse('reply', state.pointer.x, 0.9);
        announce('同一存在已经沿你的轨迹回应。放开接触，让它把路线继续写下去。');
      }
    }
  }

  function releaseSection() {
    const section = state.section;
    if (state.stage === 2 && state.pointer.contactSerial === section.stageTwoContact) {
      announce('轨迹已经留下。再次按住，沿它返回一段。');
    }
    if (section.resolved && state.pointer.contactSerial >= section.resolveContact) {
      recordEvent('being.continuity_proven', {
        segments: 3,
        routeReturned: true,
      });
      if (state.revisitMode) openArchive();
      else enterExchange();
    }
  }

  function enterExchange() {
    state.exchange = createExchangeState();
    setChapter('exchange');
    announce('交换场已显露。先移动探针，观察没有你时它怎样流动。');
  }

  function moveExchange(previous, next, distance) {
    const field = state.exchange;
    const zone = clamp(Math.floor(next.x * 3), 0, 2);

    if (!state.pointer.active) {
      field.probedZones.add(zone);
      field.probeDistance += distance;
      if (state.stage === 0 && field.probedZones.size >= 2 && field.probeDistance >= 0.17) {
        setStage(1, 'field.autonomy_seen', {
          zones: Array.from(field.probedZones),
          probeDistance: Number(field.probeDistance.toFixed(3)),
        });
      }
      return;
    }

    if (!field.injectionOrigin) field.injectionOrigin = { x: previous.x, y: previous.y };
    const pressure = Math.max(0.15, state.pointer.pressure || 0.5);
    field.injectionEnergy = clamp(field.injectionEnergy + distance * 1.55 + pressure * 0.008, 0, 1);

    if (state.stage === 0 && field.injectionEnergy >= 0.08) {
      setStage(1, 'field.perturbed', {
        location: field.injectionOrigin,
        energy: Number(field.injectionEnergy.toFixed(3)),
      });
    }

    if (state.stage === 1 && field.injectionEnergy >= 0.22 && distanceBetween(next, field.injectionOrigin) >= 0.4 && !field.remoteSeen) {
      field.remoteSeen = true;
      field.remoteSeenContact = state.pointer.contactSerial;
      recordEvent('field.remote_cost_seen', {
        source: field.injectionOrigin,
        remoteRegion: { x: next.x, y: next.y },
        delta: Number(field.injectionEnergy.toFixed(3)),
      });
      setGuide('我把明亮当成了需要。看见远处以后，换一种介入。');
      audio.pulse('remote', next.x, 0.76);
      announce('远端已经变薄。放开，然后用一次更宽的动作连接两侧。');
    }

    if (field.remoteSeen && state.pointer.contactSerial > field.remoteSeenContact && field.bridgeStart) {
      field.bridgeSpan = Math.max(field.bridgeSpan, distanceBetween(next, field.bridgeStart));
      field.coherence = clamp(field.bridgeSpan / 0.42, 0, 1);
    }
  }

  function releaseExchange() {
    const field = state.exchange;
    if (field.remoteSeen && state.pointer.contactSerial === field.remoteSeenContact) {
      announce('局部与远端的关系已经留下。再次按住，用更宽的路线重新分配。');
    }

    if (!field.resolved && field.remoteSeen && state.pointer.contactSerial > field.remoteSeenContact && field.bridgeSpan >= 0.32) {
      field.resolved = true;
      field.resolveContact = state.pointer.contactSerial;
      field.coherence = 1;
      field.exitPoint = { x: state.pointer.x, y: state.pointer.y };
      setStage(2, 'field.system_reply', {
        restraint: Number((1 - clamp(state.pointer.energy, 0, 1)).toFixed(3)),
        globalCoherence: 1,
      });
      announce('整体已经越过你的接触继续流动。再次触碰最后离开的亮点。');
    }
  }

  function enterReality() {
    state.reality = createRealityState();
    setChapter('reality');
    announce('一条路径将被保留。按住画出它，再放开。');
  }

  function moveReality(previous, next, distance) {
    const reality = state.reality;
    if (!state.pointer.active || reality.resolved) return;
    addPathPoint(reality.currentPath, next);
    reality.currentDistance += distance;

    if (state.stage >= 1) {
      if (!reality.stalled && distanceBetween(next, reality.target) < 0.105) {
        reality.stalled = true;
        setGuide('现在这一条到不了。去找一条已经被你放下的路径。');
        recordEvent('reality.current_stalled', { target: reality.target });
        audio.pulse('remote', next.x, 0.58);
        announce('当前路径已经停滞。回到任一条冷银旧路径，再把它带向接缝。');
      }

      if (reality.stalled && reality.selectedEcho < 0) {
        const nearest = findNearestEcho(next, 0.07);
        if (nearest >= 0) selectEcho(nearest);
      }

      if (reality.stalled && reality.selectedEcho >= 0 && distanceBetween(next, reality.target) < 0.11 && reality.currentDistance >= 0.16) {
        reality.resolved = true;
        reality.resolveContact = state.pointer.contactSerial;
        setStage(2, 'reality.echo_cooperation', {
          traces: [reality.selectedEcho, 'current'],
          seamCoherence: 1,
        });
        announce('共同接缝已经形成。放开后，再触碰一次接缝，把这段关系带出去。');
      }
    }
  }

  function releaseReality() {
    const reality = state.reality;
    if (reality.resolved) return;
    if (reality.currentPath.length >= 2 && reality.currentDistance >= 0.12) {
      reality.echoPaths.push(decimatePath(reality.currentPath, 160));
      if (reality.echoPaths.length > 4) reality.echoPaths.shift();
      recordEvent('reality.abandoned', {
        traceId: reality.echoPaths.length - 1,
        points: reality.currentPath.length,
      });
      audio.pulse('echo', state.pointer.x, 0.55);
      reality.currentPath = [];
      reality.currentDistance = 0;
      if (state.stage === 0 && reality.echoPaths.length >= 2) {
        setStage(1, 'reality.echoes_visible', {
          traces: reality.echoPaths.length,
        });
        announce('两条旧路径仍在。现在让当前路径去触碰右下方尚未展开的接缝。');
      } else {
        announce('路径没有消失。换一个方向，再留下另一条。');
      }
    }
  }

  function selectEcho(index) {
    const reality = state.reality;
    reality.selectedEcho = index;
    recordEvent('reality.echo_joined', {
      traceId: index,
      junction: reality.target,
    });
    setGuide('它认得这条旧路。现在把它带回那道未完成的接缝。');
    audio.pulse('echo', state.pointer.x, 0.78);
  }

  function findNearestEcho(point, threshold) {
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    state.reality.echoPaths.forEach((path, index) => {
      const distance = distanceToPath(point, path);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    return nearestDistance <= threshold ? nearestIndex : -1;
  }

  function addPathPoint(path, point) {
    const last = path[path.length - 1];
    if (!last || distanceBetween(last, point) >= 0.006) {
      path.push({ x: point.x, y: point.y });
      if (path.length > 520) path.splice(0, path.length - 520);
    }
  }

  function decimatePath(path, maximum) {
    if (path.length <= maximum) return path.map((point) => ({ ...point }));
    const step = path.length / maximum;
    return Array.from({ length: maximum }, (_, index) => ({ ...path[Math.floor(index * step)] }));
  }

  function distanceToPath(point, path) {
    if (!path || !path.length) return Infinity;
    let minimum = Infinity;
    const stride = Math.max(1, Math.floor(path.length / 90));
    for (let index = 0; index < path.length; index += stride) {
      minimum = Math.min(minimum, distanceBetween(point, path[index]));
    }
    return minimum;
  }

  function openArchive() {
    state.pointer.active = false;
    state.pointer.pressure = 0;
    state.pointer.pointerId = null;
    state.pointer.keyboardLatched = false;
    state.chapter = 'archive';
    state.stage = 0;
    state.transition = state.reducedMotion ? 0 : 0.7;
    experience.dataset.chapter = 'archive';
    experience.dataset.stage = '0';
    document.body.classList.add('has-archive');
    archive.hidden = false;
    micToggle.hidden = true;
    audio.setChapter('archive');
    activateAnchor('reality-3');
    updateJourneyEchoes();
    updateHint();
    canvas.dataset.chapter = 'archive';
    recordEvent('archive.opened', { revisit: state.revisitMode });
    try {
      window.sessionStorage.setItem('humanUnknownWorlds:complete', 'true');
    } catch (error) {
      // Completion is visible without storage.
    }
    window.scrollTo({ top: 0, behavior: state.reducedMotion ? 'auto' : 'smooth' });
    requestAnimationFrame(() => document.getElementById('archiveTitle').focus?.());
  }

  function updateJourneyEchoes() {
    const sectionEcho = document.getElementById('sectionEcho');
    const exchangeEcho = document.getElementById('exchangeEcho');
    const realityEcho = document.getElementById('realityEcho');
    sectionEcho.textContent = `你穿过了 ${Math.max(3, state.section.crossings)} 次可见边界，并沿旧轨迹返回；形状不再是你判断同一存在的唯一依据。`;
    exchangeEcho.textContent = `你让局部与远端相隔 ${Math.round(state.exchange.bridgeSpan * 100)} 个相对尺度后重新相连；世界记住的是策略改变，不是完美平衡。`;
    realityEcho.textContent = `${Math.max(2, state.reality.echoPaths.length)} 条被放弃的路径仍留在场中；其中一条后来与当前路径共同完成了结构。`;
  }

  function revisitWorld(chapter) {
    state.revisitMode = true;
    archive.hidden = true;
    document.body.classList.remove('has-archive');
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (chapter === 'section') {
      state.section = createSectionState();
      setChapter('section');
    } else if (chapter === 'exchange') {
      state.exchange = createExchangeState();
      setChapter('exchange');
    } else {
      state.reality = createRealityState();
      setChapter('reality');
    }
    announce('你正在沿已经显露的谱系回访。完成这次关系后会回到档案。');
    requestAnimationFrame(() => canvas.focus({ preventScroll: true }));
  }

  async function toggleSound() {
    if (audio.enabled) {
      audio.disable();
      soundToggle.setAttribute('aria-pressed', 'false');
      soundState.textContent = '关闭';
      announce('声音已关闭。所有规则仍可通过视觉完成。');
      return;
    }
    try {
      const enabled = await audio.enable();
      soundToggle.setAttribute('aria-pressed', String(enabled));
      soundState.textContent = enabled ? '开启' : '不可用';
      if (enabled) {
        audio.pulse('evidence', state.pointer.x, 0.42);
        announce('声音已开启。它会回应因果关系，不会替体验计时。');
      } else {
        announce('当前浏览器不支持声音；视觉体验保持完整。');
      }
    } catch (error) {
      soundState.textContent = '不可用';
      announce('声音没有成功开启；视觉体验保持完整。');
    }
  }

  function toggleReducedMotion() {
    state.reducedMotion = !state.reducedMotion;
    experience.dataset.reduced = String(state.reducedMotion);
    motionToggle.setAttribute('aria-pressed', String(state.reducedMotion));
    motionState.textContent = state.reducedMotion ? '减少' : '完整';
    renderer.setReducedMotion(state.reducedMotion);
    savePreference('hu:reduced-motion', state.reducedMotion);
    updateAnchorParallax();
    announce(state.reducedMotion ? '已减少吸入、视差与大幅运动。叙事条件保持不变。' : '已恢复完整动态效果。');
  }

  function toggleHints() {
    state.hintsVisible = !state.hintsVisible;
    hintToggle.setAttribute('aria-pressed', String(state.hintsVisible));
    hintState.textContent = state.hintsVisible ? '显露' : '隐去';
    updateHint();
    announce(state.hintsVisible ? '明确动作提示已显示。' : '明确动作提示已隐藏。');
  }

  async function toggleMic() {
    if (audio.micEnabled) {
      audio.stopMic();
      micToggle.setAttribute('aria-pressed', 'false');
      micState.textContent = '关闭';
      announce('声息输入已关闭，麦克风轨道已经停止。');
      return;
    }
    try {
      await audio.startMic();
      soundToggle.setAttribute('aria-pressed', 'true');
      soundState.textContent = '开启';
      micToggle.setAttribute('aria-pressed', 'true');
      micState.textContent = '本地';
      announce('声息输入已开启。只在本机读取强弱与节律，不录音、不转写、不上传。');
    } catch (error) {
      micToggle.setAttribute('aria-pressed', 'false');
      micState.textContent = '未授权';
      announce('没有获得麦克风权限。按住空格或指针仍可完成全部体验。');
    }
  }

  function pointerDown(event) {
    if (!state.started || state.chapter === 'archive') return;
    event.preventDefault();
    updatePointerFromEvent(event);
    state.pointer.pointerId = event.pointerId;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture is an enhancement, not a progression dependency.
    }
    handleContactStart();
  }

  function pointerMove(event) {
    if (state.chapter === 'archive') return;
    updatePointerFromEvent(event);
  }

  function pointerUp(event) {
    if (state.chapter === 'archive') return;
    updatePointerFromEvent(event);
    handleContactEnd();
    if (state.pointer.pointerId !== null) {
      try {
        canvas.releasePointerCapture(state.pointer.pointerId);
      } catch (error) {
        // The browser may already have released it.
      }
    }
    state.pointer.pointerId = null;
  }

  function pointerCancel() {
    handleContactEnd();
    state.pointer.pointerId = null;
  }

  function keyboardDown(event) {
    if (event.key.toLowerCase() === 'm') {
      event.preventDefault();
      toggleSound();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      soundToggle.focus();
      return;
    }
    if (!state.started || state.chapter === 'archive') return;

    if (event.key === 'Enter' && !event.repeat) {
      event.preventDefault();
      state.pointer.type = 'keyboard';
      state.pointer.visible = true;
      if (state.pointer.active && state.pointer.keyboardLatched) {
        state.pointer.keyboardLatched = false;
        handleContactEnd();
      } else if (!state.pointer.active) {
        state.pointer.keyboardLatched = true;
        handleContactStart();
      }
      return;
    }

    if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();
      state.pointer.type = 'keyboard';
      state.pointer.visible = true;
      state.pointer.keyboardLatched = false;
      handleContactStart();
      return;
    }

    const step = event.shiftKey ? 0.065 : 0.034;
    let x = state.pointer.x;
    let y = state.pointer.y;
    if (event.key === 'ArrowLeft') x -= step;
    else if (event.key === 'ArrowRight') x += step;
    else if (event.key === 'ArrowUp') y -= step;
    else if (event.key === 'ArrowDown') y += step;
    else return;
    event.preventDefault();
    movePointer(clamp(x, 0.02, 0.98), clamp(y, 0.02, 0.98), performance.now(), 'keyboard');
  }

  function keyboardUp(event) {
    if (event.code !== 'Space' || !state.pointer.active || state.pointer.type !== 'keyboard' || state.pointer.keyboardLatched) return;
    event.preventDefault();
    handleContactEnd();
  }

  function animate(now) {
    const deltaSeconds = Math.min(0.05, Math.max(0.001, (now - lastFrameAt) / 1000));
    lastFrameAt = now;
    state.pointer.energy += (0 - state.pointer.energy) * (1 - Math.exp(-2.2 * deltaSeconds));
    state.transition = Math.max(0, state.transition - deltaSeconds * (state.reducedMotion ? 12 : 0.72));
    state.micLevel = audio.getMicLevel();

    if (state.chapter === 'exchange' && audio.micEnabled && state.micLevel > 0.035) {
      const field = state.exchange;
      if (!field.injectionOrigin) field.injectionOrigin = { x: state.pointer.x, y: state.pointer.y };
      field.injectionEnergy = clamp(field.injectionEnergy + state.micLevel * deltaSeconds * 0.14, 0, 1);
    }

    const snapshot = createRenderSnapshot();
    renderer.render(now, snapshot);
    audio.update(snapshot);

    fpsFrames += 1;
    if (now - fpsStartedAt >= 1000) {
      canvas.dataset.fps = (fpsFrames * 1000 / (now - fpsStartedAt)).toFixed(1);
      fpsFrames = 0;
      fpsStartedAt = now;
    }

    canvas.dataset.pointerActive = String(state.pointer.active);
    canvas.dataset.evidence = currentEvidence().toFixed(3);
    canvas.dataset.mic = state.micLevel.toFixed(3);
    requestAnimationFrame(animate);
  }

  function currentEvidence() {
    if (state.chapter === 'threshold') return state.threshold.coherence;
    if (state.chapter === 'section') {
      if (state.stage === 0) return clamp(state.section.crossings / 2, 0, 1);
      if (state.stage === 1) return state.section.continuity;
      return clamp(state.section.revisitDistance / 0.2, 0, 1);
    }
    if (state.chapter === 'exchange') {
      if (state.stage === 0) return clamp(state.exchange.probeDistance / 0.17, 0, 1);
      if (state.stage === 1) return state.exchange.remoteSeen ? clamp(state.exchange.bridgeSpan / 0.32, 0, 1) : state.exchange.injectionEnergy;
      return 1;
    }
    if (state.chapter === 'reality') {
      if (state.stage === 0) return clamp(state.reality.echoPaths.length / 2, 0, 1);
      if (state.stage === 1) return state.reality.selectedEcho >= 0 ? 0.78 : state.reality.stalled ? 0.48 : 0.2;
      return 1;
    }
    return 0;
  }

  function createRenderSnapshot() {
    return {
      chapter: state.chapter,
      stage: state.stage,
      transition: state.transition,
      reducedMotion: state.reducedMotion,
      micLevel: state.micLevel,
      pointer: {
        x: state.pointer.x,
        y: state.pointer.y,
        active: state.pointer.active,
        visible: state.pointer.visible,
        energy: state.pointer.energy,
      },
      threshold: {
        coherence: state.threshold.coherence,
        axisX: state.threshold.axisX,
        axisY: state.threshold.axisY,
        axisLength: state.threshold.axisLength,
      },
      section: {
        visitedZones: Array.from(state.section.visitedZones),
        path: state.section.path,
        memoryPath: state.section.memoryPath,
        resolved: state.section.resolved,
      },
      exchange: {
        injectionEnergy: state.exchange.injectionEnergy,
        injectionOrigin: state.exchange.injectionOrigin,
        remoteSeen: state.exchange.remoteSeen,
        coherence: state.exchange.coherence,
        resolved: state.exchange.resolved,
        exitPoint: state.exchange.exitPoint,
      },
      reality: {
        currentPath: state.reality.currentPath,
        echoPaths: state.reality.echoPaths,
        echoes: state.reality.echoPaths.length,
        selectedEcho: state.reality.selectedEcho,
        stalled: state.reality.stalled,
        resolved: state.reality.resolved,
        target: state.reality.target,
      },
    };
  }

  function publicState() {
    return {
      chapter: state.chapter,
      stage: state.stage,
      started: state.started,
      revisitMode: state.revisitMode,
      reducedMotion: state.reducedMotion,
      sound: audio.enabled,
      mic: audio.micEnabled,
      renderer: 'canvas-2d',
      fps: Number(canvas.dataset.fps || 0),
      lastEvent: canvas.dataset.lastEvent || null,
      evidence: currentEvidence(),
      pointer: {
        x: state.pointer.x,
        y: state.pointer.y,
        active: state.pointer.active,
        type: state.pointer.type,
        travel: state.pointer.totalTravel,
      },
      section: {
        zones: Array.from(state.section.visitedZones),
        crossings: state.section.crossings,
        continuity: state.section.continuity,
        revisit: state.section.revisitDistance,
        resolved: state.section.resolved,
      },
      exchange: {
        probedZones: Array.from(state.exchange.probedZones),
        injectionEnergy: state.exchange.injectionEnergy,
        remoteSeen: state.exchange.remoteSeen,
        bridgeSpan: state.exchange.bridgeSpan,
        coherence: state.exchange.coherence,
        resolved: state.exchange.resolved,
      },
      reality: {
        echoes: state.reality.echoPaths.length,
        stalled: state.reality.stalled,
        selectedEcho: state.reality.selectedEcho,
        resolved: state.reality.resolved,
      },
      events: state.events.map((event) => ({ ...event })),
    };
  }

  function installQaControls() {
    if (!qaMode) return null;
    return {
      goTo(chapter, stage = 0) {
        state.started = true;
        entryPanel.classList.add('is-departing');
        if (chapter === 'archive') openArchive();
        else setChapter(chapter, { stage });
      },
      resolveCurrent() {
        if (state.chapter === 'section') {
          state.section.resolved = true;
          state.section.resolveContact = state.pointer.contactSerial;
          setStage(2, 'qa.section_resolved');
        } else if (state.chapter === 'exchange') {
          state.exchange.remoteSeen = true;
          state.exchange.bridgeSpan = 0.5;
          state.exchange.coherence = 1;
          state.exchange.resolved = true;
          state.exchange.resolveContact = state.pointer.contactSerial;
          setStage(2, 'qa.exchange_resolved');
        } else if (state.chapter === 'reality') {
          state.reality.echoPaths = [
            [{ x: 0.2, y: 0.7 }, { x: 0.46, y: 0.48 }, { x: 0.65, y: 0.61 }],
            [{ x: 0.15, y: 0.3 }, { x: 0.43, y: 0.54 }, { x: 0.72, y: 0.4 }],
          ];
          state.reality.selectedEcho = 0;
          state.reality.stalled = true;
          state.reality.resolved = true;
          state.reality.resolveContact = state.pointer.contactSerial;
          setStage(2, 'qa.reality_resolved');
        }
      },
      archive: openArchive,
    };
  }

  function applyQaView() {
    if (!qaMode) return;
    const chapter = params.get('view');
    const stage = clamp(Number(params.get('stage') || 0), 0, 2);
    if (!['threshold', 'section', 'exchange', 'reality', 'archive'].includes(chapter)) return;

    state.started = true;
    entryPanel.classList.add('is-departing');
    if (chapter === 'section') {
      state.section.visitedZones = new Set([0, 1, 2]);
      state.section.crossings = 3;
      state.section.totalDistance = 0.72;
      state.section.continuity = 0.92;
      state.section.memoryPath = [
        { x: 0.12, y: 0.58 }, { x: 0.28, y: 0.42 }, { x: 0.47, y: 0.56 },
        { x: 0.65, y: 0.36 }, { x: 0.84, y: 0.51 },
      ];
      state.section.resolved = stage >= 2;
    }
    if (chapter === 'exchange') {
      state.exchange.probedZones = new Set([0, 2]);
      state.exchange.probeDistance = 0.3;
      state.exchange.injectionOrigin = { x: 0.72, y: 0.46 };
      state.exchange.injectionEnergy = stage >= 1 ? 0.76 : 0;
      state.exchange.remoteSeen = stage >= 1;
      state.exchange.bridgeSpan = stage >= 2 ? 0.58 : 0;
      state.exchange.coherence = stage >= 2 ? 1 : 0.16;
      state.exchange.resolved = stage >= 2;
      state.exchange.exitPoint = { x: 0.8, y: 0.58 };
    }
    if (chapter === 'reality') {
      state.reality.echoPaths = stage >= 1 ? [
        [{ x: 0.12, y: 0.68 }, { x: 0.31, y: 0.53 }, { x: 0.46, y: 0.31 }],
        [{ x: 0.16, y: 0.27 }, { x: 0.38, y: 0.36 }, { x: 0.58, y: 0.58 }],
        [{ x: 0.28, y: 0.76 }, { x: 0.49, y: 0.63 }, { x: 0.77, y: 0.43 }],
      ] : [];
      state.reality.currentPath = [{ x: 0.08, y: 0.82 }, { x: 0.38, y: 0.7 }, { x: 0.68, y: 0.61 }];
      state.reality.stalled = stage >= 1;
      state.reality.selectedEcho = stage >= 2 ? 1 : -1;
      state.reality.resolved = stage >= 2;
    }

    if (chapter === 'archive') openArchive();
    else setChapter(chapter, { stage });
    state.transition = 0;
  }

  entryAction.addEventListener('click', beginJourney);
  soundToggle.addEventListener('click', toggleSound);
  motionToggle.addEventListener('click', toggleReducedMotion);
  hintToggle.addEventListener('click', toggleHints);
  micToggle.addEventListener('click', toggleMic);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('pointerleave', (event) => {
    if (!state.pointer.active && event.pointerType !== 'touch') state.pointer.visible = false;
  });
  canvas.addEventListener('pointerenter', pointerMove);
  canvas.addEventListener('keydown', keyboardDown);
  canvas.addEventListener('keyup', keyboardUp);
  document.querySelectorAll('[data-revisit]').forEach((button) => {
    button.addEventListener('click', () => revisitWorld(button.dataset.revisit));
  });
  window.addEventListener('resize', () => renderer.resize());
  window.addEventListener('blur', () => {
    if (state.pointer.active) handleContactEnd();
  });
  window.addEventListener('pagehide', () => audio.destroy());

  reduceMotionQuery.addEventListener?.('change', (event) => {
    if (savedReducedMotion !== null) return;
    state.reducedMotion = event.matches;
    experience.dataset.reduced = String(state.reducedMotion);
    motionToggle.setAttribute('aria-pressed', String(state.reducedMotion));
    motionState.textContent = state.reducedMotion ? '减少' : '完整';
    renderer.setReducedMotion(state.reducedMotion);
  });

  experience.dataset.reduced = String(state.reducedMotion);
  motionToggle.setAttribute('aria-pressed', String(state.reducedMotion));
  motionState.textContent = state.reducedMotion ? '减少' : '完整';
  activateAnchor('section-1');
  renderer.resize();
  applyQaView();
  requestAnimationFrame(animate);

  window.__humanUnknownWorlds = {
    getState: publicState,
    qa: installQaControls(),
  };
})();
