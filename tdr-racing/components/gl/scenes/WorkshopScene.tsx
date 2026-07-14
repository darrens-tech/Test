"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import { makeMaterials } from "../fx/materials";
import { buildScooter } from "../parts/scooter";
import { buildPiston, buildBrakeDisc } from "../parts/pillarProps";
import { Materialise } from "../fx/Materialise";
import { Dust } from "../fx/Dust";
import { onScene } from "@/lib/scrollBus";

/**
 * S2 · THE WORKSHOP — scroll-driven dolly through four stations of the
 * Technology Center: CNC bay → dyno cell → coating line → QC lab
 * (DESIGN-PLAN §5/S2). DOM chapters own the pin; camera position arrives as
 * bus progress 0..1 along a Catmull-Rom spline. Light shafts are billboarded
 * gradient planes (no raymarching); dust ≤8k.
 */

const CAM_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-7.0, 1.75, 2.2),
  new THREE.Vector3(-4.8, 1.5, 0.4),
  new THREE.Vector3(-2.6, 1.35, -2.0),
  new THREE.Vector3(0.4, 1.3, -0.7),
  new THREE.Vector3(3.4, 1.45, -0.4),
  new THREE.Vector3(5.4, 1.65, -2.2),
]);

const LOOK_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-4.2, 0.8, -2.0), // CNC
  new THREE.Vector3(-4.2, 0.8, -2.0),
  new THREE.Vector3(-1.2, 0.7, -4.4), // DYNO
  new THREE.Vector3(2.0, 0.9, -2.8), // COATING
  new THREE.Vector3(5.0, 0.75, -5.0), // QC
  new THREE.Vector3(5.0, 0.75, -5.0),
]);

function LightShaft({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color(0x8fe3ff) } },
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `
          uniform vec3 uColor; varying vec2 vUv;
          void main(){
            float a = smoothstep(0.0,0.35,vUv.y) * (1.0-smoothstep(0.65,1.0,vUv.y));
            a *= smoothstep(0.0,0.4,vUv.x) * (1.0-smoothstep(0.6,1.0,vUv.x));
            gl_FragColor = vec4(uColor, a*0.055);
          }`,
      }),
    [],
  );
  return (
    <mesh position={position} rotation={rotation} scale={scale} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

function buildStations() {
  const M = makeMaterials();
  const g = new THREE.Group();

  const box = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    p: [number, number, number],
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(...p);
    g.add(m);
    return m;
  };

  // — 01 CNC BAY (-4.2, -2.0)
  box(1.5, 0.95, 1.15, M.darkSteel, [-4.2, 0.48, -2.0]);
  box(0.55, 1.6, 0.55, M.darkSteel, [-4.2, 0.8, -2.62]);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 16), M.steel);
  spindle.position.set(-4.2, 1.28, -2.0);
  spindle.name = "spindle";
  g.add(spindle);
  box(0.85, 0.1, 0.6, M.steel, [-4.2, 0.99, -2.0]); // table
  const workpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 20), M.steel);
  workpiece.position.set(-4.2, 1.1, -2.0);
  g.add(workpiece);
  const cncLight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), M.hudGlow);
  cncLight.position.set(-4.45, 1.5, -2.62);
  g.add(cncLight);

  // — 02 DYNO CELL (-1.2, -4.6): drum + machine on rollers, redline arc
  box(2.1, 0.16, 1.15, M.darkSteel, [-1.2, 0.08, -4.6]);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 36), M.steel);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(-1.85, 0.12, -4.6);
  drum.name = "drum";
  g.add(drum);
  const tach = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 64, Math.PI * 1.4), M.redline);
  tach.position.set(-0.1, 1.15, -5.1);
  tach.rotation.y = 0.5;
  tach.name = "tach";
  g.add(tach);
  box(0.5, 0.9, 0.18, M.darkSteel, [-0.1, 0.55, -5.15]);

  // — 03 COATING LINE (2.0, -2.6): rack of pistons
  box(0.08, 1.7, 0.08, M.darkSteel, [1.2, 0.85, -2.6]);
  box(0.08, 1.7, 0.08, M.darkSteel, [2.8, 0.85, -2.6]);
  box(1.75, 0.06, 0.06, M.steel, [2.0, 1.55, -2.6]);
  for (let i = 0; i < 5; i++) {
    const piston = buildPiston(M);
    piston.scale.setScalar(0.42);
    piston.position.set(1.35 + i * 0.33, 1.28, -2.6);
    g.add(piston);
  }

  // — 04 QC LAB (5.0, -5.2): granite table + probe over a disc
  const granite = new THREE.MeshStandardMaterial({ color: 0x0e1114, metalness: 0.1, roughness: 0.25 });
  box(1.4, 0.2, 0.9, granite, [5.0, 0.62, -5.2]);
  box(0.12, 0.75, 0.12, M.darkSteel, [5.0, 0.31, -5.55]);
  box(0.1, 1.1, 0.1, M.darkSteel, [5.6, 1.15, -5.2]);
  box(0.9, 0.08, 0.08, M.steel, [5.2, 1.62, -5.2]);
  const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), M.hudGlow);
  probe.position.set(4.95, 1.45, -5.2);
  probe.name = "probe";
  g.add(probe);
  const disc = buildBrakeDisc(M);
  disc.scale.setScalar(0.5);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(4.95, 0.76, -5.2);
  g.add(disc);

  return g;
}

