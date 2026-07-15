"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Workshop dust — one instanced Points draw call, custom shader.
 * Budget (DESIGN-PLAN §9): ≤6k hero, ≤8k workshop, ≤10k track; 0 on Tier 2/3
 * (this component only ever mounts inside the Tier-1 canvas).
 */
export function Dust({
  count = 4000,
  box = [10, 5, 8] as [number, number, number],
  color = 0x8fe3ff,
  opacity = 0.35,
}) {
  const points = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * box[0];
      pos[i * 3 + 1] = (Math.random() - 0.5) * box[1];
      pos[i * 3 + 2] = (Math.random() - 0.5) * box[2];
      seed[i] = Math.random() * 100;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
        uBoxY: { value: box[1] },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uBoxY;
        varying float vFade;
        void main() {
          vec3 p = position;
          float t = uTime * 0.05 + aSeed;
          p.y = mod(p.y + uTime * (0.06 + fract(aSeed) * 0.05) + uBoxY * 0.5, uBoxY) - uBoxY * 0.5;
          p.x += sin(t) * 0.18;
          p.z += cos(t * 0.8) * 0.18;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float size = 0.9 + fract(aSeed * 7.31) * 1.5;
          gl_PointSize = size * (42.0 / -mv.z);
          vFade = smoothstep(-14.0, -2.5, mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vFade;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d) * uOpacity * vFade;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    return { geometry: geo, material: mat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
