// civ.js — 一个时间流速极快的文明。抽象点阵，不是城市。
// 用法：const civ = new Civ({cols, rows, seed, kind:'alien'|'human'});
//       civ.advance(years); civ.draw(ctx, cx, cy, cell, alpha)

(function () {
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
  }

  const ALIEN_PALETTE = [
    { h: 205, s: 70 }, { h: 38, s: 80 }, { h: 0, s: 0 }, { h: 275, s: 55 },
    { h: 165, s: 60 }, { h: 15, s: 85 }, { h: 225, s: 40 }, { h: 55, s: 65 },
  ];
  const HUMAN_PALETTE = [
    { h: 40, s: 80 }, { h: 42, s: 70 }, { h: 200, s: 20 }, { h: 0, s: 0 },
    { h: 210, s: 50 }, { h: 30, s: 60 },
  ];

  class Civ {
    constructor(opt) {
      this.cols = opt.cols || 110;
      this.rows = opt.rows || 64;
      this.kind = opt.kind || 'alien';
      this.rand = rng(opt.seed || 7);
      this.year = opt.year || 0;
      this.eraLen = opt.eraLen || 70;
      this.eraIndex = 0;
      this.eraStart = this.year;
      this.n = this.cols * this.rows;
      this.state = new Uint8Array(this.n);   // 0 empty 1 alive 2 ruin
      this.age = new Uint16Array(this.n);
      this.era = new Uint8Array(this.n);     // era born
      this.ruinT = new Uint16Array(this.n);
      this.alive = 0;
      this.acc = 0;
      this.events = [];   // visual pulses {x,y,t,life}
      this.myths = [];    // player signals that recur {x,y,nextYear,gen}
      this.lifeCursor = null; // highlighted single life {x,y,t,dx,dy}
      this.palette = this.kind === 'human' ? HUMAN_PALETTE : ALIEN_PALETTE;
      this.styleSeq = this.kind === 'human' ? [3, 3, 1, 1, 4, 0] : [0, 1, 2, 4, 1, 3, 2, 0];
      this.newEra(true);
      this.seed(this.kind === 'human' ? 10 : 6);
    }

    idx(x, y) { return y * this.cols + x; }

    seed(k) {
      for (let s = 0; s < k; s++) {
        const x = Math.floor(this.cols * (0.3 + this.rand() * 0.4));
        const y = Math.floor(this.rows * (0.3 + this.rand() * 0.4));
        this.setAlive(this.idx(x, y));
      }
    }

    setAlive(i) {
      if (this.state[i] === 1) return;
      this.state[i] = 1; this.age[i] = 0; this.era[i] = this.eraIndex; this.alive++;
    }
    setRuin(i) {
      if (this.state[i] === 1) this.alive--;
      this.state[i] = 2; this.ruinT[i] = 0;
    }
    setEmpty(i) {
      if (this.state[i] === 1) this.alive--;
      this.state[i] = 0;
    }

    newEra(first) {
      this.eraIndex = (this.eraIndex + (first ? 0 : 1)) % 255;
      this.eraStart = this.year;
      const p = this.palette[this.eraIndex % this.palette.length];
      this.hue = p.h; this.sat = p.s;
      this.style = this.styleSeq[this.eraIndex % this.styleSeq.length];
      this.growth = 0.16 + this.rand() * 0.18;
      this.eraLenCur = this.eraLen * (0.7 + this.rand() * 0.8);
      if (!first) {
        // 时代更替：一部分旧结构成为残影
        const cx = this.rand() * this.cols, cy = this.rand() * this.rows;
        const r = 8 + this.rand() * 18;
        this.collapse(cx, cy, r);
        this.events.push({ x: cx, y: cy, t: 0, life: 1.4, r: r * 1.6 });
        if (this.alive < 12) this.seed(2);
      }
    }

    collapse(cx, cy, r) {
      const r2 = r * r;
      for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < r2) {
          const i = this.idx(x, y);
          if (this.state[i] === 1 && this.rand() < 0.85) this.setRuin(i);
        }
      }
    }

    // 推进 years 年（可为小数，内部按整年 tick）
    advance(years) {
      this.acc += years;
      while (this.acc >= 1) { this.acc -= 1; this.tickYear(); }
      // 事件计时按"年"衰减，保证快进时视觉也快
      for (const e of this.events) e.t += years * 0.02;
      this.events = this.events.filter(e => e.t < e.life);
      if (this.lifeCursor) {
        this.lifeCursor.t += years * 0.14;
        this.lifeCursor.x += this.lifeCursor.dx * years * 0.02;
        this.lifeCursor.y += this.lifeCursor.dy * years * 0.02;
        if (this.lifeCursor.t > 1) this.lifeCursor = null;
      }
    }

    tickYear() {
      this.year++;
      const cols = this.cols, rows = this.rows, st = this.state;
      const cap = this.n * 0.42;
      const crowd = this.alive / cap;
      const death = 0.004 + (crowd > 1 ? (crowd - 1) * 0.15 : 0);
      const grow = this.growth * (crowd > 0.9 ? 0.3 : 1);
      // 全扫描：每个活格子每年有 grow 概率向邻居扩张
      for (let i = 0; i < this.n; i++) {
        if (st[i] !== 1) continue;
        if (this.rand() < death) { this.setRuin(i); continue; }
        if (this.rand() < grow) {
          const x = i % cols, y = (i / cols) | 0;
          const d = (this.rand() * 4) | 0;
          const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0);
          const ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0);
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) {
            const j = this.idx(nx, ny);
            if (st[j] !== 1) this.setAlive(j);
          }
        }
      }
      // 年龄与残影衰减（全扫描但很便宜）
      for (let i = 0; i < this.n; i++) {
        if (st[i] === 1) { if (this.age[i] < 65000) this.age[i]++; }
        else if (st[i] === 2) { if (++this.ruinT[i] > 90) this.setEmpty(i); }
      }
      // 时代更替
      if (this.year - this.eraStart > this.eraLenCur) this.newEra(false);
      // 玩家留下的信号：几代之后以变形的方式回来
      for (const m of this.myths) {
        if (this.year >= m.nextYear) {
          m.gen++;
          m.nextYear = this.year + 40 + this.rand() * 60;
          const r = 3 + m.gen * 1.5;
          this.events.push({ x: m.x + (this.rand() - .5) * 10, y: m.y + (this.rand() - .5) * 6, t: 0, life: 1.2, r, myth: true });
          // 在附近种下一圈结构
          for (let a = 0; a < 8 + m.gen * 2; a++) {
            const ang = a / (8 + m.gen * 2) * Math.PI * 2;
            const x = Math.round(m.x + Math.cos(ang) * r), y = Math.round(m.y + Math.sin(ang) * r * 0.6);
            if (x >= 0 && y >= 0 && x < cols && y < rows) this.setAlive(this.idx(x, y));
          }
        }
      }
    }

    // 玩家投下一个信号（世界坐标 0..1）
    dropSignal(u, v) {
      const x = u * this.cols, y = v * this.rows;
      this.myths.push({ x, y, gen: 0, nextYear: this.year + 25 });
      this.events.push({ x, y, t: 0, life: 1.0, r: 6, myth: true });
    }

    // 高亮一个生命：出现、移动、熄灭
    spotlightLife() {
      // 找一个活着的格子
      for (let k = 0; k < 200; k++) {
        const i = (this.rand() * this.n) | 0;
        if (this.state[i] === 1) {
          const x = i % this.cols, y = (i / this.cols) | 0;
          const a = this.rand() * Math.PI * 2;
          this.lifeCursor = { x, y, t: 0, dx: Math.cos(a) * 1.2, dy: Math.sin(a) * 0.8 };
          return { x, y };
        }
      }
      return null;
    }

    // 绘制。cx,cy 屏幕中心；cell 每格像素；alpha 整体透明度
    draw(ctx, cx, cy, cell, alpha) {
      if (alpha <= 0.002) return;
      const cols = this.cols, rows = this.rows, st = this.state;
      const ox = cx - cols * cell / 2, oy = cy - rows * cell / 2;
      const hue = this.hue, sat = this.sat;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 残影：极淡的灰
      ctx.fillStyle = `rgba(160,170,190,${0.16 * alpha})`;
      for (let i = 0; i < this.n; i++) {
        if (st[i] !== 2) continue;
        const f = 1 - this.ruinT[i] / 90;
        if (f <= 0) continue;
        const x = ox + (i % cols) * cell, y = oy + ((i / cols) | 0) * cell;
        ctx.globalAlpha = f * f * alpha * 0.55;
        ctx.fillRect(x + cell * 0.3, y + cell * 0.3, cell * 0.4, cell * 0.4);
      }
      ctx.globalAlpha = 1;

      // 活着的结构：按出生时代着色，年龄越大越暗（旧城区）
      const pal = this.palette;
      const style = this.style;
      const half = cell / 2, q = cell * 0.28;
      ctx.lineWidth = Math.max(0.6, cell * 0.12);
      for (let i = 0; i < this.n; i++) {
        if (st[i] !== 1) continue;
        const x = ox + (i % cols) * cell + half, y = oy + ((i / cols) | 0) * cell + half;
        const p = pal[this.era[i] % pal.length];
        const age = this.age[i];
        const fresh = Math.max(0, 1 - age / 40);           // 新建的更亮
        const l = 45 + fresh * 40;
        const a = (0.35 + fresh * 0.55) * alpha;
        ctx.fillStyle = ctx.strokeStyle = `hsla(${p.h},${p.s}%,${l}%,${a})`;
        const s = this.styleSeq[this.era[i] % this.styleSeq.length];
        switch (s) {
          case 0: ctx.fillRect(x - q * 0.7, y - q * 0.7, q * 1.4, q * 1.4); break;
          case 1: // 网络：点 + 连右/下邻居
            ctx.fillRect(x - q * 0.5, y - q * 0.5, q, q);
            if ((i % cols) + 1 < cols && st[i + 1] === 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cell, y); ctx.stroke(); }
            if (i + cols < this.n && st[i + cols] === 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cell); ctx.stroke(); }
            break;
          case 2: ctx.beginPath(); ctx.arc(x, y, q, 0, Math.PI * 2); ctx.stroke(); break;
          case 3: // 格：短竖/横条
            if (((i % cols) + ((i / cols) | 0)) % 2) ctx.fillRect(x - q * 0.25, y - q, q * 0.5, q * 2);
            else ctx.fillRect(x - q, y - q * 0.25, q * 2, q * 0.5);
            break;
          case 4: ctx.beginPath(); ctx.moveTo(x, y - q); ctx.lineTo(x + q, y); ctx.lineTo(x, y + q); ctx.lineTo(x - q, y); ctx.closePath(); ctx.fill(); break;
        }
      }

      // 事件脉冲（时代更替 / 玩家信号回响）
      for (const e of this.events) {
        const f = e.t / e.life;
        const r = (e.r * cell) * (0.2 + f * 0.8);
        ctx.strokeStyle = e.myth ? `hsla(${hue},${sat}%,85%,${(1 - f) * 0.8 * alpha})` : `rgba(255,255,255,${(1 - f) * 0.35 * alpha})`;
        ctx.lineWidth = e.myth ? 1.5 : 1;
        ctx.beginPath(); ctx.ellipse(ox + e.x * cell, oy + e.y * cell, r, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
      }

      // 被高亮的一个生命
      if (this.lifeCursor) {
        const c = this.lifeCursor, f = c.t;
        const a = Math.sin(f * Math.PI) * alpha;
        const x = ox + c.x * cell + half, y = oy + c.y * cell + half;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(x, y, cell * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.5})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, cell * 1.6 + f * cell * 2, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  }

  window.Civ = Civ;
})();
