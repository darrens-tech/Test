"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { usePathname } from "next/navigation";
import { MachineScene } from "./scenes/MachineScene";
import { WorkshopScene } from "./scenes/WorkshopScene";
import { TrackScene } from "./scenes/TrackScene";
import { ArchipelagoScene } from "./scenes/ArchipelagoScene";
import { attachEnvironment } from "./fx/materials";

/**
 * The persistent Tier-1 canvas behind the app. One WebGL context; scenes swap
 * inside it as routes change (wireframe handshake on entry), so navigation
 * never rebuilds the context. PDP routes don't mount this — their inline
 * exploded viewport is the only live context there (one context at a time).
 */

export function routeScene(pathname: string): string | null {
  const p = pathname.replace(/^\/id(?=\/|$)/, "") || "/";
  if (p === "/") return "home";
  if (p === "/technology") return "workshop";
  if (p === "/racing") return "track";
  if (p === "/where-to-buy") return "archipelago";
  return null;
}

/** Demote to Tier 2 after a full 3s window under 24fps (brief §5). */
function Watchdog({ onDemote }: { onDemote: (reason: string) => void }) {
  const acc = useRef({ frames: 0, time: 0, fired: false });
  useFrame((_, delta) => {
    const a = acc.current;
    if (a.fired || document.hidden) return;
    a.frames += 1;
    a.time += Math.min(delta, 0.25);
    if (a.time >= 3) {
      const fps = a.frames / a.time;
      if (fps < 24) {
        a.fired = true;
        onDemote(`sustained ${Math.round(fps)}fps`);
      }
      a.frames = 0;
      a.time = 0;
    }
  });
  return null;
}

/** Signals the DOM (hero poster fade) once the first frame has rendered. */
function GlLive() {
  const fired = useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      window.dispatchEvent(new Event("tdr:gl-live"));
    }
  });
  return null;
}

function ContextGuard({ onDemote }: { onDemote: (reason: string) => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    let lostOnce = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      if (lostOnce) onDemote("context lost");
      lostOnce = true;
    };
    const onRestored = () => {
      /* silent recovery — poster stays behind the canvas regardless */
    };
    el.addEventListener("webglcontextlost", onLost);
    el.addEventListener("webglcontextrestored", onRestored);
    return () => {
      el.removeEventListener("webglcontextlost", onLost);
      el.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [gl, onDemote]);
  return null;
}

export default function GLRoot({ onDemote }: { onDemote: (reason: string) => void }) {
  const pathname = usePathname();
  const scene = routeScene(pathname);

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 38, position: [2.2, 1.05, 3.2], near: 0.1, far: 60 }}
      frameloop={scene ? "always" : "never"}
      style={{ opacity: scene ? 1 : 0, transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1)" }}
      onCreated={({ gl, scene: s }) => {
        gl.localClippingEnabled = true;
        attachEnvironment(gl, s);
      }}
    >
      <Watchdog onDemote={onDemote} />
      <ContextGuard onDemote={onDemote} />
      <GlLive />
      <Suspense fallback={null}>
        {scene === "home" && <MachineScene />}
        {scene === "workshop" && <WorkshopScene />}
        {scene === "track" && <TrackScene />}
        {scene === "archipelago" && <ArchipelagoScene />}
      </Suspense>
    </Canvas>
  );
}
