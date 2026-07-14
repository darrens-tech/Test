"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HUD_CYAN } from "./materials";

/**
 * The wireframe handshake (DESIGN-PLAN §6): cyan wireframe → solid machined
 * part, driven by a single `resolve` value 0→1.
 *
 *   0.00–0.45  wireframe draws in (dashed-line offset animation)
 *   0.30–0.85  a clipping plane sweeps bottom→top revealing the solid
 *   0.55–1.00  wireframe fades; env lighting ramps to full
 *
 * Progress comes from a getter so both timelines (load sequence) and
 * ScrollTriggers (chapter handshakes) can drive it without re-rendering React.
 */
export function Materialise({
  object,
  getResolve,
  wireColor = HUD_CYAN,
}: {
  object: THREE.Object3D;
  getResolve: () => number;
  wireColor?: THREE.Color;
}) {
  const group = useRef<THREE.Group>(null);
  const { gl } = useThree();

  const { wires, solids, plane, bounds } = useMemo(() => {
    gl.localClippingEnabled = true;
    const solids: THREE.Mesh[] = [];
    object.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(object);
    const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), bbox.min.y - 0.05);

    const wireMat = new THREE.LineDashedMaterial({
      color: wireColor,
      transparent: true,
      opacity: 0.85,
      dashSize: 2.4,
      gapSize: 2.4,
      scale: 1,
    });

    const wireGroup = new THREE.Group();
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        solids.push(mesh);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.clippingPlanes = [plane];
        mat.transparent = true;

        const edges = new THREE.EdgesGeometry(mesh.geometry, 24);
        const line = new THREE.LineSegments(edges, wireMat);
        line.computeLineDistances();
        mesh.getWorldPosition(line.position);
        mesh.getWorldQuaternion(line.quaternion);
        line.scale.copy(mesh.getWorldScale(new THREE.Vector3()));
        wireGroup.add(line);
      }
    });

    return { wires: wireGroup, solids, plane, bounds: bbox };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object]);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.add(object);
    g.add(wires);
    return () => {
      g.remove(object);
      g.remove(wires);
      wires.traverse((c) => {
        const l = c as THREE.LineSegments;
        if (l.isLineSegments) l.geometry.dispose();
      });
    };
  }, [object, wires]);

  useFrame(() => {
    const r = THREE.MathUtils.clamp(getResolve(), 0, 1);

    // wire draw-in then fade-out
    const draw = THREE.MathUtils.smoothstep(r, 0.0, 0.45);
    const fade = 1 - THREE.MathUtils.smoothstep(r, 0.55, 1.0);
    const wireMat = (wires.children[0] as THREE.LineSegments | undefined)
      ?.material as THREE.LineDashedMaterial | undefined;
    if (wireMat) {
      wireMat.dashSize = 0.05 + draw * 4.0;
      wireMat.gapSize = 4.0 - draw * 3.95;
      wireMat.opacity = 0.85 * fade + 0.0;
    }
    wires.visible = fade > 0.01;

    // clip sweep bottom→top
    const sweep = THREE.MathUtils.smoothstep(r, 0.3, 0.85);
    plane.constant = THREE.MathUtils.lerp(
      bounds.min.y - 0.05,
      bounds.max.y + 0.1,
      sweep,
    );

    // lighting resolve (clay → full PBR)
    const lit = THREE.MathUtils.smoothstep(r, 0.55, 1.0);
    for (const mesh of solids) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.envMapIntensity = 0.15 + lit * 1.05;
      mat.opacity = sweep > 0 ? 1 : 0;
    }
  });

  return <group ref={group} />;
}
