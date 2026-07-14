import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Machined-metal PBR palette. Factory (not singletons) so each canvas/scene
 * owns its instances — clipping planes and fades never leak across scenes.
 * Environment lighting comes from three's bundled RoomEnvironment via PMREM:
 * zero network, no HDR download, self-hosted by construction.
 */
export function attachEnvironment(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  const pmrem = new THREE.PMREMGenerator(gl);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  return () => {
    env.dispose();
    pmrem.dispose();
  };
}

export interface MachinedMaterials {
  body: THREE.MeshStandardMaterial; // graphite paint
  steel: THREE.MeshStandardMaterial; // bright machined alloy
  darkSteel: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  redline: THREE.MeshStandardMaterial; // brand pulse — calipers, springs, CTAs of the machine
  hudGlow: THREE.MeshStandardMaterial; // cyan emissive — data light only
  all: THREE.MeshStandardMaterial[];
}

export function makeMaterials(): MachinedMaterials {
  const body = new THREE.MeshStandardMaterial({
    color: 0x232a33,
    metalness: 0.75,
    roughness: 0.38,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0xaab3bc,
    metalness: 0.95,
    roughness: 0.28,
  });
  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x3a434d,
    metalness: 0.9,
    roughness: 0.42,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x0c0f12,
    metalness: 0.0,
    roughness: 0.95,
  });
  const redline = new THREE.MeshStandardMaterial({
    color: 0xe1231d,
    metalness: 0.55,
    roughness: 0.35,
    emissive: 0x350605,
  });
  const hudGlow = new THREE.MeshStandardMaterial({
    color: 0x0a141a,
    metalness: 0.2,
    roughness: 0.6,
    emissive: 0x8fe3ff,
    emissiveIntensity: 0.9,
  });
  const all = [body, steel, darkSteel, rubber, redline, hudGlow];
  return { body, steel, darkSteel, rubber, redline, hudGlow, all };
}

export const HUD_CYAN = new THREE.Color(0x8fe3ff);
export const REDLINE = new THREE.Color(0xe1231d);
