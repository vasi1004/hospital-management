import { useEffect, useLayoutEffect, useRef } from "react";

const REF_W = 1440;
const REF_H = 512;

const ART = 4.8;
const GROUND_RATIO = 393 / REF_H;
const NEAR_DASH_RATIO = 422.5 / REF_H;
const FAR_DASH_RATIO = 448 / REF_H;
const HORIZON_THICK = 4.5;
const DASH_THICK = 5;
const DASH_PERIOD = 128;
const NEAR_DASH_ON = 45;
const FAR_DASH_ON = 23;
const A_HORIZON = 0.331;
const A_NEAR = 0.199;
const A_FAR = 0.15;
const A_SPRITE = 0.331;
const A_CLOUD = 0.26;

const BLOCK_UNITS = 11;

const IDLE_RESUME = 4;
const A_HUD_LABEL = 0.33;
const A_HUD_VALUE = 0.42;

const INK_FALLBACK = [255, 255, 255, 1];
const BG_FALLBACK = [0, 0, 0, 1];

const COLOR_CACHE = new Map();

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

function hslToRgb(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function parseColorRaw(raw, fallback) {
  let s = raw.trim();

  const varMatch = s.match(/^var\(\s*--[^,]+,\s*([\s\S]+)\)\s*$/i);
  if (varMatch) s = varMatch[1].trim();

  if (s.charAt(0) === "#") {
    let h = s.slice(1).trim();
    if (h.length === 3 || h.length === 4) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (h.length !== 6 && h.length !== 8) return fallback;
    const ch = (i) => parseInt(h.slice(i, i + 2), 16);
    const r = ch(0);
    const g = ch(2);
    const b = ch(4);

    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
      return fallback;
    }
    const a = h.length === 8 ? ch(6) / 255 : 1;
    return [r, g, b, clamp01(Number.isFinite(a) ? a : 1)];
  }

  const fn = s.match(/^(rgba?|hsla?)\(([^)]*)\)$/i);
  if (fn) {
    const name = fn[1].toLowerCase();
    const parts = fn[2].split(/[,/\s]+/).filter(Boolean);
    if (parts.length < 3) return fallback;
    const num = (t) => parseFloat(t);
    const alphaTok = parts[3];
    const alpha =
      alphaTok === undefined
        ? 1
        : alphaTok.endsWith("%")
          ? num(alphaTok) / 100
          : num(alphaTok);
    if (!Number.isFinite(alpha)) return fallback;

    if (name.charAt(0) === "r") {
      const chan = (t) =>
        t.endsWith("%") ? Math.round((num(t) * 255) / 100) : Math.round(num(t));
      const r = chan(parts[0]);
      const g = chan(parts[1]);
      const b = chan(parts[2]);
      if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
        return fallback;
      }
      return [r, g, b, clamp01(alpha)];
    }

    const hue = num(parts[0]);
    const sat = num(parts[1]) / 100;
    const lig = num(parts[2]) / 100;
    if (!Number.isFinite(hue) || !Number.isFinite(sat) || !Number.isFinite(lig)) {
      return fallback;
    }
    const [r, g, b] = hslToRgb(hue, clamp01(sat), clamp01(lig));
    return [r, g, b, clamp01(alpha)];
  }

  return fallback;
}

function parseColor(input, fallback) {
  if (!input) return fallback;
  const hit = COLOR_CACHE.get(input);
  if (hit) return hit;
  const out = parseColorRaw(input, fallback);
  COLOR_CACHE.set(input, out);
  return out;
}

const RUNNER_BODY = [
  "....########....",
  "..############..",
  ".##############.",
  "################",
  "################",
  "###..######..###",
  "###..######..###",
  "################",
  "################",
  "################",
  "###..........###",
  ".##############.",
  "..############..",
  "....########....",
];
const RUNNER_LEGS_A = ["...##......##...", "..###......###.."];
const RUNNER_LEGS_B = ["..###......###..", "...##......##..."];
const RUNNER_LEGS_AIR = ["..###......###..", ".###........###."];

const CLOUD = [
  "....#####.......",
  "..########..##..",
  "################",
  ".##############.",
];

const BLOCK = [
  "..############..",
  ".##############.",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  "################",
  ".##############.",
  "..############..",
];
const GLYPHS = [
  ["..####..", "..####..", "..####..", "..####..", "...##...", ".######.", "........", "........"],
  ["........", ".#....#.", ".#....#.", ".######.", ".#....#.", ".#....#.", "........", "........"],
  ["........", ".######.", "....#...", "...#....", "..#.....", ".######.", "........", "........"],
  ["........", "..####..", ".#....#.", ".#....#.", ".#....#.", "..####..", "........", "........"],
];

