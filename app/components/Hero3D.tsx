"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ITEMS, type ItemId } from "@/lib/items";
import { makeBag, makeBear, makeExploded, makeFidget, makeFlies, makeMoss, makePhones, makeRock, makeShoeFallback, makeTextures } from "./scene/models";
import styles from "./Hero3D.module.css";

const ROT: Record<ItemId, number> = { shoe: -0.45, bag: 0.32, badge: 0, fidget: -0.25, plush: -0.28, phones: -0.5 };
const SCALE: Record<ItemId, number> = { shoe: 1, bag: 0.92, badge: 1, fidget: 1, plush: 1, phones: 1 };
const WIDE: Record<ItemId, [number, number, number]> = {
  shoe: [-5.6, 0, 0.2],
  bag: [-3.2, 0, -0.35],
  badge: [0, 0, -0.5],
  fidget: [2.35, 0, -0.1],
  plush: [4.15, 0, -0.25],
  phones: [6.1, 0, 0.15],
};
const NARROW: Record<ItemId, [number, number, number]> = {
  bag: [-2.0, 0, -2.1],
  badge: [0, 0, -2.4],
  plush: [2.0, 0, -2.1],
  shoe: [-2.0, 0, 1.4],
  fidget: [0.05, 0, 1.5],
  phones: [2.05, 0, 1.35],
};

type Obj = { holder: THREE.Group; model: THREE.Group; shadow: THREE.Mesh; lift: number; top: number; phase: number };

