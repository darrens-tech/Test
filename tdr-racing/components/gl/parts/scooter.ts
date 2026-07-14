import * as THREE from "three";
import { makeMaterials, type MachinedMaterials } from "../fx/materials";

/**
 * THE MACHINE — procedural stand-in for the hero sport scooter (the market's
 * Vario/Aerox/NMAX class), built from lathe/tube/extrude primitives shaped as
 * the real thing. Dimensionally plausible (wheelbase ~1.35m, 14" wheels).
 * Replaced 1:1 by TDR's commissioned GLB when it lands (ASSETS.md A-01);
 * until then this is real geometry of a real subject — never an abstract prop.
 */

function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  opts: { p?: [number, number, number]; r?: [number, number, number]; s?: number; name?: string } = {},
) {
  const m = new THREE.Mesh(geo, mat);
  if (opts.p) m.position.set(...opts.p);
  if (opts.r) m.rotation.set(...opts.r);
  if (opts.s) m.scale.setScalar(opts.s);
  if (opts.name) m.name = opts.name;
  return m;
}

function wheel(M: MachinedMaterials, radius = 0.295): THREE.Group {
  const g = new THREE.Group();
  // tire
  g.add(mesh(new THREE.TorusGeometry(radius - 0.085, 0.088, 14, 40), M.rubber, { name: "tire" }));
  // U-shape rim: two shallow cones back to back + center hub
  const rimProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    rimProfile.push(new THREE.Vector2(0.055 + t * 0.155, 0.028 - Math.sin(t * Math.PI) * 0.012));
  }
  const rimR = new THREE.LatheGeometry(rimProfile, 32);
  const rim1 = mesh(rimR, M.steel, { r: [Math.PI / 2, 0, 0], name: "rim" });
  const rim2 = mesh(rimR.clone(), M.steel, { r: [-Math.PI / 2, 0, 0] });
  g.add(rim1, rim2);
  // five paired spokes
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    for (const off of [-0.02, 0.02]) {
      const spoke = mesh(new THREE.BoxGeometry(0.03, 0.19, 0.018), M.darkSteel, {
        p: [Math.cos(a) * 0.1, Math.sin(a) * 0.1, off],
        r: [0, 0, a - Math.PI / 2],
      });
      g.add(spoke);
    }
  }
  // hub
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 20), M.steel, { r: [Math.PI / 2, 0, 0] }));
  // brake disc + red caliper (brand pulse)
  g.add(
    mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.006, 40), M.steel, {
      p: [0, 0, 0.055],
      r: [Math.PI / 2, 0, 0],
      name: "disc",
    }),
  );
  return g;
}

/** Front apron + floorboard silhouette, extruded — the scooter's signature mass. */
function apron(M: MachinedMaterials): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(0.1, 0.4);
  s.lineTo(0.42, 0.46);
  s.quadraticCurveTo(0.58, 0.5, 0.62, 0.72);
  s.quadraticCurveTo(0.66, 0.95, 0.56, 1.06);
  s.lineTo(0.47, 1.04);
  s.quadraticCurveTo(0.5, 0.86, 0.44, 0.72);
  s.quadraticCurveTo(0.38, 0.58, 0.16, 0.55);
  s.lineTo(0.1, 0.52);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.15);
  return new THREE.Mesh(geo, M.body);
}

/** Under-seat body + tail unit. */
function tailBody(M: MachinedMaterials): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(0.08, 0.42);
  s.lineTo(0.08, 0.6);
  s.quadraticCurveTo(-0.05, 0.72, -0.3, 0.74);
  s.lineTo(-0.72, 0.68);
  s.quadraticCurveTo(-0.8, 0.66, -0.78, 0.56);
  s.quadraticCurveTo(-0.6, 0.44, -0.34, 0.42);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.13);
  return new THREE.Mesh(geo, M.body);
}

function seat(M: MachinedMaterials): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(0.06, 0.74);
  s.quadraticCurveTo(-0.2, 0.84, -0.5, 0.82);
  s.lineTo(-0.68, 0.76);
  s.quadraticCurveTo(-0.4, 0.72, -0.05, 0.7);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.12);
  return new THREE.Mesh(geo, M.rubber);
}

function helixTube(
  turns: number,
  coilR: number,
  tubeR: number,
  length: number,
): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const N = turns * 16;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * coilR, t * length, Math.sin(a) * coilR));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, tubeR, 8, false);
}

export interface ScooterBuild {
  group: THREE.Group;
  materials: MachinedMaterials;
}

