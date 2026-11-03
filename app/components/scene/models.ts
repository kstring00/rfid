import * as THREE from "three";

/* Shared helpers for the hero scene. All colors are written in sRGB and converted to linear. */

const INK = "#21503a";
// three.js color management already treats hex colors as sRGB.
export const lin = (c: THREE.ColorRepresentation) => new THREE.Color(c);
export const M = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: lin(color), roughness: 0.75, metalness: 0, ...o });

function cnv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}
function asterisk(g: CanvasRenderingContext2D, x: number, y: number, r: number, lw: number) {
  g.save();
  g.translate(x, y);
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    g.rotate(Math.PI / 3);
    g.beginPath();
    g.moveTo(0, -r);
    g.lineTo(0, r);
    g.stroke();
  }
  g.restore();
}
function rrPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function qr(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const n = 21,
    c = s / n;
  g.fillStyle = "#fff";
  g.fillRect(x - c, y - c, s + 2 * c, s + 2 * c);
  g.fillStyle = "#1c2a22";
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const finder = (i < 7 && j < 7) || (i > n - 8 && j < 7) || (i < 7 && j > n - 8);
      if (!finder && rnd() > 0.52) g.fillRect(x + i * c, y + j * c, c, c);
    }
  for (const [a, b] of [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ]) {
    g.fillRect(x + a * c, y + b * c, 7 * c, 7 * c);
    g.fillStyle = "#fff";
    g.fillRect(x + (a + 1) * c, y + (b + 1) * c, 5 * c, 5 * c);
    g.fillStyle = "#1c2a22";
    g.fillRect(x + (a + 2) * c, y + (b + 2) * c, 3 * c, 3 * c);
  }
}
function phoneIcon(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.strokeStyle = INK;
  g.lineWidth = s * 0.09;
  g.lineCap = "round";
  rrPath(g, x - s * 0.22, y - s * 0.38, s * 0.44, s * 0.76, s * 0.08);
  g.stroke();
  for (let i = 1; i <= 2; i++) {
    g.beginPath();
    g.arc(x + s * 0.25, y, s * 0.18 * i, -0.7, 0.7);
    g.stroke();
    g.beginPath();
    g.arc(x - s * 0.25, y, s * 0.18 * i, Math.PI - 0.7, Math.PI + 0.7);
    g.stroke();
  }
}

export type Textures = { big: THREE.Texture; mini: THREE.Texture; tag: THREE.Texture; blob: THREE.Texture };

