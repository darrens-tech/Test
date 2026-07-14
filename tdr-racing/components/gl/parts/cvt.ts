import * as THREE from "three";
import { makeMaterials } from "../fx/materials";

/**
 * TDR Racing CVT Set — procedural stand-in matching the supplied product
 * render: drive face (fan) · belt · sliding sheave with rollers · secondary
 * sheave · torque spring · 3-shoe clutch carrier · clutch bell. Explodes in
 * one row along +X exactly like the reference shot. Replaced by CAD-derived
 * GLB when it lands (ASSETS.md A-03).
 */

export interface ExplodedPart {
  id: string;
  object: THREE.Object3D;
  /** authored explode vector (world units at p=1) */
  vector: THREE.Vector3;
  /** stagger order for the scroll bands */
  order: number;
}

export interface PartsBuild {
  group: THREE.Group;
  parts: ExplodedPart[];
  /** camera framing hints */
  radius: number;
}

function lathe(points: [number, number][], mat: THREE.Material, segs = 48) {
  return new THREE.Mesh(
    new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segs),
    mat,
  );
}

export function buildCvtSet(): PartsBuild {
  const M = makeMaterials();
  const group = new THREE.Group();
  const parts: ExplodedPart[] = [];

  const add = (id: string, obj: THREE.Object3D, vector: [number, number, number], order: number) => {
    obj.name = id;
    group.add(obj);
    parts.push({ id, object: obj, vector: new THREE.Vector3(...vector), order });
  };

  // — drive face: cooling-fan cone, fins radiating (axis X)
  const face = new THREE.Group();
  const faceCone = lathe(
    [[0.05, 0], [0.5, 0.02], [0.52, 0.05], [0.1, 0.16], [0.05, 0.16]],
    M.steel,
  );
  faceCone.rotation.z = -Math.PI / 2;
  face.add(faceCone);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.03), M.steel);
    fin.position.set(-0.1, Math.cos(a) * 0.3, Math.sin(a) * 0.3);
    fin.rotation.x = -a;
    face.add(fin);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16), M.darkSteel);
  hub.rotation.z = Math.PI / 2;
  face.add(hub);
  face.position.set(-0.85, 0, 0);
  add("face", face, [-1.35, 0, 0], 0);

  // — sliding sheave + rollers
  const sheave = new THREE.Group();
  const cone = lathe(
    [[0.06, 0], [0.5, 0.02], [0.52, 0.06], [0.34, 0.1], [0.3, 0.16], [0.06, 0.16]],
    M.steel,
  );
  cone.rotation.z = Math.PI / 2;
  sheave.add(cone);
  const ramp = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 32), M.darkSteel);
  ramp.rotation.z = Math.PI / 2;
  ramp.position.x = 0.14;
  sheave.add(ramp);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 14), M.darkSteel);
    roller.position.set(0.1, Math.cos(a) * 0.21, Math.sin(a) * 0.21);
    roller.rotation.x = a + Math.PI / 2;
    sheave.add(roller);
  }
  sheave.position.set(-0.52, 0, 0);
  add("sheave", sheave, [-0.62, 0, 0], 1);

  // — belt: flattened torus around the primary, hangs like the reference
  const beltGroup = new THREE.Group();
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.052, 4, 64), M.rubber);
  belt.scale.z = 1.6;
  belt.rotation.y = Math.PI / 2;
  beltGroup.add(belt);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.615, 0.008, 4, 64), M.hudGlow);
  stripe.rotation.y = Math.PI / 2;
  beltGroup.add(stripe);
  beltGroup.position.set(-0.68, -0.05, 0);
  add("belt", beltGroup, [-0.25, -0.72, 0.15], 2);

  // — secondary sheave pair
  const secondary = new THREE.Group();
  const s1 = lathe([[0.07, 0], [0.44, 0.02], [0.46, 0.05], [0.09, 0.14], [0.07, 0.14]], M.steel);
  s1.rotation.z = -Math.PI / 2;
  const s2 = lathe([[0.07, 0], [0.44, 0.02], [0.46, 0.05], [0.09, 0.14], [0.07, 0.14]], M.steel);
  s2.rotation.z = Math.PI / 2;
  s2.position.x = 0.16;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 16), M.darkSteel);
  sleeve.rotation.z = Math.PI / 2;
  sleeve.position.x = 0.08;
  secondary.add(s1, s2, sleeve);
  secondary.position.set(0.28, 0, 0);
  add("secondary", secondary, [0.35, 0, 0], 3);

  // — torque spring (red — the brand pulse of the exploded row)
  const springPts: THREE.Vector3[] = [];
  const TURNS = 7;
  for (let i = 0; i <= TURNS * 16; i++) {
    const t = i / (TURNS * 16);
    const a = t * TURNS * Math.PI * 2;
    springPts.push(new THREE.Vector3(t * 0.3, Math.cos(a) * 0.17, Math.sin(a) * 0.17));
  }
  const spring = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPts), TURNS * 16, 0.026, 8),
    M.redline,
  );
  spring.position.set(0.5, 0, 0);
  add("spring", spring, [0.85, 0, 0], 4);

  // — 3-shoe clutch carrier
  const carrier = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.045, 32), M.darkSteel);
  plate.rotation.z = Math.PI / 2;
  carrier.add(plate);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const arc = new THREE.Shape();
    arc.absarc(0, 0, 0.4, a + 0.18, a + Math.PI * 0.55, false);
    arc.absarc(0, 0, 0.3, a + Math.PI * 0.55, a + 0.18, true);
    const shoe = new THREE.Mesh(
      new THREE.ExtrudeGeometry(arc, { depth: 0.08, bevelEnabled: false }),
      M.rubber,
    );
    shoe.rotation.y = Math.PI / 2;
    shoe.position.x = -0.04;
    carrier.add(shoe);
    const cspring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 16), M.redline);
    cspring.position.set(0.045, Math.cos(a + 1.5) * 0.18, Math.sin(a + 1.5) * 0.18);
    cspring.rotation.y = Math.PI / 2;
    carrier.add(cspring);
  }
  carrier.position.set(0.95, 0, 0);
  add("carrier", carrier, [1.4, 0, 0], 5);

  // — clutch bell: vented cup
  const bell = new THREE.Group();
  const cup = lathe(
    [[0.08, 0], [0.42, 0.0], [0.44, 0.03], [0.44, 0.3], [0.42, 0.32], [0.4, 0.3], [0.4, 0.05], [0.08, 0.05]],
    M.darkSteel,
  );
  cup.rotation.z = Math.PI / 2;
  bell.add(cup);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const vent = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.1, 4, 10), M.body);
    vent.position.set(0.02, Math.cos(a) * 0.28, Math.sin(a) * 0.28);
    vent.rotation.x = a;
    vent.rotation.z = 0.5;
    bell.add(vent);
  }
  const bellHub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16), M.steel);
  bellHub.rotation.z = Math.PI / 2;
  bellHub.position.x = -0.02;
  bell.add(bellHub);
  bell.position.set(1.4, 0, 0);
  add("bell", bell, [2.05, 0, 0], 6);

  group.position.x = -0.15; // visual centring of the assembled cluster
  return { group, parts, radius: 1.35 };
}
