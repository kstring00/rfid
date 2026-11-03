"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ITEMS, type ItemId } from "@/lib/items";
import { makeBag, makeBear, makeExploded, makeFidget, makePedestal, makePhones, makeShadowCatcher, makeShoeFallback, makeTextures } from "./scene/models";
import styles from "./Hero3D.module.css";

/* Layout: each item stands on its own plinth in a gentle arc. [x, z, plinth height, plinth radius] */
const ROT: Record<ItemId, number> = { shoe: -0.5, bag: 0.3, badge: 0, fidget: -0.2, plush: -0.3, phones: -0.45 };
const SCALE: Record<ItemId, number> = { shoe: 0.95, bag: 0.85, badge: 0.9, fidget: 0.95, plush: 0.95, phones: 0.95 };
const WIDE: Record<ItemId, [number, number, number, number]> = {
  shoe: [-5.5, 0.4, 0.45, 1.45],
  bag: [-3.1, -0.5, 0.75, 1.05],
  badge: [0, -0.9, 1.05, 1.0],
  fidget: [2.45, -0.5, 0.75, 1.0],
  plush: [4.35, -0.1, 0.55, 0.95],
  phones: [6.2, 0.45, 0.4, 1.05],
};
const NARROW: Record<ItemId, [number, number, number, number]> = {
  bag: [-2.05, -2.2, 0.75, 0.95],
  badge: [0, -2.6, 1.0, 0.9],
  plush: [2.05, -2.2, 0.75, 0.9],
  shoe: [-2.05, 1.2, 0.35, 1.25],
  fidget: [0, 1.0, 0.45, 0.95],
  phones: [2.05, 1.2, 0.35, 1.0],
};
const PLINTH_COLORS: Record<ItemId, string> = {
  shoe: "#ead7bd",
  bag: "#e6cfb1",
  badge: "#f1e2cc",
  fidget: "#e9d3b6",
  plush: "#e3caa9",
  phones: "#ecdac2",
};

type Obj = {
  holder: THREE.Group;
  model: THREE.Group;
  plinth: THREE.Group;
  lift: number;
  intro: number;
  top: number;
  phase: number;
};

