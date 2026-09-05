(() => {
  'use strict';

  const COPY_SEQUENCE = Object.freeze([
    '在这里',
    '对，在这里',
    '它注意到你了',
    '放入你的眼睛',
  ]);

  const PHASE_COPY = Object.freeze({
    contact: COPY_SEQUENCE[0],
    near: COPY_SEQUENCE[1],
    noticed: COPY_SEQUENCE[2],
    aligned: COPY_SEQUENCE[3],
  });

  const STANDARD_TIMING = Object.freeze({
    blackoutMs: 520,
    revealMs: 3600,
    titleInMs: 1500,
    titleMinReadMs: 4000,
    titleDissolveMs: 2400,
    guideSwapMs: 500,
    contactReadMs: 2200,
    nearReadMs: 2300,
    noticedReadMs: 2500,
    noticeDwellMs: 420,
    coreDwellMs: 520,
    holdMs: 1400,
    holdReleaseMs: 950,
    entryMs: 4100,
    boundaryStartMs: 900,
    boundaryEndMs: 1120,
  });

  const REDUCED_TIMING = Object.freeze({
    ...STANDARD_TIMING,
    blackoutMs: 180,
    revealMs: 320,
    titleInMs: 120,
    titleDissolveMs: 80,
    noticeDwellMs: 160,
    coreDwellMs: 180,
    entryMs: 800,
    boundaryStartMs: 200,
    boundaryEndMs: 400,
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(edge0, edge1, value) {
    const amount = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return amount * amount * (3 - 2 * amount);
  }

  function resolveContactActive(input = {}) {
    if (input.keyboardActive) return true;
    if (input.inputType === 'touch' || input.inputType === 'pen') {
      return Boolean(input.touchActive);
    }
    return Boolean(input.hasMoved && input.pointerInside);
  }

  class EncounterMachine {
    constructor(options = {}) {
      this.reducedMotion = Boolean(options.reducedMotion);
      this.timing = this.reducedMotion ? REDUCED_TIMING : STANDARD_TIMING;
      this.startedAt = null;
      this.lastUpdatedAt = null;
      this.intentionalAt = null;
      this.titleFullyVisibleAt = null;
      this.dissolveStartedAt = null;
      this.phaseSince = null;
      this.guideReadableAt = null;
      this.entryStartedAt = null;
      this.phase = 'opening';
      this.intro = 'blackout';
      this.guide = '';
      this.reveal = 0;
      this.title = 0;
      this.titleDissolve = 0;
      this.outerDwell = 0;
      this.coreDwell = 0;
      this.hold = 0;
      this.entry = 0;
      this.collapse = 0;
      this.boundarySilence = 0;
      this.fall = 0;
      this.noticeSerial = 0;
      this.handoff = false;
    }

    start(now = performance.now()) {
      if (this.startedAt !== null) return;
      this.startedAt = now;
      this.lastUpdatedAt = now;
      this.phaseSince = now;
    }

    markIntent(now = performance.now()) {
      if (this.intentionalAt !== null || this.phase === 'handoff') return;
      this.intentionalAt = now;
    }

    transition(nextPhase, now) {
      if (this.phase === nextPhase) return false;
      const hadGuide = Boolean(this.guide);
      this.phase = nextPhase;
      this.phaseSince = now;
      this.guide = PHASE_COPY[nextPhase] || this.guide;
      this.guideReadableAt = now + (hadGuide ? this.timing.guideSwapMs : 0);

      if (nextPhase === 'noticed') this.noticeSerial += 1;
      if (nextPhase === 'entering') {
        this.entryStartedAt = now;
        this.hold = 1;
      }
      if (nextPhase === 'handoff') this.handoff = true;
      return true;
    }

    updateIntro(now) {
      if (this.startedAt === null) return;
      const elapsed = now - this.startedAt;
      const revealStartedAt = this.timing.blackoutMs;
      const revealEndedAt = revealStartedAt + this.timing.revealMs;
      const titleEndedAt = revealEndedAt + this.timing.titleInMs;
      this.titleFullyVisibleAt = this.startedAt + titleEndedAt;

      this.reveal = smoothstep(
        revealStartedAt,
        revealEndedAt,
        elapsed
      );
      this.title = smoothstep(revealEndedAt, titleEndedAt, elapsed);

      if (this.phase !== 'opening') {
        if (this.dissolveStartedAt !== null) {
          this.titleDissolve = smoothstep(
            this.dissolveStartedAt,
            this.dissolveStartedAt + this.timing.titleDissolveMs,
            now
          );
          this.intro = this.titleDissolve < 1 ? 'dissolving' : 'contact';
        }
        return;
      }

      if (elapsed < revealStartedAt) this.intro = 'blackout';
      else if (elapsed < revealEndedAt) this.intro = 'revealing';
      else if (elapsed < titleEndedAt) this.intro = 'title-in';
      else this.intro = 'title-hold';

      const hasReadTitle = now - this.titleFullyVisibleAt >= this.timing.titleMinReadMs;
      if (this.intentionalAt !== null && hasReadTitle) {
        this.dissolveStartedAt = now;
        this.intro = 'dissolving';
        this.transition('contact', now);
      }
    }

    updateContact(now, deltaMs, input) {
      const outer = Boolean(input.outer);
      const core = Boolean(input.core);
      const active = Boolean(input.active);
      const readableFor = this.guideReadableAt === null
        ? 0
        : now - this.guideReadableAt;

      if (this.phase === 'contact') {
        if (outer && readableFor >= this.timing.contactReadMs) {
          this.transition('near', now);
        }
        return;
      }

      if (this.phase === 'near') {
        const canDwell = outer && active;
        this.outerDwell = clamp(
          this.outerDwell + (canDwell ? deltaMs : -deltaMs * 0.55),
          0,
          this.timing.noticeDwellMs
        );
        if (
          canDwell
          &&
          readableFor >= this.timing.nearReadMs
          && this.outerDwell >= this.timing.noticeDwellMs
        ) {
          this.transition('noticed', now);
        }
        return;
      }

      if (this.phase === 'noticed') {
        const canDwell = core && active;
        this.coreDwell = clamp(
          this.coreDwell + (canDwell ? deltaMs : -deltaMs * 0.62),
          0,
          this.timing.coreDwellMs
        );
        if (
          canDwell
          &&
          readableFor >= this.timing.noticedReadMs
          && this.coreDwell >= this.timing.coreDwellMs
        ) {
          this.transition('aligned', now);
        }
        return;
      }

      if (this.phase === 'aligned') {
        const holdDelta = core && active
          ? deltaMs / this.timing.holdMs
          : -deltaMs / this.timing.holdReleaseMs;
        this.hold = clamp(this.hold + holdDelta, 0, 1);
        if (
          this.hold >= 1
          && readableFor >= this.timing.holdMs
        ) this.transition('entering', now);
      }
    }

    updateEntry(now) {
      if (this.phase !== 'entering' || this.entryStartedAt === null) return;
      const elapsed = now - this.entryStartedAt;
      this.entry = clamp(elapsed / this.timing.entryMs, 0, 1);
      this.collapse = smoothstep(0, this.timing.boundaryStartMs, elapsed);
      this.boundarySilence = smoothstep(
        this.timing.boundaryStartMs - 90,
        this.timing.boundaryStartMs,
        elapsed
      ) * (1 - smoothstep(
        this.timing.boundaryEndMs,
        this.timing.boundaryEndMs + 100,
        elapsed
      ));
      this.fall = smoothstep(
        this.timing.boundaryEndMs,
        this.timing.entryMs - 180,
        elapsed
      );

      if (this.entry >= 1) {
        this.entry = 1;
        this.collapse = 1;
        this.boundarySilence = 0;
        this.fall = 1;
        this.transition('handoff', now);
      }
    }

    update(now = performance.now(), input = {}) {
      if (this.startedAt === null) return this.getState(now);
      const deltaMs = clamp(now - this.lastUpdatedAt, 0, 80);
      this.lastUpdatedAt = now;
      if (input.intentional) this.markIntent(now);

      this.updateIntro(now);
      this.updateContact(now, deltaMs, input);
      this.updateEntry(now);
      return this.getState(now);
    }

    getState(now = performance.now()) {
      const titleReadableFor = this.titleFullyVisibleAt === null
        ? 0
        : Math.max(0, now - this.titleFullyVisibleAt);
      const guideReadableFor = this.guideReadableAt === null
        ? 0
        : Math.max(0, now - this.guideReadableAt);

      return {
        phase: this.phase,
        intro: this.intro,
        guide: this.guide,
        reveal: this.reveal,
        title: this.title,
        titleDissolve: this.titleDissolve,
        titleFullyVisibleAt: this.titleFullyVisibleAt,
        titleReadableFor,
        titleMinReadMs: this.timing.titleMinReadMs,
        intentionalAt: this.intentionalAt,
        guideReadableAt: this.guideReadableAt,
        guideReadableFor,
        outerDwell: this.outerDwell,
        coreDwell: this.coreDwell,
        hold: this.hold,
        holdMs: this.timing.holdMs,
        entry: this.entry,
        entryDurationMs: this.timing.entryMs,
        collapse: this.collapse,
        boundarySilence: this.boundarySilence,
        fall: this.fall,
        noticeSerial: this.noticeSerial,
        handoff: this.handoff,
        reducedMotion: this.reducedMotion,
      };
    }
  }

  window.HumanUnknownEncounter = Object.freeze({
    COPY_SEQUENCE,
    PHASE_COPY,
    STANDARD_TIMING,
    REDUCED_TIMING,
    resolveContactActive,
    EncounterMachine,
  });
})();
