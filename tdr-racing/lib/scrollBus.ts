"use client";

/**
 * Tiny typed pub/sub linking DOM ScrollTriggers to GL scenes without React
 * re-renders. DOM chapters emit progress; scenes read it in useFrame.
 */
export interface SceneMessage {
  scene: "home" | "workshop" | "track" | "archipelago";
  /** overall scene progress 0..1 (dolly position, intro resolve, …) */
  progress?: number;
  /** active chapter index for chaptered scenes (-1 = pre-chapter) */
  chapter?: number;
  /** progress within the active chapter 0..1 */
  chapterProgress?: number;
}

type Listener = (m: SceneMessage) => void;
const listeners = new Set<Listener>();
const last = new Map<SceneMessage["scene"], SceneMessage>();

export function emitScene(m: SceneMessage) {
  last.set(m.scene, { ...last.get(m.scene), ...m });
  for (const fn of listeners) fn(m);
}

// QA/media-pipeline hook: lets the headless renderer drive scenes directly
// (qa/render-media.mjs). Harmless in production — it's the same public API.
if (typeof window !== "undefined") {
  (window as unknown as { __tdrEmit?: typeof emitScene }).__tdrEmit = emitScene;
}

export function onScene(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function lastScene(scene: SceneMessage["scene"]): SceneMessage | undefined {
  return last.get(scene);
}
