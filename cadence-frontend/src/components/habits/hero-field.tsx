"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type SceneSpec = {
  grid: { cols: number; rows: number; cell: number; gap: number };
  camera: { position: [number, number, number]; fovDeg: number };
  lights: {
    position: [number, number, number];
    energyW: number;
    color: [number, number, number];
  }[];
  heights: [number, number, number][];
};

const LABEL =
  "A year of days as raised blocks, lit where kept and dark where missed";

export function HeroField({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"probe" | "live" | "still">("probe");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const probe = document.createElement("canvas");
      webgl = Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
    } catch {
      webgl = false;
    }
    setMode(reduced || !webgl ? "still" : "live");
  }, []);

  useEffect(() => {
    if (mode !== "live") return;
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let raf = 0;
    let teardown: (() => void) | undefined;

    const start = async () => {
      const [THREE, res] = await Promise.all([
        import("three"),
        fetch("/hero-scene.json"),
      ]);
      const spec: SceneSpec = await res.json();
      if (cancelled) return;

      // A fresh canvas per renderer: forceContextLoss() poisons the one it used.
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(canvas);

      const { cols: COLS, rows: ROWS, cell: CELL, gap: GAP } = spec.grid;
      const PITCH = CELL + GAP;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearAlpha(0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;

      const scene = new THREE.Scene();

      // Blender is Z-up, three is Y-up: (x, y, z) becomes (x, z, -y).
      const cp = spec.camera.position;
      const camera = new THREE.PerspectiveCamera(spec.camera.fovDeg, 1, 0.1, 120);
      camera.position.set(cp[0], cp[2], -cp[1]);
      camera.lookAt(1.0, 0.45, -0.2);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      for (const L of spec.lights) {
        const light = new THREE.DirectionalLight(
          new THREE.Color(L.color[0], L.color[1], L.color[2]),
          L.energyW / 520
        );
        light.position.set(L.position[0], L.position[2], -L.position[1]);
        scene.add(light);
      }

      const geometry = new THREE.BoxGeometry(CELL, 1, CELL);
      geometry.translate(0, 0.5, 0);
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, COLS * ROWS);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      scene.add(mesh);

      const kept = new THREE.Color("#fafafa");
      const missed = new THREE.Color("#3a3a3c");
      const cells = spec.heights.map(([col, row, tall], i) => {
        const lit = tall > 0.1;
        mesh.setColorAt(i, lit ? kept : missed);
        return {
          x: (col - (COLS - 1) / 2) * PITCH,
          z: -(((ROWS - 1) / 2 - row) * PITCH),
          base: lit ? tall : 0.16,
          amp: lit ? 0.34 : 0.1,
          delay: 0.04 + (col / COLS) * 0.3 + (row / ROWS) * 0.05,
        };
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      const SPAN = (COLS - 1) * PITCH;
      const SIGMA = 3.4;
      const PERIOD = 2.6;
      const matrix = new THREE.Matrix4();
      const t0 = performance.now();

      const frame = (now: number) => {
        const t = (now - t0) / 1000;
        const head =
          -SPAN / 2 - SIGMA * 2 + ((t / PERIOD) % 1) * (SPAN + SIGMA * 4);
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          const p = Math.min(1, Math.max(0, (t - c.delay) / 0.5));
          const intro = 1 - (1 - p) ** 4;
          const d = (c.x - head) / SIGMA;
          const pulse = Math.exp(-d * d) * c.amp * intro;
          const h = (0.06 + (c.base - 0.06) * intro) * (1 + pulse);
          matrix.makeScale(1, Math.max(h, 0.001), 1);
          matrix.setPosition(c.x, 0, c.z);
          mesh.setMatrixAt(i, matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);

      teardown = () => {
        observer.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      };
    };

    start().catch(() => {
      if (!cancelled) setMode("still");
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      teardown?.();
    };
  }, [mode]);

  return (
    <div
      className={className}
      style={{
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, #000 22%, #000 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent, #000 22%, #000 100%)",
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: "780 / 547" }}>
        {mode === "still" ? (
          <Image
            src="/hero-still.webp"
            alt={LABEL}
            width={780}
            height={547}
            unoptimized
            priority
            className="h-full w-full object-contain"
          />
        ) : (
          <div ref={hostRef} role="img" aria-label={LABEL} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