export function buildScooter(): ScooterBuild {
  const M = makeMaterials();
  const g = new THREE.Group();
  g.name = "the-machine";

  // wheels
  const rear = wheel(M);
  rear.position.set(-0.62, 0.295, 0);
  rear.name = "wheel-rear";
  const front = wheel(M);
  front.position.set(0.73, 0.295, 0);
  front.name = "wheel-front";
  g.add(rear, front);

  // bodywork
  g.add(apron(M), tailBody(M), seat(M));

  // steering column + fork
  const colDir = new THREE.Vector3(0.25, 1, 0).normalize();
  const col = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 12), M.darkSteel, {
    p: [0.62, 1.02, 0],
    name: "column",
  });
  col.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), colDir);
  g.add(col);
  for (const z of [-0.08, 0.08]) {
    const fork = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 10), M.steel, {
      p: [0.68, 0.6, z],
      name: "fork",
    });
    fork.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), colDir);
    g.add(fork);
  }

  // handlebar — the fatbar
  const barPts = [
    new THREE.Vector3(0, 0, -0.3),
    new THREE.Vector3(0.02, 0.05, -0.16),
    new THREE.Vector3(0, 0.07, 0),
    new THREE.Vector3(0.02, 0.05, 0.16),
    new THREE.Vector3(0, 0, 0.3),
  ];
  const bar = mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(barPts), 32, 0.0143, 10),
    M.steel,
    { p: [0.72, 1.28, 0], name: "fatbar" },
  );
  g.add(bar);
  for (const z of [-0.28, 0.28]) {
    g.add(
      mesh(new THREE.CylinderGeometry(0.023, 0.023, 0.11, 10), M.rubber, {
        p: [0.72, 1.285, z],
        r: [Math.PI / 2, 0, 0],
        name: "grip",
      }),
    );
  }

  // headlight slit — the machine's one cyan data-light
  g.add(
    mesh(new THREE.BoxGeometry(0.02, 0.05, 0.24), M.hudGlow, {
      p: [0.64, 0.92, 0],
      name: "headlight",
    }),
  );

  // front fender
  const fender = mesh(new THREE.TorusGeometry(0.34, 0.05, 10, 24, 1.7), M.body, {
    p: [0.73, 0.32, 0],
    r: [0, 0, 0.75],
    name: "fender",
  });
  fender.scale.z = 1.6;
  g.add(fender);

  // engine + CVT case (the story block)
  g.add(mesh(new THREE.BoxGeometry(0.44, 0.22, 0.2), M.darkSteel, { p: [-0.32, 0.4, 0], name: "engine" }));
  const cvtCase = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 24), M.steel, {
    p: [-0.45, 0.37, 0.13],
    r: [Math.PI / 2, 0, 0],
    name: "cvt-case",
  });
  cvtCase.scale.x = 1.9;
  g.add(cvtCase);

  // swingarm
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.05, 0.04), M.darkSteel, { p: [-0.48, 0.32, -0.09], name: "swingarm" }));

  // exhaust
  const exPts = [
    new THREE.Vector3(-0.14, 0.34, 0.06),
    new THREE.Vector3(-0.3, 0.28, 0.1),
    new THREE.Vector3(-0.55, 0.3, 0.12),
  ];
  g.add(
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(exPts), 16, 0.03, 10), M.steel, {
      name: "header",
    }),
  );
  const muffler = mesh(new THREE.CapsuleGeometry(0.062, 0.3, 6, 14), M.darkSteel, {
    p: [-0.72, 0.35, 0.13],
    r: [0, 0, Math.PI / 2 - 0.12],
    name: "muffler",
  });
  g.add(muffler);

  // rear shock — red spring, the brand pulse on the machine
  const springGeo = helixTube(6, 0.045, 0.012, 0.24);
  const spring = new THREE.Mesh(springGeo, M.redline);
  spring.position.set(-0.58, 0.42, -0.1);
  spring.rotation.z = 0.5;
  spring.name = "shock-spring";
  g.add(spring);
  const damper = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 10), M.steel, {
    p: [-0.585, 0.55, -0.1],
    r: [0, 0, 0.5],
    name: "damper",
  });
  g.add(damper);

  // front caliper
  g.add(mesh(new THREE.BoxGeometry(0.07, 0.09, 0.05), M.redline, { p: [0.66, 0.2, 0.07], name: "caliper" }));

  // resting height: wheels on y=0
  g.position.y = 0;
  return { group: g, materials: M };
}
