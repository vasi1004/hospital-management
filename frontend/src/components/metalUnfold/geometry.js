export const DPR_CAP = 2;
export const CYCLE_SEC_AT_50 = 3.45;
export const F_EXPAND = 0.31;
export const F_COLLAPSE = 0.29;
export const F_REST = 0.4;
export const YAW_DEG = 45;
export const FOV_DEG = 28;
export const CHAMFER = 0.045;
export const TAU = Math.PI * 2;
export const PANEL = 0.5;
export const THICK = 0.07;
export const PART_COUNT = 6;

export const NET = [
  [0, 0, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
  [2, 0, 0],
];

export const VERT = `
precision highp float;
attribute vec3 aPos;
attribute vec3 aNrm;
attribute float aPart;
uniform vec4 uQ[6];
uniform vec3 uT[6];
uniform float uSpin;
uniform float uYaw;
uniform float uPitch;
uniform float uRoll;
uniform float uDist;
uniform float uFov;
uniform float uAspect;
varying vec3 vN;
varying vec3 vP;
vec3 qrot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 rotZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }
void main() {
  int pid = int(aPart + 0.5);
  vec4 q = uQ[0];
  vec3 t = uT[0];
  for (int k = 1; k < 6; k++) {
    if (k == pid) { q = uQ[k]; t = uT[k]; }
  }
  vec3 pl = qrot(q, aPos) + t;
  vec3 pw = rotY(pl, uSpin);
  vN = rotY(qrot(q, aNrm), uSpin);
  vP = pw;
  vec3 v = rotX(rotY(pw, -uYaw), uPitch);
  v.z -= uDist;
  v = rotZ(v, uRoll);
  float f = 1.0 / tan(uFov * 0.5);
  float zn = 0.05;
  float zf = 200.0;
  gl_Position = vec4(
    v.x * f / uAspect,
    v.y * f,
    ((zf + zn) / (zn - zf)) * v.z + (2.0 * zf * zn) / (zn - zf),
    -v.z
  );
}
`;

export const FRAG = `
precision highp float;
varying vec3 vN;
varying vec3 vP;
uniform vec3 uCamPos;
uniform vec3 uBase;
uniform float uRough;
uniform float uReflect;

const float PI = 3.14159265359;

const vec3 SKY_LOW = vec3(0.30, 0.35, 0.47);
const vec3 SKY_HIGH = vec3(0.80, 0.84, 0.95);
const vec3 GROUND_DEEP = vec3(0.0035, 0.0038, 0.0050);
const vec3 GROUND_NEAR = vec3(0.052, 0.055, 0.066);
const vec3 HORIZON = vec3(0.55, 0.53, 0.49);

const vec3 BOX_A_DIR = vec3(-0.5774, 0.5774, -0.5774);
const vec3 BOX_B_DIR = vec3(0.5774, -0.5774, -0.5774);
const vec3 BOX_C_DIR = vec3(-0.5774, -0.5774, 0.5774);
const vec3 BOX_A = vec3(1.90, 1.90, 1.96);
const vec3 BOX_B = vec3(1.30, 1.26, 1.20);
const vec3 BOX_C = vec3(1.00, 1.03, 1.12);

float boxLobe(vec3 R, vec3 d, float sharp) {
  return pow(max(dot(R, d), 0.0), sharp);
}

vec3 envSample(vec3 R, float r) {
  float t = clamp(R.y * 0.5 + 0.5, 0.0, 1.0);

  vec3 ground = mix(GROUND_DEEP, GROUND_NEAR, smoothstep(-0.85, -0.02, R.y));
  vec3 sky = mix(SKY_LOW, SKY_HIGH, smoothstep(0.02, 0.90, R.y));

  float e = 0.006 + 0.45 * r * r;
  vec3 c = mix(ground, sky, smoothstep(0.5 - e, 0.5 + e, t));
  c += HORIZON * exp(-(R.y * R.y) / (0.004 + 0.30 * r * r)) * (1.0 - 0.6 * r);
  c += BOX_A * boxLobe(R, BOX_A_DIR, mix(500.0, 5.0, r));
  c += BOX_B * boxLobe(R, BOX_B_DIR, mix(260.0, 4.0, r));
  c += BOX_C * boxLobe(R, BOX_C_DIR, mix(200.0, 3.0, r));
  return c;
}

float dGGX(float NoH, float a) {
  float a2 = a * a;
  float d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d);
}

float vSmith(float NoV, float NoL, float a) {
  float a2 = a * a;
  float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
  float gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / max(gv + gl, 1e-5);
}

vec3 fSchlick(vec3 f0, float u) { return f0 + (1.0 - f0) * pow(1.0 - u, 5.0); }

vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

vec3 srgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

vec3 lightTerm(vec3 N, vec3 V, vec3 L, vec3 f0, float a, vec3 col) {
  vec3 H = normalize(L + V);
  float NoL = max(dot(N, L), 0.0);
  float NoV = max(dot(N, V), 1e-4);
  float NoH = max(dot(N, H), 0.0);
  float VoH = max(dot(V, H), 0.0);
  return dGGX(NoH, a) * vSmith(NoV, NoL, a) * fSchlick(f0, VoH) * col * NoL;
}

void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(uCamPos - vP);
  float r = clamp(uRough, 0.03, 1.0);
  float a = r * r;
  vec3 f0 = clamp(uBase * uReflect, vec3(0.0), vec3(1.0));
  float NoV = max(dot(N, V), 1e-4);
  vec3 R = reflect(-V, N);
  vec3 Fe = f0 + (max(vec3(1.0 - r), f0) - f0) * pow(1.0 - NoV, 5.0);
  vec3 col = envSample(R, r) * Fe;

  col += lightTerm(N, V, BOX_A_DIR, f0, a, vec3(0.55, 0.55, 0.57));
  col += lightTerm(N, V, BOX_B_DIR, f0, a, vec3(0.22, 0.21, 0.20));
  gl_FragColor = vec4(srgb(aces(col)), 1.0);
}
`;

export const QI = [0, 0, 0, 1];

export function qAxis(axis, ang) {
  const l = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const s = Math.sin(ang / 2);
  return [
    (axis[0] / l) * s,
    (axis[1] / l) * s,
    (axis[2] / l) * s,
    Math.cos(ang / 2),
  ];
}

export function qMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export function qRot(q, v) {
  const t = [
    2 * (q[1] * v[2] - q[2] * v[1]),
    2 * (q[2] * v[0] - q[0] * v[2]),
    2 * (q[0] * v[1] - q[1] * v[0]),
  ];
  return [
    v[0] + q[3] * t[0] + (q[1] * t[2] - q[2] * t[1]),
    v[1] + q[3] * t[1] + (q[2] * t[0] - q[0] * t[2]),
    v[2] + q[3] * t[2] + (q[0] * t[1] - q[1] * t[0]),
  ];
}

export function compose(pq, pt, cq, ct) {
  const rt = qRot(pq, ct);
  return { q: qMul(pq, cq), t: [rt[0] + pt[0], rt[1] + pt[1], rt[2] + pt[2]] };
}

export function hinge(q, pivot) {
  const r = qRot(q, pivot);
  return { q, t: [pivot[0] - r[0], pivot[1] - r[1], pivot[2] - r[2]] };
}

export const emptyMesh = () => ({ pos: [], nrm: [], part: [], idx: [] });

const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export function chamferedBox(m, half, centre, part, chamfer = CHAMFER) {
  const c = Math.min(chamfer, Math.min(half[0], Math.min(half[1], half[2])) * 0.49);
  const h = half;
  const i = [h[0] - c, h[1] - c, h[2] - c];

  const facet = (verts, n) => {
    const [p0, p1, p2] = verts;
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const g = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];
    const ordered =
      g[0] * n[0] + g[1] * n[1] + g[2] * n[2] >= 0 ? verts : verts.slice().reverse();
    const base = m.pos.length / 3;
    for (const v of ordered) {
      m.pos.push(v[0] + centre[0], v[1] + centre[1], v[2] + centre[2]);
      m.nrm.push(n[0], n[1], n[2]);
      m.part.push(part);
    }
    for (let k = 1; k < ordered.length - 1; k++) m.idx.push(base, base + k, base + k + 1);
  };

  const at = (a, av, b, bv, w, wv) => {
    const p = [0, 0, 0];
    p[a] = av;
    p[b] = bv;
    p[w] = wv;
    return p;
  };

  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3;
    const w = (a + 2) % 3;
    for (const s of [-1, 1]) {
      facet(
        [
          at(a, s * h[a], b, -i[b], w, -i[w]),
          at(a, s * h[a], b, i[b], w, -i[w]),
          at(a, s * h[a], b, i[b], w, i[w]),
          at(a, s * h[a], b, -i[b], w, i[w]),
        ],
        at(a, s, b, 0, w, 0),
      );
    }
  }

  for (let a = 0; a < 3; a++) {
    for (let b = a + 1; b < 3; b++) {
      const w = 3 - a - b;
      for (const sa of [-1, 1]) {
        for (const sb of [-1, 1]) {
          facet(
            [
              at(a, sa * h[a], b, sb * i[b], w, i[w]),
              at(a, sa * i[a], b, sb * h[b], w, i[w]),
              at(a, sa * i[a], b, sb * h[b], w, -i[w]),
              at(a, sa * h[a], b, sb * i[b], w, -i[w]),
            ],
            norm(at(a, sa, b, sb, w, 0)),
          );
        }
      }
    }
  }

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        facet(
          [
            [sx * h[0], sy * i[1], sz * i[2]],
            [sx * i[0], sy * h[1], sz * i[2]],
            [sx * i[0], sy * i[1], sz * h[2]],
          ],
          norm([sx, sy, sz]),
        );
      }
    }
  }
}

