"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { onScene } from "@/lib/scrollBus";
import { Dust } from "../fx/Dust";

/**
 * S3 · THE TRACK — stylised night circuit following Sentul International
 * Circuit's layout (One Team's home track; layout accuracy flagged GAP-014).
 * The red racing line draws with scroll; telemetry particles stream along it
 * on the GPU (positions baked into a curve texture — one draw call).
 * Red is allowed to dominate here: it's the racing line (brief §4 role).
 */

// Plan-view control points, stylised from Sentul's ~4.12km layout.
const LAYOUT: [number, number][] = [
  [0, 0], [3.2, 0.1], [5.6, -0.1], [6.6, -1.2], [6.2, -2.6], [5.0, -3.1],
  [4.2, -2.3], [3.4, -3.0], [2.4, -2.4], [1.8, -3.4], [0.2, -4.1],
  [-1.6, -3.7], [-2.4, -2.5], [-2.0, -1.4], [-3.2, -0.9], [-3.4, 0.3], [-1.8, 0.6],
];

function useTrackCurve() {
  return useMemo(() => {
    const pts = LAYOUT.map(([x, z]) => new THREE.Vector3(x, 0, z));
    return new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.6);
  }, []);
}

/** Telemetry stream: particles advected along the lap via a baked curve texture. */
function Telemetry({
  curve,
  getReveal,
}: {
  curve: THREE.CatmullRomCurve3;
  getReveal: () => number;
}) {
  const COUNT = 2400;
  const { geometry, material } = useMemo(() => {
    const SAMPLES = 512;
    const data = new Float32Array(SAMPLES * 4);
    for (let i = 0; i < SAMPLES; i++) {
      const p = curve.getPointAt(i / (SAMPLES - 1));
      data[i * 4] = p.x;
      data[i * 4 + 1] = p.y + 0.06;
      data[i * 4 + 2] = p.z;
      data[i * 4 + 3] = 1;
    }
    const tex = new THREE.DataTexture(data, SAMPLES, 1, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;

    const geo = new THREE.BufferGeometry();
    const offsets = new Float32Array(COUNT);
    const lanes = new Float32Array(COUNT * 2);
    for (let i = 0; i < COUNT; i++) {
      offsets[i] = Math.random();
      lanes[i * 2] = (Math.random() - 0.5) * 0.22;
      lanes[i * 2 + 1] = Math.random() * 0.3;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    geo.setAttribute("aOffset", new THREE.BufferAttribute(offsets, 1));
    geo.setAttribute("aLane", new THREE.BufferAttribute(lanes, 2));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCurve: { value: tex },
        uColor: { value: new THREE.Color(0x8fe3ff) },
        uReveal: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aOffset;
        attribute vec2 aLane;
        uniform float uTime;
        uniform sampler2D uCurve;
        uniform float uReveal;
        varying float vA;
        void main() {
          float t = fract(aOffset + uTime * 0.05);
          vec3 p = texture2D(uCurve, vec2(t, 0.5)).xyz;
          vec3 ahead = texture2D(uCurve, vec2(fract(t + 0.01), 0.5)).xyz;
          vec3 dir = normalize(ahead - p);
          vec3 side = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
          p += side * aLane.x + vec3(0.0, aLane.y, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.4 + fract(aOffset * 13.7) * 1.8) * (90.0 / -mv.z);
          vA = step(t, uReveal);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(uColor, smoothstep(0.5, 0.1, d) * 0.5 * vA);
        }
      `,
    });
    return { geometry: geo, material: mat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curve]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uReveal.value = getReveal();
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

export function TrackScene() {
  const { camera } = useThree();
  const progress = useRef(0);
  const drawn = useRef(0);
  const curve = useTrackCurve();

  const { road, line, glow, lineCount, glowCount } = useMemo(() => {
    const road = new THREE.TubeGeometry(curve, 480, 0.34, 8, true);
    road.scale(1, 0.1, 1);
    const line = new THREE.TubeGeometry(curve, 480, 0.035, 6, true);
    const glow = new THREE.TubeGeometry(curve, 480, 0.085, 6, true);
    return {
      road,
      line,
      glow,
      lineCount: line.index?.count ?? 0,
      glowCount: glow.index?.count ?? 0,
    };
  }, [curve]);

  const lineRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const off = onScene((m) => {
      if (m.scene === "track" && m.progress !== undefined) progress.current = m.progress;
    });
    return off;
  }, []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const target = THREE.MathUtils.clamp(progress.current, 0, 1);
    drawn.current += (target - drawn.current) * (1 - Math.exp(-5 * d));
    const p = drawn.current;

    // racing line draws with the lap
    if (lineRef.current) lineRef.current.geometry.setDrawRange(0, Math.floor(lineCount * p));
    if (glowRef.current) glowRef.current.geometry.setDrawRange(0, Math.floor(glowCount * p));

    // chase camera, low arc, slightly outside the line
    const t = Math.min(p * 0.96 + 0.005, 0.995);
    const pos = curve.getPointAt(t);
    const ahead = curve.getPointAt(Math.min(t + 0.03, 1));
    const dir = ahead.clone().sub(pos).normalize();
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    const camTarget = pos
      .clone()
      .add(side.multiplyScalar(1.3))
      .add(new THREE.Vector3(0, 0.9 + (1 - p) * 2.4, 0))
      .sub(dir.clone().multiplyScalar(1.6));
    camera.position.lerp(camTarget, 1 - Math.exp(-3 * d));
    camera.lookAt(ahead.x, 0.15, ahead.z);
  });

  return (
    <group>
      <fogExp2 attach="fog" args={[0x07090b, 0.06]} />
      <ambientLight intensity={0.16} />
      <directionalLight position={[4, 8, 2]} intensity={0.35} color={0xbcd6e6} />

      {/* asphalt ribbon */}
      <mesh geometry={road}>
        <meshStandardMaterial color={0x11151a} metalness={0.1} roughness={0.9} />
      </mesh>

      {/* the racing line — red means redline */}
      <mesh ref={lineRef} geometry={line}>
        <meshStandardMaterial
          color={0xe1231d}
          emissive={0xe1231d}
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={glowRef} geometry={glow}>
        <meshBasicMaterial color={0xe1231d} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* start gantry */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.55, 0.8]}>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
          <meshStandardMaterial color={0x3a434d} metalness={0.9} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.55, -0.8]}>
          <boxGeometry args={[0.08, 1.1, 0.08]} />
          <meshStandardMaterial color={0x3a434d} metalness={0.9} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.12, 0]}>
          <boxGeometry args={[0.12, 0.14, 1.7]} />
          <meshStandardMaterial color={0x1a2129} emissive={0x8fe3ff} emissiveIntensity={0.35} />
        </mesh>
      </group>

      {/* pit building, far side */}
      <mesh position={[2.6, 0.3, 1.6]}>
        <boxGeometry args={[3.2, 0.6, 0.9]} />
        <meshStandardMaterial color={0x0d1116} metalness={0.3} roughness={0.7} />
      </mesh>

      <Telemetry curve={curve} getReveal={() => drawn.current} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1, -0.06, -2]}>
        <planeGeometry args={[46, 36]} />
        <meshStandardMaterial color={0x090c0f} metalness={0.15} roughness={0.9} />
      </mesh>

      <Dust count={4000} box={[14, 4, 12]} opacity={0.18} />
    </group>
  );
}