export default function Hero3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const shownRef = useRef<ItemId | null>(null);
  const [shown, setShown] = useState<ItemId | null>(null);
  const [pinned, setPinned] = useState<ItemId | null>(null);
  const [touring, setTouring] = useState(false);
  const [isNarrowUI, setNarrowUI] = useState(false);
  const [webgl, setWebgl] = useState(true);

  // What the scene shows = hovered item, else pinned item, else the tour's item.
  const hoverRef = useRef<ItemId | null>(null);
  const pinnedRef = useRef<ItemId | null>(null);
  const tourRef = useRef<ItemId | null>(null);
  const overCardRef = useRef(false);
  const lastInputRef = useRef(0);

  const recompute = useCallback(() => {
    const next = hoverRef.current ?? (overCardRef.current ? shownRef.current : null) ?? pinnedRef.current ?? tourRef.current;
    if (next !== shownRef.current) {
      shownRef.current = next;
      setShown(next);
    }
  }, []);
  const setHover = useCallback(
    (id: ItemId | null) => {
      hoverRef.current = id;
      recompute();
    },
    [recompute],
  );
  const pin = useCallback(
    (id: ItemId | null) => {
      pinnedRef.current = id;
      setPinned(id);
      tourRef.current = null;
      setTouring(false);
      lastInputRef.current = performance.now();
      recompute();
    },
    [recompute],
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const sync = () => setNarrowUI(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* Idle tour: after a few quiet seconds, gently spotlight each item in turn. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lastInputRef.current = performance.now() - 2500;
    let i = 0;
    const timer = window.setInterval(() => {
      const idle = performance.now() - lastInputRef.current > 5000;
      if (!idle || pinnedRef.current || hoverRef.current || overCardRef.current) {
        if (tourRef.current && !idle) {
          tourRef.current = null;
          setTouring(false);
          recompute();
        }
        return;
      }
      tourRef.current = ITEMS[i % ITEMS.length].id;
      i++;
      setTouring(true);
      recompute();
    }, 3800);
    return () => window.clearInterval(timer);
  }, [recompute]);

  useEffect(() => {
    const stage = stageRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebgl(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = styles.canvas;
    renderer.domElement.setAttribute("aria-hidden", "true");
    stage.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // Warm late-afternoon light. Physical units, so intensities are scaled by PI.
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0xd8b48c, 1.15 * Math.PI));
    const sun = new THREE.DirectionalLight(0xffd6a0, 2.4 * Math.PI);
    sun.position.set(7, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -6, near: 1, far: 40 });
    sun.shadow.radius = 8;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    const bounce = new THREE.DirectionalLight(0xffc8a0, 0.55 * Math.PI);
    bounce.position.set(-6, 3, 8);
    scene.add(bounce);
    const back = new THREE.DirectionalLight(0xfff4e0, 0.7 * Math.PI);
    back.position.set(-4, 6, -8);
    scene.add(back);
    const spot = new THREE.SpotLight(0xffe2b8, 0, 14, 0.42, 0.65, 1.2);
    spot.position.set(0, 7.5, 3);
    scene.add(spot);
    scene.add(spot.target);

    scene.add(makeShadowCatcher());

    const objs = {} as Record<ItemId, Obj>;
    let badgeLayers: THREE.Group[] = [];
    let narrow = false;
    let raf = 0;
    let disposed = false;
    let built = false;
    const camBase = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const lookNow = new THREE.Vector3();
    let placed = false;

    const layout = () => {
      if (!built) return;
      narrow = stage.clientWidth / stage.clientHeight < 1.05;
      const P = narrow ? NARROW : WIDE;
      for (const it of ITEMS) {
        const o = objs[it.id];
        const [x, z, h, r] = P[it.id];
        o.holder.position.set(x, 0, z);
        o.plinth.scale.set(r, 1, r);
        o.plinth.children[0].scale.y = h / (o.plinth.userData.height as number);
        (o.plinth.userData.ring as THREE.Mesh).position.y = h + 0.004;
        o.model.userData.base = h;
        o.model.scale.setScalar(SCALE[it.id] * (narrow ? 0.85 : 1));
      }
    };

    const resize = () => {
      if (!built) return;
      const w = stage.clientWidth,
        h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      layout();
      const span = narrow ? 6.6 : 17.6;
      const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
      const dist = span / 2 / Math.tan(hf / 2);
      camBase.set(0, narrow ? 5.4 : 4.4, Math.max(dist, narrow ? 10 : 11));
      lookAt.set(0, narrow ? 1.7 : 2.6, narrow ? -0.5 : -0.2);
      if (!placed) {
        camera.position.copy(camBase);
        lookNow.copy(lookAt);
        camera.lookAt(lookAt);
        placed = true;
      }
      camera.updateProjectionMatrix();
    };

    const loadRealShoe = (group: THREE.Group) => {
      new GLTFLoader().load(
        "/models/shoe.glb",
        (gltf) => {
          if (disposed) return;
          const m = gltf.scene;
          m.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.emissiveMap = null;
              mat.emissive = new THREE.Color(0x000000);
              mat.needsUpdate = true;
            }
          });
          const box = new THREE.Box3().setFromObject(m);
          const size = box.getSize(new THREE.Vector3());
          const c = box.getCenter(new THREE.Vector3());
          const s = 2.5 / Math.max(size.x, size.z);
          m.scale.setScalar(s);
          m.position.set(-c.x * s, -box.min.y * s, -c.z * s);
          const pivot = new THREE.Group();
          pivot.add(m);
          pivot.rotation.y = Math.PI;
          const inner = group.children[0] as THREE.Group;
          while (inner.children.length) inner.remove(inner.children[0]);
          inner.add(pivot);
          objs.shoe.top = size.y * s;
        },
        undefined,
        () => {
          /* keep the simple shoe if the model fails to load */
        },
      );
    };

    const build = () => {
      if (disposed) return;
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
        const plinth = makePedestal(1, 1, PLINTH_COLORS[it.id]);
        holder.add(plinth);
        // model > inner (so the GLB swap keeps transforms on the outer group)
        const model = new THREE.Group();
        const inner = makers[it.id]();
        model.add(inner);
        holder.add(model);
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        scene.add(holder);
        objs[it.id] = { holder, model, plinth, lift: 0, intro: reduce ? 1 : idx * 0.12, top: inner.userData.top, phase: Math.random() * 6 };
        if (it.id === "badge") badgeLayers = inner.userData.layers;
        if (it.id === "shoe") loadRealShoe(model);
      });
      built = true;
      resize();
      animate();
    };

    const fontsReady = document.fonts?.load
      ? Promise.race([Promise.all([document.fonts.load("800 34px Figtree"), document.fonts.load("700 27px Figtree")]), new Promise((r) => setTimeout(r, 1500))])
      : Promise.resolve();
    fontsReady.then(build);

    /* pointer */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const par = { x: 0, y: 0 };
    const itemOf = (o: THREE.Object3D | null): ItemId | null => {
      while (o) {
        for (const it of ITEMS) if (objs[it.id] && objs[it.id].holder === o) return it.id;
        o = o.parent;
      }
      return null;
    };
    const hit = (e: PointerEvent | MouseEvent) => {
      if (!built) return null;
      const r = stage.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const list: THREE.Object3D[] = [];
      for (const it of ITEMS) {
        objs[it.id].model.traverse((m) => (m as THREE.Mesh).isMesh && list.push(m));
        objs[it.id].plinth.traverse((m) => (m as THREE.Mesh).isMesh && list.push(m));
      }
      const h = ray.intersectObjects(list, false)[0];
      return h ? itemOf(h.object) : null;
    };
    let leaveTimer = 0;
    const onMove = (e: PointerEvent) => {
      lastInputRef.current = performance.now();
      const r = stage.getBoundingClientRect();
      par.x = (e.clientX - r.left) / r.width - 0.5;
      par.y = (e.clientY - r.top) / r.height - 0.5;
      if (e.pointerType !== "mouse") return;
      const id = hit(e);
      renderer.domElement.style.cursor = id ? "pointer" : "default";
      window.clearTimeout(leaveTimer);
      if (id) {
        if (tourRef.current) {
          tourRef.current = null;
          setTouring(false);
        }
        setHover(id);
      } else if (hoverRef.current) {
        // Short grace period so the pointer can travel onto the card.
        leaveTimer = window.setTimeout(() => setHover(null), 140);
      }
    };
    const onLeave = () => {
      window.clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(() => setHover(null), 140);
    };
    const onClick = (e: MouseEvent) => {
      const id = hit(e);
      if (id) pin(pinnedRef.current === id ? null : id);
      else pin(null);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    renderer.domElement.addEventListener("click", onClick);

    const ro = new ResizeObserver(() => resize());
    ro.observe(stage);

    /* loop */
    const clock = new THREE.Clock();
    const v3 = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const cam = new THREE.Vector3();
    const project = (p: THREE.Vector3) => {
      v3.copy(p).project(camera);
      return { x: (v3.x * 0.5 + 0.5) * stage.clientWidth, y: (-v3.y * 0.5 + 0.5) * stage.clientHeight };
    };
    const easeOutBack = (t: number) => {
      const c1 = 1.4,
        c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    function animate() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const act = shownRef.current;
      const W = stage.clientWidth,
        H = stage.clientHeight;

      // Camera: soft parallax, and leans a little toward whatever is shown.
      const focus = act && objs[act] ? objs[act].holder.position : null;
      const lean = focus ? (narrow ? 0.06 : 0.07) : 0;
      cam.set(
        camBase.x + (focus ? focus.x * lean : 0) + par.x * (reduce ? 0 : 0.8),
        camBase.y - par.y * (reduce ? 0 : 0.35),
        camBase.z - (focus ? 0.25 : 0),
      );
      camera.position.lerp(cam, reduce ? 1 : 0.045);
      tmp.set(lookAt.x + (focus ? focus.x * lean * 1.2 : 0), lookAt.y, lookAt.z);
      lookNow.lerp(tmp, reduce ? 1 : 0.05);
      camera.lookAt(lookNow);

      for (const it of ITEMS) {
        const o = objs[it.id];
        const on = act === it.id;
        // Entrance: plinths rise, then items drop onto them.
        // o.intro holds this item's start delay; progress is based on real time so slow devices still finish.
        const k = reduce ? 1 : Math.max(0, Math.min(1, (t - 0.15 - o.intro) / 1.1));
        const rise = reduce ? 1 : easeOutBack(Math.min(1, k * 1.6));
        const drop = reduce ? 1 : easeOutBack(Math.max(0, Math.min(1, (k - 0.25) * 1.5)));
        o.plinth.position.y = (rise - 1) * 1.2;
        o.plinth.visible = k > 0;

        const target = on ? (it.id === "badge" ? 0.3 : 0.62) : 0;
        o.lift += (target - o.lift) * (reduce ? 1 : 0.1);
        const base = (o.model.userData.base as number) ?? 0.5;
        const bob = reduce ? 0 : Math.sin(t * 1.3 + o.phase) * 0.03 * (0.4 + o.lift);
        o.model.position.y = base + o.plinth.position.y + o.lift + bob + (1 - drop) * 3;
        o.model.visible = drop > 0.001 || reduce;
        o.model.rotation.y = ROT[it.id] + (reduce ? 0 : o.lift * (0.5 + Math.sin(t * 0.9) * 0.35));
        o.model.rotation.z = reduce ? 0 : o.lift * Math.sin(t * 1.1) * 0.05;
        const ring = o.plinth.userData.ring as THREE.Mesh;
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.min(1, o.lift * 1.4);
      }

      // Warm spotlight follows the shown item.
      if (focus) {
        spot.intensity += (9 * Math.PI - spot.intensity) * 0.08;
        spot.target.position.lerp(focus, 0.12);
        spot.position.set(spot.target.position.x + 1.2, 7.5, spot.target.position.z + 3);
      } else {
        spot.intensity += (0 - spot.intensity) * 0.08;
      }

      if (badgeLayers.length) {
        const sp = 1 + (objs.badge.lift / 0.3) * 0.35 + (reduce ? 0 : Math.sin(t * 1.2) * 0.04);
        badgeLayers.forEach((l, i) => {
          l.position.y = 0.35 + (l.userData.base - 0.35) * sp;
          if (!reduce) l.rotation.y = Math.sin(t * 0.6 + i) * 0.14;
        });
      }

      // Leader line + card placement.
      const card = cardRef.current,
        line = lineRef.current,
        dot = dotRef.current;
      if (act && objs[act] && card && line && dot) {
        const o = objs[act];
        const sc = o.model.scale.x;
        const anchor = project(tmp.set(o.holder.position.x, o.model.position.y + o.top * sc + 0.15, o.holder.position.z));
        if (!isNarrow()) {
          const pw = card.offsetWidth,
            ph = card.offsetHeight;
          // Float the card above the item, nudged toward the middle of the stage.
          let x = anchor.x - pw / 2 + (W / 2 - anchor.x) * 0.18;
          x = Math.max(16, Math.min(W - pw - 16, x));
          let y = anchor.y - ph - 46;
          y = Math.max(16, Math.min(H - ph - 90, y));
          card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          const ex = Math.max(x + 24, Math.min(x + pw - 24, anchor.x));
          line.setAttribute("x1", String(anchor.x));
          line.setAttribute("y1", String(anchor.y));
          line.setAttribute("x2", String(ex));
          line.setAttribute("y2", String(y + ph));
          line.style.opacity = "1";
        } else {
          line.style.opacity = "0";
        }
        dot.setAttribute("cx", String(anchor.x));
        dot.setAttribute("cy", String(anchor.y));
        dot.style.opacity = "1";
      } else if (line && dot) {
        line.style.opacity = "0";
        dot.style.opacity = "0";
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    const mqN = window.matchMedia("(max-width: 760px)");
    const isNarrow = () => mqN.matches;

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(leaveTimer);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      renderer.domElement.removeEventListener("click", onClick);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [pin, setHover]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hoverRef.current = null;
        pin(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pin]);

  const item = ITEMS.find((i) => i.id === shown) ?? null;
  const card = item && (
    <div
      ref={cardRef}
      className={isNarrowUI ? styles.cardSlot : styles.cardPos}
      onMouseEnter={() => {
        overCardRef.current = true;
      }}
      onMouseLeave={() => {
        overCardRef.current = false;
        hoverRef.current = null;
        recompute();
      }}
    >
      <div key={item.id} className={styles.card} role="region" aria-live="polite" aria-label={item.title} id="hero-card">
        {pinned === item.id && (
          <button type="button" className={styles.close} aria-label="Close" onClick={() => pin(null)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}
        <div className={styles.eyebrow}>{item.eyebrow}</div>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.lead}>{item.lead}</p>
        <ul className={styles.uses}>
          {item.uses.map((u, i) => (
            <li key={u} style={{ animationDelay: `${140 + i * 70}ms` }}>
              {u}
            </li>
          ))}
        </ul>
        <div className={styles.meta}>
          {item.chips.map((c) => (
            <span key={c.text} className={`${styles.chip} ${c.warn ? styles.warn : ""}`}>
              {c.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <div ref={stageRef} className={styles.stage} aria-label="3D view of IntroBand on a sneaker, backpack, fidget, teddy bear and headphones, each on its own display stand">
        <div className={styles.sun} aria-hidden="true" />
        {!webgl && <div className={styles.fallback}>The 3D preview needs WebGL. Use the buttons below to see each item.</div>}
        <svg className={styles.leader} aria-hidden="true">
          <line ref={lineRef} x1="0" y1="0" x2="0" y2="0" />
          <circle ref={dotRef} r="4.5" cx="-20" cy="-20" />
        </svg>
        {!isNarrowUI && card}
        <div className={styles.selector} role="tablist" aria-label="Choose an item">
          {ITEMS.map((it) => (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={shown === it.id}
              aria-controls="hero-card"
              className={`${styles.tab} ${pinned === it.id ? styles.tabPinned : ""}`}
              onMouseEnter={() => !isNarrowUI && setHover(it.id)}
              onMouseLeave={() => !isNarrowUI && setHover(null)}
              onFocus={() => setHover(it.id)}
              onBlur={() => setHover(null)}
              onClick={() => pin(pinned === it.id ? null : it.id)}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.hint}>
        {touring ? "Taking a quick tour. " : ""}
        {isNarrowUI ? "Tap anything to lift it and see how it works." : "Hover to look closer. Click to keep it open."}
      </p>
      {isNarrowUI && card}
    </div>
  );
}
