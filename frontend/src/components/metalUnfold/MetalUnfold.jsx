import { useEffect, useLayoutEffect, useRef } from "react";
import {
  buildGeometry,
  DPR_CAP,
  CYCLE_SEC_AT_50,
  DEF_BASE_LINEAR,
  extension,
  FOV_DEG,
  FRAG,
  parseLinearColor,
  partTransforms,
  PART_COUNT,
  TAU,
  VERT,
  YAW_DEG,
} from "./geometry";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const ORIGINKIT_PRESETS = {
  material: { reflect: 100, roughness: 100 },
  motion: { fold: 90, hold: 50, spin: 90 },
  camera: { tilt: 18, sideTilt: 0 },
};

/**
 * Originkit Metal Unfold — WebGL loader (product-sized container defaults).
 */
export default function MetalUnfold({
  background = "transparent",
  baseColor = "#059669",
  speed = 50,
  distance = 11,
  material: materialProp,
  motion: motionProp,
  camera: cameraProp,
  style,
  className,
}) {
  const material = { ...ORIGINKIT_PRESETS.material, ...materialProp };
  const motion = { ...ORIGINKIT_PRESETS.motion, ...motionProp };
  const camera = { ...ORIGINKIT_PRESETS.camera, ...cameraProp };

  const canvasRef = useRef(null);
  const live = useRef({
    baseColor,
    speed,
    distance,
    roughness: material.roughness,
    reflect: material.reflect,
    spin: motion.spin,
    fold: motion.fold,
    hold: motion.hold,
    tilt: camera.tilt,
    sideTilt: camera.sideTilt ?? camera.side_tilt ?? 0,
  });

  live.current = {
    baseColor,
    speed,
    distance,
    roughness: material.roughness,
    reflect: material.reflect,
    spin: motion.spin,
    fold: motion.fold,
    hold: motion.hold,
    tilt: camera.tilt,
    sideTilt: camera.sideTilt ?? camera.side_tilt ?? 0,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: true,
    });
    if (!gl) return undefined;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("MetalUnfold shader:", gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("MetalUnfold link:", gl.getProgramInfoLog(prog));
      return undefined;
    }
    gl.useProgram(prog);

    const geo = buildGeometry();
    const mkBuf = (data, attr, size) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, attr);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    mkBuf(geo.pos, "aPos", 3);
    mkBuf(geo.nrm, "aNrm", 3);
    mkBuf(geo.part, "aPart", 1);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);

    const U = (n) => gl.getUniformLocation(prog, n);
    const uSpin = U("uSpin");
    const uYaw = U("uYaw");
    const uPitch = U("uPitch");
    const uRoll = U("uRoll");
    const uDist = U("uDist");
    const uFov = U("uFov");
    const uAspect = U("uAspect");
    const uCamPos = U("uCamPos");
    const uBase = U("uBase");
    const uRough = U("uRough");
    const uReflect = U("uReflect");

    const uQ = [];
    const uT = [];
    for (let k = 0; k < PART_COUNT; k++) {
      uQ.push(U(`uQ[${k}]`));
      uT.push(U(`uT[${k}]`));
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    gl.clearColor(0, 0, 0, 0);

    let bw = 0;
    let bh = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === bw && h === bh) return;
      bw = w;
      bh = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = -1;
    let spinAngle = 0;
    let cycle = 0;
    const D2R = Math.PI / 180;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);

      const dt = last < 0 ? 0 : Math.min(Math.max((now - last) / 1000, 0), 0.1);
      last = now;
      const L = live.current;

      spinAngle = (spinAngle + dt * L.spin * D2R) % TAU;
      const rate = L.speed / 50;
      if (rate > 0) cycle = (cycle + (dt * rate) / CYCLE_SEC_AT_50) % 1;

      const ext = rate > 0 ? extension(cycle, L.hold / 100) : 1;

      resize();
      const pitch = L.tilt * D2R;
      const yaw = YAW_DEG * D2R;
      const d = L.distance;
      const poses = partTransforms(ext, {
        spin: L.spin,
        fold: L.fold,
        hold: L.hold,
      });
      for (let k = 0; k < PART_COUNT; k++) {
        const p = poses[k];
        gl.uniform4f(uQ[k], p.q[0], p.q[1], p.q[2], p.q[3]);
        gl.uniform3f(uT[k], p.t[0], p.t[1], p.t[2]);
      }
      gl.uniform1f(uSpin, spinAngle);
      gl.uniform1f(uYaw, yaw);
      gl.uniform1f(uPitch, pitch);
      gl.uniform1f(uRoll, L.sideTilt * D2R);
      gl.uniform1f(uDist, d);
      gl.uniform1f(uFov, FOV_DEG * D2R);
      gl.uniform1f(uAspect, bw / Math.max(bh, 1));
      gl.uniform3f(
        uCamPos,
        Math.sin(yaw) * Math.cos(pitch) * d,
        Math.sin(pitch) * d,
        Math.cos(yaw) * Math.cos(pitch) * d,
      );
      const bc = parseLinearColor(L.baseColor, DEF_BASE_LINEAR);
      gl.uniform3f(uBase, bc[0], bc[1], bc[2]);
      gl.uniform1f(uRough, Math.min(Math.max(L.roughness / 100, 0), 1));
      gl.uniform1f(uReflect, Math.min(Math.max(L.reflect / 100, 0), 1));

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
        background,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
