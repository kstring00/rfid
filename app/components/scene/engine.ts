import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ITEMS, type ItemId } from "@/lib/items";
import { makeBag, makeBear, makeExploded, makeFidget, makePedestal, makePhones, makeShadowCatcher, makeShoeFallback, makeTextures } from "./models";
import { ease, LIFT, LIFT_MS } from "./motion";

/*
 * The 3D stage. It only draws: it never decides what is selected.
 * The React component owns selection and tells the stage what to show via setShown().
 *
 * Hit-testing uses fixed screen zones (one per item) that never move with the lift
 * animation, so the thing under a still cursor never changes.
 */

type Slot = { x: number; z: number; h: number; r: number };
const ROT: Record<ItemId, number> = { shoe: -0.5, bag: 0.3, badge: 0, fidget: -0.2, plush: -0.3, phones: -0.45 };
const SCALE: Record<ItemId, number> = { shoe: 0.95, bag: 0.85, badge: 0.9, fidget: 0.95, plush: 0.95, phones: 0.95 };
const WIDE: Record<ItemId, Slot> = {
  shoe: { x: -5.5, z: 0.4, h: 0.45, r: 1.45 },
  bag: { x: -3.1, z: -0.5, h: 0.75, r: 1.05 },
  badge: { x: 0, z: -0.9, h: 1.05, r: 1.0 },
  fidget: { x: 2.45, z: -0.5, h: 0.75, r: 1.0 },
  plush: { x: 4.35, z: -0.1, h: 0.55, r: 0.95 },
  phones: { x: 6.2, z: 0.45, h: 0.4, r: 1.05 },
};
const NARROW: Record<ItemId, Slot> = {
  bag: { x: -2.05, z: -2.2, h: 0.75, r: 0.95 },
  badge: { x: 0, z: -2.6, h: 1.0, r: 0.9 },
  plush: { x: 2.05, z: -2.2, h: 0.75, r: 0.9 },
  shoe: { x: -2.05, z: 1.2, h: 0.35, r: 1.25 },
  fidget: { x: 0, z: 1.0, h: 0.45, r: 0.95 },
  phones: { x: 2.05, z: 1.2, h: 0.35, r: 1.0 },
};
const PLINTH: Record<ItemId, string> = { shoe: "#ead7bd", bag: "#e6cfb1", badge: "#f1e2cc", fidget: "#e9d3b6", plush: "#e3caa9", phones: "#ecdac2" };

type Obj = {
  id: ItemId;
  holder: THREE.Group;
  model: THREE.Group;
  plinth: THREE.Group;
  top: number;
  slot: Slot;
  lift: { from: number; to: number; start: number };
  delay: number;
};

export type ScreenBox = { left: number; right: number; top: number; bottom: number; anchorX: number; anchorY: number };

export type EngineOptions = {
  mode: "page" | "pitch";
  reducedMotion: boolean;
  onFirstFrame?: () => void;
};

export class HeroEngine {
  private container: HTMLElement;
  private opts: EngineOptions;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private objs = {} as Record<ItemId, Obj>;
  private badgeLayers: THREE.Group[] = [];
  private spot: THREE.SpotLight;
  private raf = 0;
  private running = false;
  private disposed = false;
  private firstFrame = false;
  private narrow = false;
  private shown: ItemId | null = null;
  private parallaxOn = true;
  private par = { x: 0, y: 0 };
  private camBase = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private lookAt = new THREE.Vector3();
  private v = new THREE.Vector3();
  private t0 = performance.now();
  private ro: ResizeObserver;
  private frameListeners = new Set<() => void>();