export const packMesh = (m) => ({
  pos: new Float32Array(m.pos),
  nrm: new Float32Array(m.nrm),
  part: new Float32Array(m.part),
  idx: new Uint16Array(m.idx),
});

export function buildGeometry() {
  const m = emptyMesh();
  for (let k = 0; k < PART_COUNT; k++) {
    chamferedBox(m, [PANEL, THICK, PANEL], NET[k], k);
  }
  return packMesh(m);
}

const AX = [1, 0, 0];
const AZ = [0, 0, 1];

export function partTransforms(ext, motion) {
  const th = ((motion.fold * Math.PI) / 180) * ext;
  const p0 = { q: QI, t: [0, 0, 0] };
  const p1 = hinge(qAxis(AZ, th), [PANEL, 0, 0]);
  const p2 = hinge(qAxis(AZ, -th), [-PANEL, 0, 0]);
  const p3 = hinge(qAxis(AX, -th), [0, 0, PANEL]);
  const p4 = hinge(qAxis(AX, th), [0, 0, -PANEL]);
  const lid = hinge(qAxis(AZ, th), [1 + PANEL, 0, 0]);
  const p5 = compose(p1.q, p1.t, lid.q, lid.t);

  const f = Math.min(Math.abs(th) / (Math.PI / 2), 1);
  const g = [-0.5 * (1 - f), -0.5 * f, 0];
  const shift = (p) => ({
    q: p.q,
    t: [p.t[0] + g[0], p.t[1] + g[1], p.t[2] + g[2]],
  });
  return [p0, p1, p2, p3, p4, p5].map(shift);
}