export function WorkshopScene() {
  const { camera } = useThree();
  const progress = useRef(0);
  const entry = useRef(0);

  const stations = useMemo(() => buildStations(), []);
  const dynoBike = useMemo(() => {
    const b = buildScooter();
    b.group.scale.setScalar(0.72);
    b.group.position.set(-1.15, 0.17, -4.6);
    b.group.rotation.y = Math.PI / 2 + 0.12;
    return b;
  }, []);

  useEffect(() => {
    const off = onScene((m) => {
      if (m.scene === "workshop" && m.progress !== undefined) progress.current = m.progress;
    });
    return off;
  }, []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    // entry handshake: wireframe → solid over ~1.6s on route arrival
    entry.current += (1 - entry.current) * (1 - Math.exp(-1.8 * d));

    const p = THREE.MathUtils.clamp(progress.current, 0, 1);
    const cp = CAM_PATH.getPointAt(p);
    camera.position.lerp(cp, 1 - Math.exp(-4 * d));
    const look = LOOK_PATH.getPointAt(p);
    camera.lookAt(look);

    // machinery ticks over
    const spindle = stations.getObjectByName("spindle");
    if (spindle) spindle.rotation.y = state.clock.elapsedTime * 8;
    const drum = stations.getObjectByName("drum");
    if (drum) drum.rotation.x = state.clock.elapsedTime * 2.4;
    const rear = dynoBike.group.getObjectByName("wheel-rear");
    if (rear) rear.rotation.z = -state.clock.elapsedTime * 2.4;
    const probe = stations.getObjectByName("probe");
    if (probe) probe.position.y = 1.45 + Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
  });

  return (
    <group>
      <fogExp2 attach="fog" args={[0x07090b, 0.055]} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[2, 6, 3]} intensity={0.9} />
      <directionalLight position={[-5, 3, -4]} intensity={0.5} color={0x8fe3ff} />
      <pointLight position={[-1.2, 1.4, -4.6]} intensity={0.7} distance={4} color={0xe1231d} />

      <Materialise object={stations} getResolve={() => entry.current} />
      <Materialise object={dynoBike.group} getResolve={() => Math.max(0, entry.current * 1.3 - 0.3)} />

      <LightShaft position={[-4.0, 1.9, -2.3]} rotation={[0, 0.4, -0.5]} scale={[1.4, 3.2, 1]} />
      <LightShaft position={[2.0, 1.9, -2.9]} rotation={[0, -0.3, -0.45]} scale={[1.7, 3.4, 1]} />
      <LightShaft position={[5.0, 2.0, -5.4]} rotation={[0, 0.2, -0.4]} scale={[1.2, 3.0, 1]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -2]}>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color={0x0a0d11} metalness={0.2} roughness={0.85} />
      </mesh>
      <Grid
        position={[0, 0.002, -2]}
        cellSize={0.7}
        cellThickness={0.5}
        cellColor="#0e2330"
        sectionSize={3.5}
        sectionThickness={1}
        sectionColor="#143b4c"
        fadeDistance={18}
        fadeStrength={1.6}
        infiniteGrid
      />
      <Dust count={8000} box={[16, 5, 12]} opacity={0.28} />
    </group>
  );
}