export default function Hero3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Partial<Record<ItemId, HTMLButtonElement | null>>>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<ItemId | null>("shoe");
  const [active, setActive] = useState<ItemId | null>("shoe");
  const [isNarrowUI, setNarrowUI] = useState(false);
  const [webgl, setWebgl] = useState(true);

  const select = useCallback((id: ItemId | null) => {
    activeRef.current = id;
    setActive(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const sync = () => setNarrowUI(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const stage = stageRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mqNarrow = window.matchMedia("(max-width: 760px)");

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebgl(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = styles.canvas;
    renderer.domElement.setAttribute("aria-hidden", "true");
    stage.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x12201a, 14, 30);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    // Physically based light units, so intensities are scaled by PI compared to old three.js.
    scene.add(new THREE.HemisphereLight(0xffe7b8, 0x14261c, 0.4 * Math.PI));
    const key = new THREE.DirectionalLight(0xffd59a, 2.6 * Math.PI);
    key.position.set(6, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 7, bottom: -5 });
    key.shadow.radius = 6;
    key.shadow.bias = -0.0006;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fe0b8, 0.9 * Math.PI);
    rim.position.set(-7, 5, -6);
    scene.add(rim);
    const fill = new THREE.PointLight(0xffc27a, 0.6 * Math.PI, 18, 0);
    fill.position.set(0, 3, 6);
    scene.add(fill);

    const objs = {} as Record<ItemId, Obj>;
    let rock: THREE.Mesh | null = null;
    let flies: THREE.Points | null = null;
    let badgeLayers: THREE.Group[] = [];
    let narrow = false;
    let raf = 0;
    let disposed = false;
    const camBase = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    let placed = false;

    const layout = () => {
      if (!rock) return;
      narrow = stage.clientWidth / stage.clientHeight < 1.05;
      const P = narrow ? NARROW : WIDE;
      for (const it of ITEMS) {
        const o = objs[it.id];
        const p = P[it.id];
        o.holder.position.set(p[0], p[1], p[2]);
        o.model.rotation.y = ROT[it.id];
        o.holder.scale.setScalar(SCALE[it.id] * (narrow ? 0.9 : 1));
      }
      rock.scale.set(narrow ? 4.6 : 9.5, 0.7, narrow ? 4.2 : 3.6);
    };

    const resize = () => {
      if (!rock) return;
      const w = stage.clientWidth,
        h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      layout();
      const span = narrow ? 6.2 : 16.4;
      const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
      const dist = span / 2 / Math.tan(hf / 2);
      camBase.set(0, narrow ? 5.6 : 4.0, Math.max(dist, narrow ? 9 : 10));
      lookAt.set(0, narrow ? 0.7 : 1.35, narrow ? -0.4 : 0);
      if (!placed) {
        camera.position.copy(camBase);
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
              mesh.userData.item = "shoe";
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.emissiveMap = null;
              mat.emissive = new THREE.Color(0x000000);
              mat.needsUpdate = true;
            }
          });
          const box = new THREE.Box3().setFromObject(m);
          const size = box.getSize(new THREE.Vector3());
          const c = box.getCenter(new THREE.Vector3());
          const s = 2.7 / Math.max(size.x, size.z);
          m.scale.setScalar(s);
          m.position.set(-c.x * s, -box.min.y * s, -c.z * s);
          const pivot = new THREE.Group();
          pivot.add(m);
          pivot.rotation.y = Math.PI;
          while (group.children.length) group.remove(group.children[0]);
          group.add(pivot);
          objs.shoe.top = size.y * s + 0.2;
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
      rock = makeRock();
      scene.add(rock);
      scene.add(makeMoss());
      flies = makeFlies();
      scene.add(flies);
      const makers: Record<ItemId, () => THREE.Group> = {
        shoe: makeShoeFallback,
        bag: () => makeBag(T),
        badge: () => makeExploded(T),
        fidget: () => makeFidget(T),
        plush: () => makeBear(T),
        phones: () => makePhones(T),
      };
      for (const it of ITEMS) {
        const holder = new THREE.Group();
        const model = makers[it.id]();
        holder.add(model);
        model.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshBasicMaterial({ map: T.blob, transparent: true, depthWrite: false }));
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.02;
        holder.add(shadow);
        scene.add(holder);
        objs[it.id] = { holder, model, shadow, lift: 0, top: model.userData.top, phase: Math.random() * 6 };
        if (it.id === "badge") badgeLayers = model.userData.layers;
        if (it.id === "shoe") loadRealShoe(model);
      }
      resize();
      animate();
    };

    // Badge text is drawn in Figtree, so wait briefly for the font before building textures.
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
      const r = stage.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      const list: THREE.Object3D[] = [];
      for (const it of ITEMS) objs[it.id]?.model.traverse((m) => (m as THREE.Mesh).isMesh && list.push(m));
      const h = ray.intersectObjects(list, false)[0];
      return h ? itemOf(h.object) : null;
    };
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      par.x = (e.clientX - r.left) / r.width - 0.5;
      par.y = (e.clientY - r.top) / r.height - 0.5;
      if (e.pointerType !== "mouse") return;
      const id = hit(e);
      renderer.domElement.style.cursor = id ? "pointer" : "default";
      if (!mqNarrow.matches && id && id !== activeRef.current) select(id);
    };
    const onLeave = (e: PointerEvent) => {
      const to = e.relatedTarget as HTMLElement | null;
      if (!mqNarrow.matches && !(to && (to.closest(`.${styles.card}`) || to.closest(`.${styles.pill}`)))) select(null);
    };
    const onClick = (e: MouseEvent) => {
      const id = hit(e);
      if (id) select(activeRef.current === id && mqNarrow.matches ? null : id);
      else select(null);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    renderer.domElement.addEventListener("click", onClick);

    const ro = new ResizeObserver(() => resize());
    ro.observe(stage);

    /* loop */
    const clock = new THREE.Clock();
    const v3 = new THREE.Vector3();
    const cam = new THREE.Vector3();
    const project = (p: THREE.Vector3) => {
      v3.copy(p).project(camera);
      return { x: (v3.x * 0.5 + 0.5) * stage.clientWidth, y: (-v3.y * 0.5 + 0.5) * stage.clientHeight };
    };
    const tmp = new THREE.Vector3();

    function animate() {
      if (disposed) return;
      const t = clock.getElapsedTime();
      cam.set(camBase.x + par.x * (reduce ? 0 : 0.9), camBase.y - par.y * (reduce ? 0 : 0.4), camBase.z);
      camera.position.lerp(cam, 0.06);
      camera.lookAt(lookAt);
      const act = activeRef.current;
      const W = stage.clientWidth,
        H = stage.clientHeight;

      for (const it of ITEMS) {
        const o = objs[it.id];
        const on = act === it.id;
        const target = on ? (it.id === "badge" ? 0.35 : 0.7) : 0;
        o.lift += (target - o.lift) * (reduce ? 1 : 0.12);
        const bob = reduce ? 0 : Math.sin(t * 1.3 + o.phase) * 0.035;
        o.model.position.y = o.lift + bob;
        o.model.rotation.y = ROT[it.id] + (reduce ? 0 : o.lift * Math.sin(t * 1.6) * 0.25) + o.lift * 0.35;
        o.model.rotation.z = reduce ? 0 : o.lift * Math.sin(t * 1.1) * 0.06;
        o.model.scale.setScalar(1 + o.lift * 0.08);
        (o.shadow.material as THREE.MeshBasicMaterial).opacity = 1 - o.lift * 0.65;
        o.shadow.scale.setScalar(1 + o.lift * 0.5);
        const pill = pillRefs.current[it.id];
        if (pill) {
          const p = project(tmp.set(o.holder.position.x, -0.15, o.holder.position.z + 0.6));
          pill.style.left = `${p.x}px`;
          pill.style.top = `${Math.min(p.y, H - 40)}px`;
        }
      }
      if (badgeLayers.length) {
        const sp = 1 + objs.badge.lift * 0.55 + (reduce ? 0 : Math.sin(t * 1.2) * 0.04);
        badgeLayers.forEach((l, i) => {
          l.position.y = 0.35 + (l.userData.base - 0.35) * sp;
          if (!reduce) l.rotation.y = Math.sin(t * 0.6 + i) * 0.12;
        });
      }
      if (flies && !reduce) {
        const a = flies.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < a.count; i++) {
          a.setY(i, a.getY(i) + Math.sin(t * 0.8 + i) * 0.0025);
          a.setX(i, a.getX(i) + Math.cos(t * 0.5 + i * 1.7) * 0.002);
        }
        a.needsUpdate = true;
        (flies.material as THREE.PointsMaterial).opacity = 0.45 + 0.25 * Math.sin(t * 2);
      }

      const card = cardRef.current;
      if (act && card && !mqNarrow.matches) {
        const o = objs[act];
        const sc = o.holder.scale.x;
        const top = project(tmp.set(o.holder.position.x, o.top * sc + o.lift, o.holder.position.z));
        const right = top.x < W * 0.55;
        const edge = project(tmp.set(o.holder.position.x + (right ? 1.45 : -1.45) * sc, o.top * sc * 0.6 + o.lift, o.holder.position.z));
        const pw = card.offsetWidth,
          ph = card.offsetHeight;
        let x = right ? edge.x + 16 : edge.x - 16 - pw;
        x = Math.max(12, Math.min(W - pw - 12, x));
        let y = top.y - 30;
        y = Math.max(12, Math.min(H - ph - 12, y));
        card.style.left = `${x}px`;
        card.style.top = `${y}px`;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
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
  }, [select]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [select]);

  const item = ITEMS.find((i) => i.id === active) ?? null;
  const card = item && (
    <div ref={cardRef} className={`${styles.card} ${isNarrowUI ? styles.cardStatic : ""}`} role="dialog" aria-label={item.title} id="hero-card"
      onMouseLeave={(e) => {
        if (!isNarrowUI && !stageRef.current?.contains(e.relatedTarget as Node)) select(null);
      }}>
      <button type="button" className={styles.close} aria-label="Close" onClick={() => select(null)}>
        ×
      </button>
      <div className={styles.eyebrow}>{item.eyebrow}</div>
      <h3>{item.title}</h3>
      <p>{item.lead}</p>
      <ul>
        {item.uses.map((u) => (
          <li key={u}>{u}</li>
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
  );

  return (
    <>
      <div
        ref={stageRef}
        className={styles.stage}
        aria-label="3D view of IntroBand on a sneaker, backpack, fidget, teddy bear and headphones, with the badge pulled apart in the middle"
        onMouseLeave={(e) => {
          if (!isNarrowUI && !(e.relatedTarget as HTMLElement | null)?.closest?.(`.${styles.card}`)) select(null);
        }}
      >
        {!webgl && <div className={styles.fallback}>The 3D preview needs WebGL. Tap the labels to see each item.</div>}
        <div className={styles.labels}>
          {ITEMS.map((it, i) => (
            <button
              key={it.id}
              ref={(el) => {
                pillRefs.current[it.id] = el;
              }}
              type="button"
              className={styles.pill}
              style={webgl ? undefined : { left: `${12 + i * 15.2}%`, top: "82%" }}
              aria-expanded={active === it.id}
              aria-controls="hero-card"
              onMouseEnter={() => !isNarrowUI && select(it.id)}
              onClick={(e) => {
                e.stopPropagation();
                select(active === it.id ? null : it.id);
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
        {!isNarrowUI && card}
      </div>
      <p className={styles.hint}>
        <span className={styles.dot} aria-hidden="true" />
        Hover or tap anything to lift it and see how it works.
      </p>
      {isNarrowUI && card}
    </>
  );
}
