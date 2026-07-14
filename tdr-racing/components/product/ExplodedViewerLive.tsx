"use client";

import { Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { attachEnvironment } from "@/components/gl/fx/materials";
import { Materialise } from "@/components/gl/fx/Materialise";
import { buildCvtSet, type PartsBuild } from "@/components/gl/parts/cvt";
import { buildCylinderKit } from "@/components/gl/parts/cylinderKit";

/**
 * The Tier-1 live half of the exploded viewer. Loaded via next/dynamic so
 * three.js never enters the route's first-load JS — Tier 2/3 devices download
 * zero bytes of this file (brief §10 bundle gate).
 */

const BUILDERS: Record<string, () => PartsBuild> = {
  "cvt-set": buildCvtSet,
  "cylinder-kit": buildCylinderKit,
};

export interface CalloutRefs {
  labels: React.RefObject<Array<HTMLElement | null>>;
  lines: React.RefObject<Array<SVGLineElement | null>>;
  anchors: React.RefObject<Array<{ x: number; y: number }>>;
}

function band(order: number): [number, number] {
  const start = 0.06 + order * 0.1;
  return [start, Math.min(start + 0.38, 1)];
}

function ExplodeRig({
  build,
  parts,
  getProgress,
  getEntry,
  refs,
}: {
  build: PartsBuild;
  parts: Array<{ id: string }>;
  getProgress: () => number;
  getEntry: () => number;
  refs: CalloutRefs;
}) {
  const { camera, size } = useThree();
  const bases = useMemo(() => build.parts.map((p) => p.object.position.clone()), [build]);
  const v = useMemo(() => new THREE.Vector3(), []);
  const anchorsResolved = useMemo(
    () =>
      parts.map((a) => {
        const part = build.parts.find((p) => p.id === a.id);
        return { object: part?.object, order: part?.order ?? 0 };
      }),
    [parts, build],
  );

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    const p = THREE.MathUtils.clamp(getProgress(), 0, 1);

    build.parts.forEach((part, i) => {
      const [a, b] = band(part.order);
      const t = THREE.MathUtils.smoothstep(p, a, b);
      part.object.position.copy(bases[i]).addScaledVector(part.vector, t);
    });

    build.group.rotation.y = -0.35 + p * 0.3;

    const r = build.radius;
    const target = v.set(r * 1.15 + p * r * 0.9, r * 0.55, r * 1.9 + p * r * 0.75);
    camera.position.lerp(target, 1 - Math.exp(-3.5 * d));
    camera.lookAt(p * 0.3, 0, 0);

    anchorsResolved.forEach((slot, i) => {
      const labelEl = refs.labels.current?.[i];
      const lineEl = refs.lines.current?.[i];
      const anchor = refs.anchors.current?.[i];
      if (!slot.object || !labelEl || !lineEl || !anchor) return;
      slot.object.getWorldPosition(v).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const [a2, b2] = band(slot.order);
      const alpha = THREE.MathUtils.smoothstep(p, a2 + (b2 - a2) * 0.45, b2);
      labelEl.style.opacity = String(alpha);
      lineEl.style.opacity = String(alpha * 0.65);
      lineEl.setAttribute("x1", String(anchor.x));
      lineEl.setAttribute("y1", String(anchor.y));
      lineEl.setAttribute("x2", x.toFixed(1));
      lineEl.setAttribute("y2", y.toFixed(1));
    });
  });

  return <Materialise object={build.group} getResolve={getEntry} />;
}

export default function ExplodedViewerLive({
  procedural,
  parts,
  inView,
  getProgress,
  getEntry,
  refs,
}: {
  procedural: string;
  parts: Array<{ id: string }>;
  inView: boolean;
  getProgress: () => number;
  getEntry: () => number;
  refs: CalloutRefs;
}) {
  const build = useMemo(() => {
    const builder = BUILDERS[procedural];
    return builder ? builder() : null;
  }, [procedural]);

  if (!build) return null;

  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.75]}
      frameloop={inView ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 35, position: [1.6, 0.7, 2.6] }}
      onCreated={({ gl, scene }) => {
        gl.localClippingEnabled = true;
        attachEnvironment(gl, scene);
      }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 2]} intensity={1.3} />
      <directionalLight position={[-4, 2, -2]} intensity={0.5} color={0x8fe3ff} />
      <Suspense fallback={null}>
        <ExplodeRig
          build={build}
          parts={parts}
          getProgress={getProgress}
          getEntry={getEntry}
          refs={refs}
        />
      </Suspense>
    </Canvas>
  );
}