  constructor(container: HTMLElement, opts: EngineOptions) {
    this.container = container;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const c = this.renderer.domElement;
    c.setAttribute("aria-hidden", "true");
    Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block", touchAction: "pan-y" });
    container.prepend(c);

    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const S = this.scene;
    S.add(new THREE.HemisphereLight(0xfff1dc, 0xd8b48c, 1.15 * Math.PI));
    const sun = new THREE.DirectionalLight(0xffd6a0, 2.4 * Math.PI);
    sun.position.set(7, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -6, near: 1, far: 40 });
    sun.shadow.radius = 6;
    sun.shadow.bias = -0.0005;
    S.add(sun);
    const bounce = new THREE.DirectionalLight(0xffc8a0, 0.55 * Math.PI);
    bounce.position.set(-6, 3, 8);
    S.add(bounce);
    const back = new THREE.DirectionalLight(0xfff4e0, 0.7 * Math.PI);
    back.position.set(-4, 6, -8);
    S.add(back);
    this.spot = new THREE.SpotLight(0xffe2b8, 0, 14, 0.42, 0.65, 1.2);
    this.spot.position.set(0, 7.5, 3);
    S.add(this.spot, this.spot.target);
    S.add(makeShadowCatcher());

    this.build();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.start();
  }

  /* ---------- public API ---------- */

  setShown(id: ItemId | null) {
    if (id === this.shown) return;
    const now = this.now();
    for (const it of ITEMS) {
      const o = this.objs[it.id];
      const target = it.id === id ? (it.id === "badge" ? LIFT * 0.6 : LIFT) : 0;
      if (o.lift.to !== target) o.lift = { from: this.liftValue(o, now), to: target, start: now };
    }
    this.shown = id;
  }

  /** Parallax runs only while nothing is shown; the caller freezes it otherwise. */
  setParallax(on: boolean) {
    this.parallaxOn = on && !this.opts.reducedMotion && this.opts.mode === "page";
  }

  pointer(clientX: number, clientY: number) {
    const r = this.container.getBoundingClientRect();
    if (this.parallaxOn) {
      this.par.x = (clientX - r.left) / r.width - 0.5;
      this.par.y = (clientY - r.top) / r.height - 0.5;
    }
  }

  /**
   * Which item is under this screen point. Each item owns a fixed screen zone: its resting
   * plinth + item, plus the lifted height, padded so neighbours meet. Where zones overlap
   * (e.g. two rows on phones) the item whose centre is nearest wins. Lifting, bobbing and
   * the card never change the answer, so a still cursor always gets the same item.
   */
  pick(clientX: number, clientY: number): ItemId | null {
    const r = this.container.getBoundingClientRect();
    const x = clientX - r.left,
      y = clientY - r.top;
    let best: ItemId | null = null;
    let bestD = Infinity;
    const boxes = ITEMS.map((it) => ({ id: it.id, b: this.restBox(it.id) }));
    for (const { id, b } of boxes) {
      const padX = this.narrow ? 14 : 34,
        padTop = 26,
        padBottom = 14;
      if (x < b.left - padX || x > b.right + padX || y < b.top - padTop || y > b.bottom + padBottom) continue;
      const cx = (b.left + b.right) / 2,
        cy = (b.top + b.bottom) / 2;
      const d = this.narrow ? Math.hypot(x - cx, (y - cy) * 1.2) : Math.abs(x - cx);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  /** Item + plinth at rest, extended upward by the lift so the target never moves. */
  private restBox(id: ItemId) {
    const o = this.objs[id];
    const { x, z, h, r } = o.slot;
    const sc = o.model.scale.x;
    const top = h + o.top * sc + LIFT + 0.1;
    const pts = [
      [x - r, 0, z + r * 0.6],
      [x + r, 0, z + r * 0.6],
      [x - r * 0.8, top, z],
      [x + r * 0.8, top, z],
    ].map(([a, b, c]) => this.project(a, b, c));
    return {
      left: Math.min(...pts.map((p) => p.x)),
      right: Math.max(...pts.map((p) => p.x)),
      top: Math.min(...pts.map((p) => p.y)),
      bottom: Math.max(...pts.map((p) => p.y)),
    };
  }

  /** Screen box of an item at rest plus its current anchor (top of the item). */
  box(id: ItemId): ScreenBox {
    const o = this.objs[id];
    const { x, z, h, r } = o.slot;
    const sc = o.model.scale.x;
    const top = h + o.top * sc;
    const pts = [
      [x - r, 0, z],
      [x + r, 0, z],
      [x - r, top, z],
      [x + r, top, z],
    ].map(([a, b, c]) => this.project(a, b, c));
    const anchor = this.project(x, o.model.position.y + o.top * sc + 0.12, z);
    return {
      left: Math.min(...pts.map((p) => p.x)),
      right: Math.max(...pts.map((p) => p.x)),
      top: Math.min(...pts.map((p) => p.y)),
      bottom: Math.max(...pts.map((p) => p.y)),
      anchorX: anchor.x,
      anchorY: anchor.y,
    };
  }

  onFrame(cb: () => void): () => void {
    this.frameListeners.add(cb);
    return () => {
      this.frameListeners.delete(cb);
    };
  }

  get isNarrow() {
    return this.narrow;
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.tick);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.ro.disconnect();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /* ---------- internals ---------- */

  private now() {
    return performance.now() - this.t0;
  }

  private liftValue(o: Obj, now: number) {
    if (this.opts.reducedMotion) return o.lift.to;
    const p = Math.min(1, Math.max(0, (now - o.lift.start) / LIFT_MS));
    return o.lift.from + (o.lift.to - o.lift.from) * ease(p);
  }

  private project(x: number, y: number, z: number) {
    this.v.set(x, y, z).project(this.camera);
    return { x: (this.v.x * 0.5 + 0.5) * this.container.clientWidth, y: (-this.v.y * 0.5 + 0.5) * this.container.clientHeight };
  }

  private build() {
    const T = makeTextures();
    const makers: Record<ItemId, () => THREE.Group> = {
      shoe: makeShoeFallback,
      bag: () => makeBag(T),
      badge: () => makeExploded(T),
      fidget: () => makeFidget(T),
      plush: () => makeBear(T),
      phones: () => makePhones(T),
    };
    ITEMS.forEach((it, idx) => {
      const holder = new THREE.Group();
      const plinth = makePedestal(1, 1, PLINTH[it.id]);
      holder.add(plinth);
      const model = new THREE.Group();
      const inner = makers[it.id]();
      model.add(inner);
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      holder.add(model);
      this.scene.add(holder);
      this.objs[it.id] = {
        id: it.id,
        holder,
        model,
        plinth,
        top: inner.userData.top,
        slot: WIDE[it.id],
        lift: { from: 0, to: 0, start: 0 },
        delay: idx * 110,
      };
      if (it.id === "badge") this.badgeLayers = inner.userData.layers;
      if (it.id === "shoe") this.loadShoe(model);
    });
  }

  private loadShoe(model: THREE.Group) {
    new GLTFLoader().load(
      "/models/shoe.glb",
      (gltf) => {
        if (this.disposed) return;
        const m = gltf.scene;
        m.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.emissiveMap = null;
            mat.emissive = new THREE.Color(0x000000);
            // Match the built items: slightly matte, same light response.
            mat.roughness = Math.max(mat.roughness ?? 0.8, 0.7);
            mat.envMapIntensity = 0.8;
            mat.needsUpdate = true;
          }
        });
        const bb = new THREE.Box3().setFromObject(m);
        const size = bb.getSize(new THREE.Vector3());
        const c = bb.getCenter(new THREE.Vector3());
        const s = 2.5 / Math.max(size.x, size.z);
        m.scale.setScalar(s);
        m.position.set(-c.x * s, -bb.min.y * s, -c.z * s);
        const pivot = new THREE.Group();
        pivot.add(m);
        pivot.rotation.y = Math.PI;
        const inner = model.children[0] as THREE.Group;
        while (inner.children.length) inner.remove(inner.children[0]);
        inner.add(pivot);
        this.objs.shoe.top = size.y * s;
        this.layout();
      },
      undefined,
      () => {
        /* keep the simple shoe */
      },
    );
  }

  private layout() {
    const W = this.container.clientWidth,
      H = this.container.clientHeight;
    this.narrow = W / H < 1.05;
    const P = this.narrow ? NARROW : WIDE;
    for (const it of ITEMS) {
      const o = this.objs[it.id];
      const s = P[it.id];
      o.slot = s;
      o.holder.position.set(s.x, 0, s.z);
      o.plinth.scale.set(s.r, 1, s.r);
      o.plinth.children[0].scale.y = s.h;
      (o.plinth.userData.ring as THREE.Mesh).position.y = s.h + 0.004;
      const sc = SCALE[it.id] * (this.narrow ? 0.85 : 1);
      o.model.scale.setScalar(sc);
    }
  }

  private resize = () => {
    const W = this.container.clientWidth,
      H = this.container.clientHeight;
    if (!W || !H) return;
    this.renderer.setSize(W, H, false);
    this.camera.aspect = W / H;
    this.layout();
    const pitch = this.opts.mode === "pitch";
    const span = this.narrow ? 6.6 : pitch ? 19.5 : 17.6;
    const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * this.camera.aspect);
    const dist = span / 2 / Math.tan(hf / 2);
    this.camBase.set(0, this.narrow ? 5.4 : 4.4, Math.max(dist, this.narrow ? 10 : 11));
    // Items sit in the lower part of the frame, leaving open sky above for the card.
    this.lookAt.set(0, this.narrow ? 1.7 : pitch ? 3.9 : 3.2, this.narrow ? -0.5 : -0.2);
    this.camTarget.copy(this.camBase);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.lookAt);
    this.camera.updateProjectionMatrix();
  };

  private tick = () => {
    if (!this.running) return;
    const now = this.now();
    const reduce = this.opts.reducedMotion;

    // Camera: base position, plus gentle parallax only while nothing is shown. Never leans toward items.
    if (this.parallaxOn && !this.shown) {
      this.camTarget.set(this.camBase.x + this.par.x * 0.5, this.camBase.y - this.par.y * 0.25, this.camBase.z);
      this.camTarget.x = THREE.MathUtils.clamp(this.camTarget.x, this.camBase.x - 0.25, this.camBase.x + 0.25);
      this.camTarget.y = THREE.MathUtils.clamp(this.camTarget.y, this.camBase.y - 0.25, this.camBase.y + 0.25);
      this.camera.position.lerp(this.camTarget, 0.03);
    }
    this.camera.lookAt(this.lookAt);

    for (const it of ITEMS) {
      const o = this.objs[it.id];
      // Entrance: plinth rises, then the item settles onto it.
      const k = reduce ? 1 : Math.min(1, Math.max(0, (now - 150 - o.delay) / 900));
      const rise = ease(Math.min(1, k * 1.5));
      const drop = ease(Math.max(0, Math.min(1, (k - 0.3) / 0.7)));
      o.plinth.position.y = (rise - 1) * 1.0;
      o.plinth.visible = k > 0;
      const lift = this.liftValue(o, now);
      const ln = lift / LIFT;
      const bob = reduce ? 0 : Math.sin(now / 900 + o.delay) * 0.015 * ln;
      o.model.position.y = o.slot.h + o.plinth.position.y + lift + bob + (1 - drop) * 2.2;
      o.model.visible = drop > 0.001;
      // Slow quarter-turn toward the viewer, max 20°. No z wobble.
      o.model.rotation.y = ROT[it.id] + THREE.MathUtils.degToRad(20) * ln * (ROT[it.id] > 0 ? -1 : 1);
      ((o.plinth.userData.ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = ln;
    }

    // Warm spotlight on the shown item.
    const focus = this.shown ? this.objs[this.shown].holder.position : null;
    const want = focus ? 8 * Math.PI : 0;
    this.spot.intensity += (want - this.spot.intensity) * (reduce ? 1 : 0.08);
    if (focus) {
      this.spot.target.position.copy(focus);
      this.spot.position.set(focus.x + 1.2, 7.5, focus.z + 3);
    }

    if (this.badgeLayers.length) {
      const ln = this.liftValue(this.objs.badge, now) / (LIFT * 0.6);
      const sp = 1 + ln * 0.35;
      this.badgeLayers.forEach((l) => {
        l.position.y = 0.35 + (l.userData.base - 0.35) * sp;
      });
    }

    this.renderer.render(this.scene, this.camera);
    this.frameListeners.forEach((f) => f());
    if (!this.firstFrame) {
      this.firstFrame = true;
      this.opts.onFirstFrame?.();
    }
    this.raf = requestAnimationFrame(this.tick);
  };
}
