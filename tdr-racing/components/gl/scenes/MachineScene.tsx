"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import { buildScooter } from "../parts/scooter";
import {
  buildPiston,
  buildBrakeDisc,
  buildHelmet,
  buildOilBottle,
} from "../parts/pillarProps";
import { Materialise } from "../fx/Materialise";
import { Dust } from "../fx/Dust";
import { onScene } from "@/lib/scrollBus";

const CAM_POS = new THREE.Vector3(2.05, 0.98, 2.95);
const CAM_LOOK = new THREE.Vector3(0, 0.62, 0);

/**
 * S1 · THE MACHINE — home hero + four-pillars chapter.
 * Load sequence resolve (wireframe→clay→PBR) and pillar chapter index arrive
 * over the scroll bus from the DOM (components/home/*). Idle: slow yaw drift
 * + cursor parallax ±3°, damped (brief §5).
 */
export function MachineScene() {
  const { camera } = useThree();
  const machineRef = useRef<THREE.Group>(null);
  const propsRef = useRef<THREE.Group>(null);
  const resolve = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const [chapter, setChapter] = useState(-1);

  const build = useMemo(() => buildScooter(), []);
  const props = useMemo(
    () => [
      buildPiston(build.materials),
      buildBrakeDisc(build.materials),
      buildHelmet(build.materials),
      buildOilBottle(build.materials),
    ],
    [build],
  );

  useEffect(() => {
    // Intro already played this session → machine arrives resolved.
    if (sessionStorage.getItem("tdr-intro") === "1") resolve.current = 1;
    const off = onScene((m) => {
      if (m.scene !== "home") return;
      if (m.progress !== undefined) resolve.current = m.progress;
      if (m.chapter !== undefined) setChapter(m.chapter);
    });
    const onMove = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      off();
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const d = Math.min(delta, 0.05);
    const m = machineRef.current;
    if (m) {
      // QA pose hook: freeze a flattering 3/4 for poster renders
      const posed = sessionStorage.getItem("tdr-qa-pose");
      // slow idle orbit + damped cursor parallax (±3° ≈ 0.052 rad)
      const targetYaw = posed ? 0.55 : t * 0.06 + pointer.current.x * 0.052;
      m.rotation.y += (targetYaw - m.rotation.y) * (1 - Math.exp(-3 * d));
      m.rotation.x += (pointer.current.y * 0.02 - m.rotation.x) * (1 - Math.exp(-3 * d));
      // pillars chapter: machine yields the stage to the active part
      const tx = chapter >= 0 ? -1.15 : 0;
      const ts = chapter >= 0 ? 0.8 : 1;
      m.position.x += (tx - m.position.x) * (1 - Math.exp(-3.5 * d));
      const s = m.scale.x + (ts - m.scale.x) * (1 - Math.exp(-3.5 * d));
      m.scale.setScalar(s);
    }
    const pg = propsRef.current;
    if (pg) {
      pg.rotation.y = t * 0.35;
      pg.children.forEach((child, i) => {
        const target = i === chapter ? 1 : 0;
        const cs = child.scale.x + (target - child.scale.x) * (1 - Math.exp(-4.5 * d));
        child.scale.setScalar(Math.max(cs, 0.0001));
        child.visible = cs > 0.01;
      });
    }
    camera.position.lerp(CAM_POS, 1 - Math.exp(-2.2 * d));
    camera.lookAt(CAM_LOOK);
  });

  return (
    <group>
      <fogExp2 attach="fog" args={[0x07090b, 0.075]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[3.5, 4.5, 2.5]} intensity={1.35} color={0xffffff} />
      <directionalLight position={[-4, 2.2, -3]} intensity={0.55} color={0x8fe3ff} />
      <pointLight position={[-1.2, 0.25, -1.4]} intensity={0.5} distance={5} color={0xe1231d} />

      <group ref={machineRef} position={[0, 0, 0]}>
        <Materialise
          object={build.group}
          getResolve={() =>
            // posed QA renders keep a faint wireframe ghost — the aesthetic
            sessionStorage.getItem("tdr-qa-pose")
              ? Math.min(resolve.current, 0.94)
              : resolve.current
          }
        />
      </group>

      <group ref={propsRef} position={[1.05, 0.85, 0.3]}>
        {props.map((p, i) => (
          // eslint-disable-next-line react/no-unknown-property
          <primitive key={i} object={p} scale={0.0001} visible={false} />
        ))}
      </group>

      <Grid
        position={[0, 0.001, 0]}
        cellSize={0.55}
        cellThickness={0.6}
        cellColor="#144252"
        sectionSize={2.75}
        sectionThickness={1.1}
        sectionColor="#1d5a70"
        fadeDistance={14}
        fadeStrength={1.8}
        infiniteGrid
      />

      <Dust count={3500} box={[10, 5, 8]} opacity={0.22} />
    </group>
  );
}
