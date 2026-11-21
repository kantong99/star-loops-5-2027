import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

// Ribuan bintang: bentuk utama -> pola QR acak -> serpihan -> bentuk utama. Loop mulus 720 frame (24 detik).
const W = 1920;
const H = 1080;
const N = 3600;
const PERIOD = 720;
const HOLD = 50;

const seeded = (seed) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};
const inEllipse = (x, y, cx, cy, rx, ry, rot = 0) => {
  const a = (rot * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const u = dx * Math.cos(a) + dy * Math.sin(a);
  const v = -dx * Math.sin(a) + dy * Math.cos(a);
  return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1;
};
const inPoly = (x, y, pts) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// Bentuk utama: masing-masing punya fungsi inside dan kotak pembatas
const starPts = (() => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 150 : 370;
    pts.push([960 + Math.cos(a) * r, 540 + Math.sin(a) * r]);
  }
  return pts;
})();
const BIRD_BODY = [[880, 470], [1000, 430], [1080, 500], [1110, 600], [1060, 700], [960, 760], [850, 740], [790, 650], [800, 540]];
const BIRD_WING = [[990, 520], [860, 420], [700, 300], [600, 280], [660, 360], [620, 430], [740, 470], [820, 560]];
const BIRD_TAIL = [[800, 650], [650, 720], [600, 800], [700, 800], [740, 760], [790, 800], [820, 720]];
const BIRD_BEAK = [[1080, 385], [1170, 408], [1080, 425]];

// Kurva hati parametrik, dipakai sebagai poligon (skala 17px per unit, berpusat di 960,520)
const HEART_PTS = Array.from({ length: 240 }, (_, i) => {
  const t = (i / 240) * Math.PI * 2;
  const hx = 16 * Math.pow(Math.sin(t), 3);
  const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [960 + hx * 17, 520 - hy * 17];
});

const SHAPES = {
  burung: {
    box: [580, 1220, 260, 820],
    inside: (x, y) => inEllipse(x, y, 1010, 400, 95, 95) || inPoly(x, y, BIRD_BEAK) || inPoly(x, y, BIRD_BODY) || inPoly(x, y, BIRD_WING) || inPoly(x, y, BIRD_TAIL),
  },
  hati: {
    box: [600, 1320, 180, 860],
    inside: (x, y) => inPoly(x, y, HEART_PTS),
  },
  bintang: {
    box: [580, 1340, 170, 910],
    inside: (x, y) => inPoly(x, y, starPts),
  },
  ikan: {
    box: [560, 1420, 300, 780],
    inside: (x, y) => inEllipse(x, y, 880, 540, 300, 175) || inPoly(x, y, [[1150, 540], [1400, 360], [1400, 720]]),
  },
  kupu: {
    box: [420, 1500, 150, 920],
    inside: (x, y) =>
      inEllipse(x, y, 680, 380, 230, 165, -35) ||
      inEllipse(x, y, 1240, 380, 230, 165, 35) ||
      inEllipse(x, y, 770, 660, 160, 120, 25) ||
      inEllipse(x, y, 1150, 660, 160, 120, -25) ||
      inEllipse(x, y, 960, 540, 22, 215),
  },
};

// Pola QR dekoratif (tidak bisa dipindai), sama untuk semua video
const GRID = 29;
const MOD = 22;
const X0 = W / 2 - (GRID * MOD) / 2;
const Y0 = H / 2 - (GRID * MOD) / 2;
const qrBlack = (() => {
  const r = seeded(20271);
  const g = [];
  for (let y = 0; y < GRID; y++) {
    g.push([]);
    for (let x = 0; x < GRID; x++) g[y].push(r() > 0.5);
  }
  const finder = (ox, oy) => {
    for (let dy = -1; dy < 8; dy++) for (let dx = -1; dx < 8; dx++) {
      const x = ox + dx, y = oy + dy;
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue;
      const edge = dx === 0 || dx === 6 || dy === 0 || dy === 6;
      const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      const inside = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      g[y][x] = inside ? (edge || core) : false;
    }
  };
  finder(0, 0); finder(GRID - 7, 0); finder(0, GRID - 7);
  return g;
})();

const buildTargets = (shape) => {
  const r = seeded(777);
  const [x0, x1, y0, y1] = shape.box;
  const main = [];
  while (main.length < N) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    if (shape.inside(x, y)) main.push([x, y]);
  }
  const qr = [];
  const cells = [];
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (qrBlack[y][x]) cells.push([x, y]);
  while (qr.length < N) {
    const [cx, cy] = cells[Math.floor(r() * cells.length)];
    qr.push([X0 + (cx + r()) * MOD, Y0 + (cy + r()) * MOD]);
  }
  const scatter = [];
  for (let i = 0; i < N; i++) scatter.push([r() * W, r() * H]);
  const colors = ['#2563eb', '#db2777', '#f59e0b', '#0d9488', '#7c3aed'];
  const stars = [];
  for (let i = 0; i < N; i++) {
    stars.push({ m: main[i], q: qr[i], s: scatter[i], size: 3 + r() * 4, c: colors[i % colors.length], ph: r() * Math.PI * 2 });
  }
  return stars;
};

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const posAt = (star, f) => {
  const keys = [star.m, star.q, star.s, star.m];
  const times = [0, 240, 480, 720];
  const t = ((f % PERIOD) + PERIOD) % PERIOD;
  let i = 0;
  while (i < 3 && t >= times[i + 1]) i++;
  const a = times[i];
  const b = times[i + 1];
  const p = smooth(clamp01((t - a - HOLD) / (b - a - 2 * HOLD)));
  const from = keys[i];
  const to = keys[i + 1];
  return [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
};

// Pembuat komposisi: satu fungsi per bentuk
export const makeStarLoop = (shapeKey) => () => {
  const frame = useCurrentFrame();
  const stars = useMemo(() => buildTargets(SHAPES[shapeKey]), []);
  return (
    <AbsoluteFill>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="bgStar" cx="50%" cy="50%" r="75%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#dbeafe" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#bgStar)" />
        {stars.map((s, i) => {
          const [x, y] = posAt(s, frame);
          const tw = 0.75 + 0.25 * Math.sin(frame / 10 + s.ph);
          return <circle key={i} cx={x} cy={y} r={s.size} fill={s.c} opacity={tw} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};