const FONT = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", "..#", "..#"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  S: ["###", "#..", "###", "..#", "###"],
  C: ["###", "#..", "#..", "#..", "###"],
  O: ["###", "#.#", "#.#", "#.#", "###"],
  R: ["###", "#.#", "###", "#.#", "#.#"],
  E: ["###", "#..", "###", "#..", "###"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  " ": ["...", "...", "...", "...", "..."],
};

function rng(w) {
  w.seed = (w.seed * 1664525 + 1013904223) >>> 0;
  return w.seed / 4294967296;
}

/**
 * Canvas endless-runner used on login while the backend is unreachable.
 */
export function PixelRunGame({
  background = "#00484C",
  ink = "#ffffff",
  startSpeed = 420,
  maxSpeed = 980,
  gravity = 4780,
  jump = 1480,
  showHud = true,
  attract = true,
  farDashSpeed = 100,
  style,
  className = "",
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  const idleRef = useRef(1e9);
  const hoverRef = useRef(false);
  const propsRef = useRef({
    background,
    ink,
    startSpeed,
    maxSpeed,
    gravity,
    jump,
    showHud,
    attract,
    farDashSpeed,
  });
  propsRef.current = {
    background,
    ink,
    startSpeed,
    maxSpeed,
    gravity,
    jump,
    showHud,
    attract,
    farDashSpeed,
  };

  function fresh(best, played) {
    return {
      t: 0,
      dist: 0,
      speed: propsRef.current.startSpeed ?? startSpeed,
      playerY: 0,
      playerV: 0,
      grounded: true,
      obstacles: [],
      clouds: [],
      particles: [],
      stars: Array.from({ length: 18 }, (_, i) => ({
        x: (i * 0.057 + 0.04) % 1,
        y: 0.06 + ((i * 0.137) % 0.42),
        tw: (i * 0.37) % 1,
        s: 0.55 + (i % 3) * 0.25,
      })),
      dead: false,
      deadAt: 0,
      score: 0,
      best,
      nextGap: 180,
      seed: 20260818,
      played,
      wasGrounded: true,
    };
  }

  if (worldRef.current === null) worldRef.current = fresh(0, false);

  const inkAt = (a) => {
    const [r, g, b, ia] = parseColor(propsRef.current.ink ?? ink, INK_FALLBACK);
    return `rgba(${r},${g},${b},${a * ia})`;
  };

  const bgFill = () => {
    const [r, g, b, a] = parseColor(
      propsRef.current.background ?? background,
      BG_FALLBACK,
    );
    return `rgba(${r},${g},${b},${a})`;
  };

  function paint(ctx, w, h) {
    const world = worldRef.current;
    const p = propsRef.current;
    const S = Math.max(0.3, Math.min(w / REF_W, h / REF_H, 3));
    const px = ART * S;
    const groundY = h * GROUND_RATIO;
    const playerX = w * 0.08;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bgFill();
    ctx.fillRect(0, 0, w, h);

    // Soft sky wash + twinkling stars
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, inkAt(0.06));
    sky.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, Math.round(groundY));

    for (const st of world.stars) {
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(world.t * 2.2 + st.tw * 6.28));
      const size = Math.max(1, Math.round(st.s * S * 1.6));
      ctx.fillStyle = inkAt(0.12 * twinkle);
      ctx.fillRect(Math.round(st.x * w), Math.round(st.y * h), size, size);
    }

    const stamp = (rows, ox, oy, unit) => {
      for (let r = 0; r < rows.length; r++) {
        const y0 = Math.round(oy + r * unit);
        const y1 = Math.round(oy + (r + 1) * unit);
        let c = 0;
        while (c < rows[r].length) {
          if (rows[r][c] !== "#") {
            c++;
            continue;
          }
          let e = c;
          while (e < rows[r].length && rows[r][e] === "#") e++;
          const x0 = Math.round(ox + c * unit);
          const x1 = Math.round(ox + e * unit);
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
          c = e;
        }
      }
    };

    const blit = (rows, ox, oy, unit, alpha, knock) => {
      ctx.fillStyle = inkAt(alpha);
      stamp(rows, ox, oy, unit);
      if (knock) {
        const prev = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "#000";
        const kx = ox + ((rows[0].length - knock[0].length) / 2) * unit;
        const ky = oy + ((rows.length - knock.length) / 2) * unit;
        stamp(knock, kx, ky, unit);
        ctx.globalCompositeOperation = prev;
      }
    };

    for (const cl of world.clouds) {
      blit(CLOUD, cl.x, cl.y * h, px * cl.scale, A_CLOUD * (0.7 + 0.3 * cl.depth));
    }

    ctx.fillStyle = inkAt(A_HORIZON);
    ctx.fillRect(0, Math.round(groundY), w, Math.max(1, Math.round(HORIZON_THICK * S)));

    const dashRow = (ratio, on, alpha, phase) => {
      const period = DASH_PERIOD * S;
      const len = on * S;
      const y = Math.round(h * ratio);
      const th = Math.max(1, Math.round(DASH_THICK * S));
      ctx.fillStyle = inkAt(alpha);
      const start = -((phase % period) + period) % period;
      for (let x = start; x < w; x += period) {
        ctx.fillRect(Math.round(x), y, Math.round(len), th);
      }
    };
    dashRow(NEAR_DASH_RATIO, NEAR_DASH_ON, A_NEAR, world.dist);

    const farMul = (p.farDashSpeed ?? farDashSpeed) / 100;
    dashRow(FAR_DASH_RATIO, FAR_DASH_ON, A_FAR, world.dist * farMul);

    for (const ob of world.obstacles) {
      const bu = BLOCK_UNITS * px;
      for (let i = 0; i < ob.stack; i++) {
        blit(
          BLOCK,
          ob.x,
          groundY - (i + 1) * bu,
          bu / 16,
          A_SPRITE,
          GLYPHS[(ob.glyph + i) % GLYPHS.length],
        );
      }
    }

    const bodyH = RUNNER_BODY.length * px;
    const feet = groundY - world.playerY;
    blit(RUNNER_BODY, playerX, feet - bodyH - 2 * px, px, A_SPRITE);
    const legs = !world.grounded
      ? RUNNER_LEGS_AIR
      : Math.floor(world.dist / (28 * S)) % 2
        ? RUNNER_LEGS_A
        : RUNNER_LEGS_B;
    blit(legs, playerX, feet - 2 * px, px, A_SPRITE);

    // Motion dust / jump sparks
    for (const pr of world.particles) {
      const life = clamp01(pr.life);
      ctx.fillStyle = inkAt(pr.a * life);
      const sz = Math.max(1, Math.round(pr.s * S * life));
      ctx.fillRect(Math.round(pr.x), Math.round(pr.y), sz, sz);
    }

    // Bottom vignette for depth
    const vig = ctx.createLinearGradient(0, groundY - 40 * S, 0, h);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, Math.round(groundY - 40 * S), w, Math.ceil(h - groundY + 40 * S));

    if (!(p.showHud ?? showHud)) return;

    const fpx = 2.85 * S;
    const text = (s, rightX, y, alpha) => {
      const cw = 4 * fpx;
      const total = s.length * cw - fpx;
      let x = rightX - total;
      ctx.fillStyle = inkAt(alpha);
      for (const ch of s) {
        const glyph = FONT[ch] ?? FONT[" "];
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 3; c++) {
            if (glyph[r][c] === "#") {
              ctx.fillRect(
                Math.round(x + c * fpx),
                Math.round(y + r * fpx),
                Math.round(x + (c + 1) * fpx) - Math.round(x + c * fpx),
                Math.round(y + (r + 1) * fpx) - Math.round(y + r * fpx),
              );
            }
          }
        }
        x += cw;
      }
    };
    const pad = (n) => String(Math.floor(n)).padStart(5, "0").slice(-5);
    const rightBest = w - 77 * S;
    const rightScore = rightBest - 190 * S;
    const labelY = h * 0.07;
    const valueY = h * 0.133;
    text("SCORE", rightScore, labelY, A_HUD_LABEL);
    text(pad(world.score), rightScore, valueY, A_HUD_VALUE);
    text("BEST", rightBest, labelY, A_HUD_LABEL);
    text(pad(world.best), rightBest, valueY, A_HUD_VALUE);
  }

  function jumpWindow(stack, sp, S) {
    const p = propsRef.current;
    const px = ART * S;
    const v = (p.jump ?? jump) * S;
    const g = (p.gravity ?? gravity) * S;
    const top = stack * BLOCK_UNITS * px;
    const disc = v * v - 2 * g * top;

    const tX = (10 * px + BLOCK_UNITS * px * 0.76) / sp;
    if (disc <= 0) return { ok: false, lead: 0 };
    const root = Math.sqrt(disc);
    const t1 = (v - root) / g;
    const t2 = (v + root) / g;

    return { ok: t2 - t1 > tX * 1.25, lead: t1 + (t2 - t1 - tX) / 2 };
  }

  function step(dt, w, h) {
    const world = worldRef.current;
    const p = propsRef.current;
    const S = Math.max(0.3, Math.min(w / REF_W, h / REF_H, 3));
    const px = ART * S;
    const groundY = h * GROUND_RATIO;
    const playerX = w * 0.08;

    world.t += dt;
    idleRef.current += dt;

    if (world.dead) {
      if (world.t - world.deadAt > 0.9) {
        const best = Math.max(world.best, world.score);
        const played = world.played;
        worldRef.current = fresh(best, played);
        seed(worldRef.current, w, h);
      }
      return;
    }

    const base = p.startSpeed ?? startSpeed;
    const cap = Math.max(base, p.maxSpeed ?? maxSpeed);
    const sp = Math.min(cap, base + world.dist / 260) * S;
    world.speed = sp;
    world.dist += sp * dt;
    world.score = world.dist / 24;

    if (!world.grounded) {
      world.playerV -= (p.gravity ?? gravity) * S * dt;
      world.playerY += world.playerV * dt;
      if (world.playerY <= 0) {
        world.playerY = 0;
        world.playerV = 0;
        world.grounded = true;
        // Landing puff
        for (let i = 0; i < 6; i++) {
          world.particles.push({
            x: playerX + 4 * px + (rng(world) - 0.5) * 10 * px,
            y: groundY - 2 * px,
            vx: (rng(world) - 0.5) * 90 * S,
            vy: -rng(world) * 70 * S,
            life: 1,
            a: 0.28,
            s: 1.2 + rng(world),
          });
        }
      }
    }

    if (world.wasGrounded && !world.grounded) {
      // Jump spark trail
      for (let i = 0; i < 5; i++) {
        world.particles.push({
          x: playerX + 5 * px + (rng(world) - 0.5) * 6 * px,
          y: groundY - 3 * px,
          vx: -sp * (0.15 + rng(world) * 0.2),
          vy: -rng(world) * 120 * S,
          life: 1,
          a: 0.4,
          s: 1.4 + rng(world),
        });
      }
    }
    world.wasGrounded = world.grounded;

    if (world.grounded && rng(world) < 0.35) {
      world.particles.push({
        x: playerX + 2 * px,
        y: groundY - px,
        vx: -sp * (0.25 + rng(world) * 0.35),
        vy: -(10 + rng(world) * 40) * S,
        life: 0.85,
        a: 0.22,
        s: 0.9 + rng(world) * 0.8,
      });
    }

    if (!world.particles) world.particles = [];
    for (const pr of world.particles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.vy += 220 * S * dt;
      pr.life -= dt * 1.8;
    }
    world.particles = world.particles.filter((pr) => pr.life > 0).slice(-48);

    for (const ob of world.obstacles) ob.x -= sp * dt;
    world.obstacles = world.obstacles.filter((o) => o.x > -20 * px);
    const last = world.obstacles.length
      ? Math.max(...world.obstacles.map((o) => o.x))
      : -Infinity;

    const flight = (2 * (p.jump ?? jump)) / (p.gravity ?? gravity);
    const clear = (sp / S) * flight + (BLOCK_UNITS + 20) * ART;
    if (last < w - (clear + world.nextGap) * S) {
      const r = rng(world);
      let stack = r < 0.55 ? 1 : r < 0.87 ? 2 : 3;

      while (stack > 0 && !jumpWindow(stack, sp, S).ok) stack--;
      if (stack > 0) {
        world.obstacles.push({
          x: w + 8 * px,
          stack,
          glyph: Math.floor(rng(world) * GLYPHS.length),
        });
      }

      world.nextGap = rng(world) * 380;
    }

    for (const cl of world.clouds) cl.x -= sp * dt * (0.12 + 0.22 * cl.depth);
    world.clouds = world.clouds.filter((c) => c.x > -30 * px);
    if (world.clouds.length < 5 && rng(world) < 0.012) {
      world.clouds.push({
        x: w + 10 * px,
        y: 0.1 + rng(world) * 0.42,
        scale: 0.75 + rng(world) * 0.9,
        depth: rng(world),
      });
    }

    const auto =
      (p.attract ?? attract) &&
      (!world.played || idleRef.current > IDLE_RESUME);
    if (auto && world.grounded) {
      const bu = BLOCK_UNITS * px;
      const plFront = playerX + 13 * px;
      let next = null;
      let gap = Infinity;
      for (const ob of world.obstacles) {
        const left = ob.x + bu * 0.12;
        if (left + bu * 0.76 <= plFront) continue;
        if (left - plFront < gap) {
          gap = left - plFront;
          next = ob;
        }
      }

      if (next) {
        const win = jumpWindow(next.stack, sp, S);
        if (win.ok && gap <= sp * win.lead) doJump();
      }
    }

    const pl = {
      x: playerX + 3 * px,
      y: groundY - world.playerY - 16 * px + 2 * px,
      w: 10 * px,
      h: 14 * px,
    };
    for (const ob of world.obstacles) {
      const bu = BLOCK_UNITS * px;
      const box = {
        x: ob.x + bu * 0.12,
        y: groundY - ob.stack * bu,
        w: bu * 0.76,
        h: ob.stack * bu,
      };
      if (
        pl.x < box.x + box.w &&
        pl.x + pl.w > box.x &&
        pl.y < box.y + box.h &&
        pl.y + pl.h > box.y
      ) {
        world.dead = true;
        world.deadAt = world.t;
        world.best = Math.max(world.best, world.score);
        break;
      }
    }
  }

  function seed(world, w, h) {
    const S = Math.max(0.3, Math.min(w / REF_W, h / REF_H, 3));
    const px = ART * S;
    world.clouds = [
      { x: w * 0.17, y: 0.18, scale: 1.15, depth: 0.2 },
      { x: w * 0.44, y: 0.11, scale: 0.85, depth: 0.7 },
      { x: w * 0.78, y: 0.26, scale: 1.35, depth: 0.45 },
    ];

    const sp = (propsRef.current.startSpeed ?? startSpeed) * S;
    world.obstacles = [];
    for (const [at, want, glyph] of [
      [0.62, 2, 0],
      [1.02, 1, 2],
    ]) {
      let stack = want;
      while (stack > 0 && !jumpWindow(stack, sp, S).ok) stack--;
      if (stack > 0) world.obstacles.push({ x: w * at, stack, glyph });
    }
    world.dist = 40 * px;
  }

  function doJump() {
    const world = worldRef.current;
    if (!world || world.dead || !world.grounded) return;
    const p = propsRef.current;
    const host = hostRef.current;
    const h = host ? host.clientHeight || REF_H : REF_H;
    const w = host ? host.clientWidth || REF_W : REF_W;
    const S = Math.max(0.3, Math.min(w / REF_W, h / REF_H, 3));
    world.playerV = (p.jump ?? jump) * S;
    world.grounded = false;
  }

  useLayoutEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    host.focus({ preventScroll: true });
    hoverRef.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    let w = 0;
    let h = 0;

    const measure = () => {
      const r = host.getBoundingClientRect();
      const cw = Math.max(1, Math.round(host.clientWidth || r.width || REF_W));
      const ch = Math.max(1, Math.round(host.clientHeight || r.height || REF_H));
      if (cw === w && ch === h) return false;
      w = cw;
      h = ch;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    };

    measure();
    if (!worldRef.current.obstacles.length) seed(worldRef.current, w, h);

    paint(ctx, w, h);

    const ro = new ResizeObserver(() => {
      if (measure()) paint(ctx, w, h);
    });
    ro.observe(host);

    lastRef.current = 0;
    const frame = (now) => {
      const prev = lastRef.current || now;
      lastRef.current = now;
      const dt = Math.min(0.05, (now - prev) / 1000);
      if (dt > 0) step(dt, w, h);
      paint(ctx, w, h);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      ro.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;

    const play = () => {
      const world = worldRef.current;
      if (world) world.played = true;
      idleRef.current = 0;
    };

    const onKey = (e) => {
      const mine =
        hoverRef.current ||
        (host !== null &&
          typeof document !== "undefined" &&
          document.activeElement === host);
      if (!mine) return;
      if (
        e.code === "Space" ||
        e.code === "ArrowUp" ||
        e.key === " " ||
        e.key === "ArrowUp"
      ) {
        e.preventDefault();
        play();
        doJump();
      }
    };
    const onPointer = (e) => {
      e.preventDefault();
      play();
      doJump();
    };
    const onEnter = () => {
      hoverRef.current = true;
    };
    const onLeave = () => {
      hoverRef.current = false;
    };

    window.addEventListener("keydown", onKey, { passive: false });
    host?.addEventListener("pointerdown", onPointer);
    host?.addEventListener("pointerenter", onEnter);
    host?.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      host?.removeEventListener("pointerdown", onPointer);
      host?.removeEventListener("pointerenter", onEnter);
      host?.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      tabIndex={0}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 120,
        overflow: "hidden",
        background,
        touchAction: "manipulation",
        cursor: "pointer",
        outline: "none",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default PixelRunGame;
