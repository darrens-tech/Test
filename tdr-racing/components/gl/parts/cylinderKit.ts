import * as THREE from "three";
import { makeMaterials } from "../fx/materials";
import { buildPiston } from "./pillarProps";
import type { PartsBuild } from "./cvt";

/**
 * TDR Racing Cylinder Kit — procedural stand-in matching the supplied render:
 * finned cylinder block · piston · ring set · wrist pin · circlips.
 * Explodes along the bore axis (+Y) with the pin breaking out sideways.
 * Replaced by CAD-derived GLB when it lands (ASSETS.md A-04).
 */

function roundedSquareWithBore(size: number, r: number, bore: number): THREE.Shape {
  const s = new THREE.Shape();
  const h = size / 2;
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h);
  s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r);
  s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r);
  s.quadraticCurveTo(-h, -h, -h + r, -h);
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

export function buildCylinderKit(): PartsBuild {
  const M = makeMaterials();
  const group = new THREE.Group();
  const parts: PartsBuild["parts"] = [];

  const add = (
    id: string,
    obj: THREE.Object3D,
    vector: [number, number, number],
    order: number,
  ) => {
    obj.name = id;
    group.add(obj);
    parts.push({ id, object: obj, vector: new THREE.Vector3(...vector), order });
  };

  // — cylinder block: core + cooling-fin stack + sleeve + stud bores
  const block = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedSquareWithBore(0.78, 0.12, 0.28), {
      depth: 0.55,
      bevelEnabled: false,
    }),
    M.body,
  );
  core.rotation.x = -Math.PI / 2;
  core.position.y = -0.275;
  block.add(core);
  for (let i = 0; i < 6; i++) {
    const fin = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedSquareWithBore(0.92, 0.16, 0.29), {
        depth: 0.02,
        bevelEnabled: false,
      }),
      M.darkSteel,
    );
    fin.rotation.x = -Math.PI / 2;
    fin.position.y = -0.22 + i * 0.085;
    block.add(fin);
  }
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.275, 0.275, 0.58, 40, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x565e66,
      metalness: 0.95,
      roughness: 0.22,
      side: THREE.DoubleSide,
    }),
  );
  block.add(sleeve);
  for (const [x, z] of [
    [0.33, 0.33],
    [-0.33, 0.33],
    [0.33, -0.33],
    [-0.33, -0.33],
  ] as const) {
    const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 12), M.darkSteel);
    stud.position.set(x, 0, z);
    block.add(stud);
  }
  block.position.set(0, -0.15, 0);
  add("block", block, [0, -0.28, 0], 0);

  // — piston (crown just proud of the deck when assembled)
  const piston = buildPiston(M);
  piston.scale.setScalar(0.98);
  piston.position.set(0, 0.02, 0);
  add("piston", piston, [0, 0.62, 0], 1);

  // — ring set: 2 compression + 1 oil
  const ringMats = [M.steel, M.steel, M.darkSteel];
  const rings = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.011, 8, 56, Math.PI * 1.94), ringMats[i]);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = i * 0.8;
    ring.position.y = 0.26 - i * 0.05;
    ring.name = `ring-${i}`;
    rings.add(ring);
  }
  rings.position.set(0, 0.02, 0);
  add("rings", rings, [0, 1.18, 0], 2);

  // — wrist pin breaks out sideways
  const pin = new THREE.Group();
  const pinTube = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.42, 20), M.steel);
  pinTube.rotation.z = Math.PI / 2;
  pin.add(pinTube);
  for (const x of [-0.21, 0.21]) {
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.015, 16), M.body);
    bore.rotation.z = Math.PI / 2;
    bore.position.x = x;
    pin.add(bore);
  }
  pin.position.set(0, 0.04, 0);
  add("pin", pin, [0.85, 0.62, 0], 3);

  // — circlips
  const clips = new THREE.Group();
  for (const x of [-0.3, 0.3]) {
    const clip = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 6, 24, Math.PI * 1.7), M.steel);
    clip.rotation.y = Math.PI / 2;
    clip.position.x = x;
    clips.add(clip);
  }
  clips.position.set(0, 0.04, 0);
  add("clips", clips, [1.3, 0.62, 0], 4);

  group.position.y = -0.1;
  return { group, parts, radius: 1.15 };
}