export function makeTextures(): Textures {
  const badgeTex = (big: boolean) => {
    const [c, g] = cnv(512, 512);
    const grd = g.createRadialGradient(220, 200, 40, 256, 256, 256);
    grd.addColorStop(0, "#f6efde");
    grd.addColorStop(1, "#ddd3bb");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(256, 256, 256, 0, Math.PI * 2);
    g.fill();
    g.textAlign = "center";
    g.fillStyle = INK;
    if (big) {
      asterisk(g, 256, 92, 46, 15);
      phoneIcon(g, 256, 180, 82);
      g.font = "800 34px Figtree, sans-serif";
      g.fillText("Tap or scan to meet me", 256, 262);
      qr(g, 206, 284, 100);
      g.font = "700 27px Figtree, sans-serif";
      g.fillText("introband.com/K7Q2", 256, 440);
    } else {
      asterisk(g, 256, 170, 80, 26);
      g.font = "800 74px Figtree, sans-serif";
      g.fillText("Tap me", 256, 340);
      g.font = "700 46px Figtree, sans-serif";
      g.fillText("K7Q2", 256, 410);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const tagTex = () => {
    const [c, g] = cnv(256, 256);
    g.fillStyle = "#ece3cc";
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = `rgba(120,100,70,${Math.random() * 0.08})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    g.setLineDash([10, 8]);
    g.strokeStyle = "#8b7d62";
    g.lineWidth = 4;
    g.strokeRect(14, 14, 228, 228);
    g.setLineDash([]);
    asterisk(g, 128, 96, 40, 13);
    g.fillStyle = INK;
    g.textAlign = "center";
    g.font = "800 40px Figtree, sans-serif";
    g.fillText("Tap me", 128, 180);
    g.font = "700 26px Figtree, sans-serif";
    g.fillText("K7Q2", 128, 214);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const blobTex = () => {
    const [c, g] = cnv(128, 128);
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(0,0,0,.6)");
    r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  };
  return { big: badgeTex(true), mini: badgeTex(false), tag: tagTex(), blob: blobTex() };
}

export function noiseTex(scale: number) {
  const [c, g] = cnv(256, 256);
  const d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255 * scale;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

function rrShape(w: number, h: number, r: number) {
  const s = new THREE.Shape(),
    x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function rbox(w: number, h: number, d: number, b: number, r: number, mat: THREE.Material) {
  const g = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, r), {
    depth: Math.max(d - 2 * b, 0.01),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 5,
    curveSegments: 10,
  });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return new THREE.Mesh(g, mat);
}

/** A small badge facing +z. */
function badge(T: Textures, radius: number, big: boolean) {
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.02, radius * 0.22, 48), M(0xe9e0c8, { roughness: 0.35 }));
  cyl.rotation.x = Math.PI / 2;
  g.add(cyl);
  const face = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.985, 64), new THREE.MeshStandardMaterial({ map: big ? T.big : T.mini, roughness: 0.28 }));
  face.position.z = radius * 0.111;
  g.add(face);
  return g;
}

/* Every model sits on y=0 and stores its height in userData.top. */

export function makeShoeFallback() {
  const g = new THREE.Group();
  const upper = M(0x3a5a3f, { roughness: 0.9 }),
    sole = M(0xe8e0cc, { roughness: 0.6 });
  const body = rbox(2.4, 0.9, 0.9, 0.25, 0.35, upper);
  body.position.y = 0.6;
  g.add(body);
  const s = rbox(2.55, 0.26, 0.95, 0.06, 0.1, sole);
  s.position.y = 0.13;
  g.add(s);
  g.userData.top = 1.4;
  return g;
}

export function makeBag(T: Textures) {
  const g = new THREE.Group();
  const main = M(0x2f5a40, { roughness: 0.92 }),
    dark = M(0x244634, { roughness: 0.95 }),
    mesh = M(0x6f8f3d, { roughness: 0.9 }),
    metal = M(0x9a8a63, { metalness: 0.7, roughness: 0.35 });
  const body = rbox(1.55, 1.95, 0.85, 0.18, 0.28, main);
  body.position.y = 1.05;
  g.add(body);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.78, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), main);
  top.scale.set(0.98, 0.38, 0.52);
  top.position.y = 1.98;
  g.add(top);
  const pocket = rbox(1.18, 0.82, 0.32, 0.08, 0.18, dark);
  pocket.position.set(0, 0.62, 0.47);
  g.add(pocket);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.03), metal);
  zip.position.set(0, 1.0, 0.64);
  g.add(zip);
  const pull = rbox(0.06, 0.2, 0.03, 0.01, 0.02, metal);
  pull.position.set(0.38, 0.92, 0.65);
  g.add(pull);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 10, 24, Math.PI), dark);
  handle.position.set(0, 2.16, -0.05);
  g.add(handle);
  for (const x of [-0.48, 0.48]) {
    const st = rbox(0.2, 1.9, 0.07, 0.02, 0.05, dark);
    st.position.set(x, 1.1, -0.47);
    g.add(st);
  }
  const side = rbox(0.18, 0.8, 0.66, 0.06, 0.08, mesh);
  side.position.set(0.82, 0.6, 0);
  g.add(side);
  const bd = badge(T, 0.3, false);
  bd.position.set(0.2, 1.55, 0.44);
  g.add(bd);
  g.userData.top = 2.4;
  return g;
}

export function makeExploded(T: Textures) {
  const g = new THREE.Group();
  const tilt = -Math.PI / 2 + 0.85;
  const layers: THREE.Group[] = [];
  const mk = (obj: THREE.Object3D, y: number) => {
    const h = new THREE.Group();
    h.add(obj);
    obj.rotation.x = tilt;
    h.position.y = y;
    h.userData.base = y;
    g.add(h);
    layers.push(h);
  };
  const R = 0.78;
  const domeG = new THREE.SphereGeometry(R, 48, 16, 0, Math.PI * 2, 0, 0.62);
  domeG.rotateX(Math.PI / 2);
  domeG.scale(1, 1, 0.5);
  const dome = new THREE.Mesh(domeG, new THREE.MeshStandardMaterial({ color: 0xf0fff6, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.32, side: THREE.DoubleSide }));
  const face = new THREE.Group();
  const fc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.08, 64), M(0xe7dec6, { roughness: 0.4 }));
  fc.rotation.x = Math.PI / 2;
  face.add(fc);
  const ff = new THREE.Mesh(new THREE.CircleGeometry(R * 0.99, 64), new THREE.MeshStandardMaterial({ map: T.big, roughness: 0.3 }));
  ff.position.z = 0.041;
  face.add(ff);
  const coil = new THREE.Group();
  const cu = M(0xc07a45, { metalness: 1, roughness: 0.32 });
  for (let i = 0; i < 6; i++) coil.add(new THREE.Mesh(new THREE.TorusGeometry(0.48 + i * 0.045, 0.012, 6, 72), cu));
  const chip = rbox(0.26, 0.16, 0.04, 0.008, 0.02, M(0x1b1f1d, { roughness: 0.4, metalness: 0.3 }));
  chip.position.set(0.55, -0.2, 0.02);
  chip.rotation.z = -0.4;
  coil.add(chip);
  const lathe = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.72, 0),
      new THREE.Vector2(0.78, 0.04),
      new THREE.Vector2(0.8, 0.2),
      new THREE.Vector2(0.74, 0.22),
      new THREE.Vector2(0.7, 0.07),
      new THREE.Vector2(0, 0.07),
    ],
    64,
  );
  lathe.rotateX(Math.PI / 2);
  const back = new THREE.Mesh(lathe, M(0x5f8d6b, { roughness: 0.55 }));
  mk(back, 0.55);
  mk(coil, 1.35);
  mk(face, 2.15);
  mk(dome, 2.85);
  const lineG = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 3.4, 0)]);
  const line = new THREE.Line(lineG, new THREE.LineDashedMaterial({ color: 0xf1ead9, dashSize: 0.06, gapSize: 0.06, transparent: true, opacity: 0.55 }));
  line.computeLineDistances();
  g.add(line);
  g.userData.top = 3.6;
  g.userData.layers = layers;
  return g;
}

export function makeFidget(T: Textures) {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const mat = M(0x3f7a52, { roughness: 0.45 });
  inner.add(new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.14, 64), mat));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 12, 64), mat);
  rim.rotation.x = Math.PI / 2;
  inner.add(rim);
  const bub = new THREE.SphereGeometry(0.12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [r, n] of [
    [0.42, 8],
    [0.72, 14],
  ]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const m = new THREE.Mesh(bub, mat);
      m.position.set(Math.cos(a) * r, 0.07, Math.sin(a) * r);
      m.scale.y = 0.9;
      inner.add(m);
    }
  }
  const bd = badge(T, 0.24, false);
  bd.rotation.x = -Math.PI / 2;
  bd.position.y = 0.1;
  inner.add(bd);
  inner.rotation.x = Math.PI / 2 - 0.28;
  inner.position.y = 0.92;
  g.userData.top = 1.95;
  return g;
}

export function makeBear(T: Textures) {
  const g = new THREE.Group();
  const fur = M(0x8a5f3a, { roughness: 1, bumpMap: noiseTex(0.9), bumpScale: 0.035 }),
    light = M(0xc49a6c, { roughness: 1, bumpMap: noiseTex(0.7), bumpScale: 0.025 }),
    black = M(0x161210, { roughness: 0.25 });
  const S = (r: number, mat: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    g.add(m);
    return m;
  };
  S(0.62, fur, 0, 0.72, 0, 1, 1.08, 0.9);
  S(0.48, fur, 0, 1.62, 0.02);
  S(0.17, fur, -0.36, 1.98, 0, 1, 1, 0.7);
  S(0.17, fur, 0.36, 1.98, 0, 1, 1, 0.7);
  S(0.09, light, -0.36, 1.98, 0.06, 1, 1, 0.5);
  S(0.09, light, 0.36, 1.98, 0.06, 1, 1, 0.5);
  S(0.2, light, 0, 1.52, 0.38, 1.1, 0.85, 0.9);
  S(0.065, black, 0, 1.6, 0.56, 1.2, 0.8, 0.8);
  S(0.05, black, -0.17, 1.72, 0.42);
  S(0.05, black, 0.17, 1.72, 0.42);
  S(0.2, fur, -0.6, 0.95, 0.15, 0.85, 1.35, 0.85).rotation.z = 0.5;
  S(0.2, fur, 0.6, 0.95, 0.15, 0.85, 1.35, 0.85).rotation.z = -0.5;
  S(0.24, fur, -0.32, 0.25, 0.42, 1, 0.85, 1.25);
  S(0.24, fur, 0.32, 0.25, 0.42, 1, 0.85, 1.25);
  S(0.14, light, -0.32, 0.25, 0.7, 1, 1, 0.35);
  S(0.14, light, 0.32, 0.25, 0.7, 1, 1, 0.35);
  const edge = M(0xe2d8bf);
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.025), [edge, edge, edge, edge, new THREE.MeshStandardMaterial({ map: T.tag, roughness: 0.9 }), edge]);
  tag.position.set(0.2, 0.95, 0.56);
  tag.rotation.set(-0.12, 0.18, -0.1);
  g.add(tag);
  g.userData.top = 2.35;
  return g;
}

export function makePhones(T: Textures) {
  const g = new THREE.Group();
  const band = M(0x4b7a5c, { roughness: 0.5 }),
    cushion = M(0x24382c, { roughness: 0.9 }),
    cup = M(0x3f6a4f, { roughness: 0.45 });
  const b = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.075, 16, 64, Math.PI), band);
  b.position.y = 1.05;
  b.scale.z = 1.6;
  g.add(b);
  const pad = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.06, 12, 48, Math.PI * 0.6), cushion);
  pad.position.y = 1.05;
  pad.rotation.z = Math.PI * 0.2;
  g.add(pad);
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.26, 40), cup);
    c.rotation.z = Math.PI / 2;
    c.position.set(sx * 0.84, 0.62, 0);
    g.add(c);
    const cu = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.09, 14, 40), cushion);
    cu.rotation.y = Math.PI / 2;
    cu.position.set(sx * 0.7, 0.62, 0);
    g.add(cu);
    const yk = rbox(0.1, 0.5, 0.12, 0.03, 0.03, band);
    yk.position.set(sx * 0.86, 1.0, 0);
    g.add(yk);
  }
  const bd = badge(T, 0.22, false);
  bd.position.set(0, 1.88, 0.05);
  bd.rotation.x = -0.15;
  g.add(bd);
  g.userData.top = 2.3;
  return g;
}

export function makeRock() {
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const p = geo.attributes.position,
    v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.12 * Math.sin(v.x * 5.1) * Math.cos(v.z * 4.3) + 0.06 * Math.sin(v.y * 9 + v.x * 3);
    v.multiplyScalar(n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M(0x2b3129, { roughness: 0.95, bumpMap: noiseTex(1), bumpScale: 0.06 }));
  m.scale.set(9.5, 0.7, 3.6);
  m.position.y = -0.62;
  m.receiveShadow = true;
  return m;
}

export function makeMoss() {
  const n = 260,
    geo = new THREE.SphereGeometry(0.09, 8, 6),
    mat = M(0x4e7a32, { roughness: 1 });
  const im = new THREE.InstancedMesh(geo, mat, n),
    d = new THREE.Object3D(),
    col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2,
      r = 0.75 + Math.random() * 0.3;
    d.position.set(Math.cos(a) * 9.2 * r, -0.05 - Math.random() * 0.15 - (r - 0.75) * 0.9, Math.sin(a) * 3.4 * r);
    const s = 0.35 + Math.random() * 0.9;
    d.scale.set(s, s * 0.55, s);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    col.setHSL(0.27 + Math.random() * 0.05, 0.45, 0.22 + Math.random() * 0.12, THREE.SRGBColorSpace);
    im.setColorAt(i, col);
  }
  im.receiveShadow = true;
  return im;
}

export function makeFlies() {
  const n = 70,
    pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 20;
    pos[i * 3 + 1] = Math.random() * 6 + 0.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffd98a, size: 0.06, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
}

/** A soft, rounded display plinth. Top surface sits at y = height. */
export function makePedestal(radius: number, height: number, color: THREE.ColorRepresentation) {
  const g = new THREE.Group();
  const r = radius,
    b = 0.08;
  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(r * 1.04, 0),
    new THREE.Vector2(r * 1.06, 0.03),
    new THREE.Vector2(r, height - b),
    new THREE.Vector2(r - b * 0.3, height - b * 0.3),
    new THREE.Vector2(r - b, height),
    new THREE.Vector2(0, height),
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), M(color, { roughness: 0.62, bumpMap: noiseTex(0.25), bumpScale: 0.004 }));
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  // Glow ring on the top edge, brightened when the item is chosen.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(r - b * 0.6, 0.012, 8, 96),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb766"), transparent: true, opacity: 0 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = height + 0.004;
  g.add(ring);
  g.userData.ring = ring;
  g.userData.height = height;
  return g;
}

/** Invisible floor that only shows shadows, so the scene floats on the page color. */
export function makeShadowCatcher() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.ShadowMaterial({ color: new THREE.Color("#6b4a2a"), opacity: 0.22 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}