const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t * t;

export function extension(u, hold) {
  const h = Math.min(Math.max(hold, 0), 1);
  const rem = 1 - h;
  if (rem <= 1e-6) return 1;
  const tRest = rem * F_REST;
  const tExp = rem * F_EXPAND;
  const tCol = rem * F_COLLAPSE;
  const p = u - Math.floor(u);
  if (p < tRest) return 0;
  if (p < tRest + tExp) return easeOut((p - tRest) / tExp);
  if (p < tRest + tExp + h) return 1;
  return 1 - easeIn(Math.min((p - tRest - tExp - h) / tCol, 1));
}

export function parseLinearColor(css, fallback) {
  const s = (css || "").trim();
  if (!s) return fallback;
  const varMatch = s.match(/^var\([^,]+,\s*(.+)\)$/i);
  if (varMatch) return parseLinearColor(varMatch[1], fallback);
  const toLinear = (c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let d = hex[1];
    if (d.length === 3 || d.length === 4) d = d.split("").map((c) => c + c).join("");
    if (d.length >= 6) {
      return [
        toLinear(parseInt(d.slice(0, 2), 16) / 255),
        toLinear(parseInt(d.slice(2, 4), 16) / 255),
        toLinear(parseInt(d.slice(4, 6), 16) / 255),
      ];
    }
    return fallback;
  }
  const rgb = s.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length >= 3) {
      const ch = (t) =>
        t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t) / 255;
      return [toLinear(ch(parts[0])), toLinear(ch(parts[1])), toLinear(ch(parts[2]))];
    }
    return fallback;
  }
  const hsl = s.match(/^hsla?\(([^)]+)\)$/i);
  if (hsl) {
    const parts = hsl[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length >= 3) {
      const hDeg = ((parseFloat(parts[0]) % 360) + 360) % 360;
      const sat = parseFloat(parts[1]) / 100;
      const lig = parseFloat(parts[2]) / 100;
      const c = (1 - Math.abs(2 * lig - 1)) * sat;
      const x = c * (1 - Math.abs(((hDeg / 60) % 2) - 1));
      const m = lig - c / 2;
      const table = [
        [c, x, 0],
        [x, c, 0],
        [0, c, x],
        [0, x, c],
        [x, 0, c],
        [c, 0, x],
      ];
      const t = table[Math.floor(hDeg / 60) % 6];
      return [toLinear(t[0] + m), toLinear(t[1] + m), toLinear(t[2] + m)];
    }
    return fallback;
  }
  return fallback;
}

export const DEF_BASE_LINEAR = [0.68, 0.71, 0.75];
