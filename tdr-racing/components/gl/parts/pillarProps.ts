import * as THREE from "three";
import type { MachinedMaterials } from "../fx/materials";

/**
 * The four pillar props for the home chapter — each a real TDR part family:
 * Power → piston · Handling → floating brake disc · Style → helmet ·
 * Maintenance → oil bottle. All lathe/primitive stand-ins pending real GLBs
 * (ASSETS.md A-05..A-08); no abstract geometry.
 */

export function buildPiston(M: MachinedMaterials): THREE.Group {
  const g = new THREE.Group();
  const crown: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.3),
    new THREE.Vector2(0.2, 0.295),
    new THREE.Vector2(0.26, 0.28),
    new THREE.Vector2(0.265, 0.14),
    new THREE.Vector2(0.25, 0.12),
    new THREE.Vector2(0.25, -0.02),
    new THREE.Vector2(0.24, -0.16),
    new THREE.Vector2(0.2, -0.2),
  ];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(crown, 36), M.steel));
  // ring grooves as dark tori
  for (const y of [0.24, 0.19, 0.14]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.008, 8, 40), M.darkSteel);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  // wrist pin
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 16), M.darkSteel);
  pin.rotation.z = Math.PI / 2;
  pin.position.y = 0.02;
  g.add(pin);
  return g;
}

export function buildBrakeDisc(M: MachinedMaterials): THREE.Group {
  const g = new THREE.Group();
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.014, 56), M.steel);
  rotor.rotation.x = Math.PI / 2;
  g.add(rotor);
  const carrier = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32), M.redline);
  carrier.rotation.x = Math.PI / 2;
  g.add(carrier);
  // floating buttons
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), M.darkSteel);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0);
    g.add(btn);
  }
  return g;
}

export function buildHelmet(M: MachinedMaterials): THREE.Group {
  const g = new THREE.Group();
  const shellPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = (i / 14) * Math.PI * 0.62;
    shellPts.push(new THREE.Vector2(Math.sin(t) * 0.42, Math.cos(t) * 0.46));
  }
  const shell = new THREE.Mesh(new THREE.LatheGeometry(shellPts, 36), M.body);
  g.add(shell);
  // visor slot
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 12, -0.9, 1.8, 1.15, 0.5), M.hudGlow);
  visor.scale.setScalar(1.02);
  g.add(visor);
  // red stripe over the crown
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 40, Math.PI * 0.62), M.redline);
  stripe.rotation.z = Math.PI / 2 - 0.3;
  stripe.rotation.y = Math.PI / 2;
  g.add(stripe);
  return g;
}

export function buildOilBottle(M: MachinedMaterials): THREE.Group {
  const g = new THREE.Group();
  const body: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -0.45),
    new THREE.Vector2(0.21, -0.45),
    new THREE.Vector2(0.23, -0.4),
    new THREE.Vector2(0.23, 0.18),
    new THREE.Vector2(0.15, 0.3),
    new THREE.Vector2(0.09, 0.36),
    new THREE.Vector2(0.09, 0.44),
    new THREE.Vector2(0.0, 0.44),
  ];
  g.add(new THREE.Mesh(new THREE.LatheGeometry(body, 28), M.body));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.09, 20), M.redline);
  cap.position.y = 0.47;
  g.add(cap);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.3, 28, 1, true), M.steel);
  label.position.y = -0.12;
  g.add(label);
  return g;
}
