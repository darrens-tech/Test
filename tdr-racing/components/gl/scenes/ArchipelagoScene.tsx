"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import landTopo from "world-atlas/land-110m.json";
import { onScene } from "@/lib/scrollBus";

/**
 * S4 · THE ARCHIPELAGO — real coastline data (world-atlas / Natural Earth,
 * public domain), cropped to Indonesia + SEA, drawn as cyan HUD line work.
 * HQ node pulses in Jakarta; arcs are *coverage*, not dealers, until the
 * dealer list is verified (GAP-016/017).
 */

const LON0 = 110;
const LAT0 = 0;
const SCALE = 0.155;

function project(lon: number, lat: number): [number, number] {
  return [(lon - LON0) * SCALE, -(lat - LAT0) * SCALE];
}

const JAKARTA: [number, number] = [106.85, -6.2];
const COVERAGE: Array<{ name: string; lon: number; lat: number }> = [
  { name: "Surabaya", lon: 112.75, lat: -7.25 },
  { name: "Medan", lon: 98.67, lat: 3.58 },
  { name: "Makassar", lon: 119.42, lat: -5.13 },
  { name: "Bangkok", lon: 100.5, lat: 13.75 },
  { name: "Manila", lon: 120.98, lat: 14.6 },
];

function useCoastline(): THREE.BufferGeometry {
  return useMemo(() => {
    const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
    const land = feature(topo, topo.objects.land);
    const verts: number[] = [];
    const inBox = (lon: number, lat: number) =>
      lon >= 92 && lon <= 128 && lat >= -12 && lat <= 21;

    const pushRing = (ring: number[][]) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const [aLon, aLat] = ring[i];
        const [bLon, bLat] = ring[i + 1];
        if (!inBox(aLon, aLat) && !inBox(bLon, bLat)) continue;
        const [ax, az] = project(aLon, aLat);
        const [bx, bz] = project(bLon, bLat);
        verts.push(ax, 0, az, bx, 0, bz);
      }
    };

    for (const f of land.features) {
      const geom = f.geometry;
      if (geom.type === "Polygon") geom.coordinates.forEach(pushRing);
      else if (geom.type === "MultiPolygon")
        geom.coordinates.forEach((poly) => poly.forEach(pushRing));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
    return geo;
  }, []);
}

function CoverageArc({ from, to }: { from: [number, number]; to: [number, number] }) {
  const line = useMemo(() => {
    const [fx, fz] = project(from[0], from[1]);
    const [tx, tz] = project(to[0], to[1]);
    const a = new THREE.Vector3(fx, 0.01, fz);
    const b = new THREE.Vector3(tx, 0.01, tz);
    const mid = a.clone().lerp(b, 0.5);
    mid.y = a.distanceTo(b) * 0.32;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const pts = curve.getPoints(48);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0x8fe3ff,
      transparent: true,
      opacity: 0.55,
      dashSize: 0.09,
      gapSize: 0.05,
    });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
    // Static dashed arcs — the HQ pulse is this scene's one motion moment
    // (motion discipline, brief §6).
  }, [from, to]);

  return <primitive object={line} />;
}

export function ArchipelagoScene() {
  const { camera } = useThree();
  const progress = useRef(0);
  const coast = useCoastline();
  const pulseRef = useRef<THREE.Mesh>(null);
  const [hqX, hqZ] = project(JAKARTA[0], JAKARTA[1]);

  useEffect(() => {
    const off = onScene((m) => {
      if (m.scene === "archipelago" && m.progress !== undefined)
        progress.current = m.progress;
    });
    return off;
  }, []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    // 35° tilt, slow lateral drift with scroll (no pin — quiet scene)
    const p = THREE.MathUtils.clamp(progress.current, 0, 1);
    const target = new THREE.Vector3(-0.6 + p * 1.4, 4.1, 3.3);
    camera.position.lerp(target, 1 - Math.exp(-2 * d));
    camera.lookAt(0.2, 0, -0.5);

    if (pulseRef.current) {
      const s = 1 + ((t * 0.6) % 1) * 2.2;
      pulseRef.current.scale.setScalar(s);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.5 * (1 - ((t * 0.6) % 1));
    }
  });

  return (
    <group>
      <fogExp2 attach="fog" args={[0x07090b, 0.05]} />
      <ambientLight intensity={0.4} />

      <lineSegments geometry={coast}>
        <lineBasicMaterial color={0x8fe3ff} transparent opacity={0.32} />
      </lineSegments>

      {/* HQ — TDR Technology Center, Jakarta */}
      <mesh position={[hqX, 0.015, hqZ]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color={0x8fe3ff} emissive={0x8fe3ff} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh ref={pulseRef} position={[hqX, 0.01, hqZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.095, 40]} />
        <meshBasicMaterial color={0x8fe3ff} transparent opacity={0.5} depthWrite={false} />
      </mesh>

      {COVERAGE.map((c) => {
        const [x, z] = project(c.lon, c.lat);
        return (
          <group key={c.name}>
            <mesh position={[x, 0.012, z]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color={0xaab3bc} metalness={0.8} roughness={0.3} />
            </mesh>
            <CoverageArc from={JAKARTA} to={[c.lon, c.lat]} />
          </group>
        );
      })}

      {/* faint ocean plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color={0x090c10} metalness={0.2} roughness={0.85} />
      </mesh>
    </group>
  );
}
