"use client";

/*
 * Landing-page hero. Selection lives in one reducer (see heroState.ts for the state diagram):
 *
 *   idle ──hover 90ms──▶ hovering ──click──▶ pinned ──close──▶ idle
 *     ▲                     │ leave 280ms
 *     └─────────────────────┘
 *   idle ──8s no input──▶ touring ──any input──▶ idle
 *
 * The 3D engine (three.js) is loaded lazily and only draws what this component tells it.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ITEMS, type ItemId } from "@/lib/items";
import { heroReducer, initialHero, modeOf, shownOf } from "./heroState";
import ItemCard from "./ItemCard";
import type { HeroEngine } from "./scene/engine";
import styles from "./Hero3D.module.css";

const ENTER_MS = 90;
const LEAVE_MS = 280;
const TOUR_IDLE_MS = 8000;
const TOUR_STEP_MS = 4200;

/** The hero copy that shares the stage on wide screens (see app/page.tsx). */
function heroCopy(stage: HTMLElement) {
  return stage.closest("section")?.querySelector<HTMLElement>("[data-hero-copy]") ?? null;
}

/**
 * Boxes of the hero copy, relative to the stage, so the card steers around the words. These
 * are the same boxes that take the pointer (see .heroCopy in globals.css), so a card placed
 * clear of them is always clickable.
 */
function copyRects(stage: HTMLElement, sr: DOMRect) {
  const copy = heroCopy(stage);
  if (!copy) return [];
  const out: { left: number; right: number; top: number; bottom: number }[] = [];
  copy.querySelectorAll<HTMLElement>("[data-hero-avoid]").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || r.bottom < sr.top) return;
    out.push({ left: r.left - sr.left - 12, right: r.right - sr.left + 12, top: r.top - sr.top - 10, bottom: r.bottom - sr.top + 10 });
  });
  return out;
}

export default function Hero3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardPosRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const engineRef = useRef<HeroEngine | null>(null);

  const [state, dispatch] = useReducer(heroReducer, initialHero);
  const stateRef = useRef(state);
  stateRef.current = state;
  const shown = shownOf(state);
  const mode = modeOf(state);

  const [ready, setReady] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [narrowUI, setNarrowUI] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Hover-intent timers
  const enterTimer = useRef(0);
  const leaveTimer = useRef(0);
  const candidate = useRef<ItemId | null>(null);
  const lastInput = useRef(0);
  const lastPick = useRef<{ x: number; y: number; id: ItemId } | null>(null);

  // leaveTimer.current is reset to 0 when cleared so a new one can start.
  const cancelLeave = () => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = 0;
  };
  const clearTimers = () => {
    window.clearTimeout(enterTimer.current);
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = 0;
    candidate.current = null;
  };

  /** Feed the zone under a mouse (or a hovered tab) into hover intent. */
  const zone = useCallback((id: ItemId | null) => {
    const cur = stateRef.current.hover;
    if (id && id === cur) {
      cancelLeave();
      return;
    }
    if (id && cur) {
      // Moving straight from one item to the next: switch at once, no blank flash.
      cancelLeave();
      window.clearTimeout(enterTimer.current);
      dispatch({ type: "hover", id });
      return;
    }
    if (id) {
      if (candidate.current === id) return;
      candidate.current = id;
      window.clearTimeout(enterTimer.current);
      enterTimer.current = window.setTimeout(() => {
        candidate.current = null;
        dispatch({ type: "hover", id });
      }, ENTER_MS);
      return;
    }
    // Nothing under the pointer.
    window.clearTimeout(enterTimer.current);
    candidate.current = null;
    if (cur && !leaveTimer.current) {
      leaveTimer.current = window.setTimeout(() => {
        leaveTimer.current = 0;
        dispatch({ type: "leave" });
      }, LEAVE_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Media queries */
  useEffect(() => {
    // Below 1100px the hero copy sits above the stage, so the card opens below the stage.
    const n = window.matchMedia("(max-width: 1099px)");
    const r = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setNarrowUI(n.matches);
      setReduced(r.matches);
    };
    sync();
    n.addEventListener("change", sync);
    r.addEventListener("change", sync);
    return () => {
      n.removeEventListener("change", sync);
      r.removeEventListener("change", sync);
    };
  }, []);

  /* Engine: lazy-load three.js after first paint */
  useEffect(() => {
    let cancelled = false;
    const stage = stageRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const load = async () => {
      try {
        await Promise.race([
          document.fonts?.load ? Promise.all([document.fonts.load("800 34px Figtree"), document.fonts.load("700 27px Figtree")]) : Promise.resolve(),
          new Promise((r) => setTimeout(r, 1200)),
        ]);
        const { HeroEngine } = await import("./scene/engine");
        if (cancelled) return;
        engineRef.current = new HeroEngine(stage, {
          mode: "page",
          reducedMotion: reduce,
          onFirstFrame: () => setReady(true),
          reserveTop: () => {
            const copy = heroCopy(stage);
            return copy ? copy.getBoundingClientRect().bottom - stage.getBoundingClientRect().top : 0;
          },
        });
        engineRef.current.setParallax(true);
        // Test hook for the acceptance tests: only when the URL has ?debug.
        if (location.search.includes("debug")) (window as unknown as { __hero: HeroEngine }).__hero = engineRef.current;
      } catch {
        if (!cancelled) setWebgl(false);
      }
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(() => load());
    else setTimeout(load, 1);

    // Pause when off screen or the tab is hidden.
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !document.hidden) engineRef.current?.start();
      else engineRef.current?.stop();
    });
    io.observe(stage);
    const onVis = () => (document.hidden || !visible ? engineRef.current?.stop() : engineRef.current?.start());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  /* Tell the engine what to show */
  useEffect(() => {
    engineRef.current?.setShown(shown);
    engineRef.current?.setParallax(!shown);
  }, [shown, ready]);

  /* Pointer handling on the stage */
  useEffect(() => {
    const stage = stageRef.current!;
    let lastType = "mouse";
    const insideCard = (x: number, y: number) => {
      const el = cardPosRef.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const onMove = (e: PointerEvent) => {
      lastType = e.pointerType;
      const eng = engineRef.current;
      if (!eng || e.pointerType !== "mouse") return;
      eng.pointer(e.clientX, e.clientY);
      if (stateRef.current.pinned) {
        stage.style.cursor = eng.pick(e.clientX, e.clientY) ? "pointer" : "default";
        return;
      }
      const cur = stateRef.current.hover;
      const id = eng.pick(e.clientX, e.clientY);
      // On the card with no other item under the pointer: keep the current item.
      if (cur && (!id || id === cur) && insideCard(e.clientX, e.clientY)) {
        cancelLeave();
        return;
      }
      stage.style.cursor = id ? "pointer" : "default";
      if (id && id === cur) cancelLeave();
      zone(id);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      zone(null);
    };
    const onDown = (e: PointerEvent) => {
      lastType = e.pointerType;
    };
    const onClick = (e: MouseEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      if ((e.target as HTMLElement).closest(`.${styles.selector}, .${styles.cardPos}`)) return;
      const id = eng.pick(e.clientX, e.clientY);
      clearTimers();
      cancelLeave();
      if (id) dispatch({ type: "toggle", id });
      else dispatch({ type: "close" });
      if (lastType !== "mouse") stage.style.cursor = "default";
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("click", onClick);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("click", onClick);
    };
  }, [zone]);

  /* Idle tour: only after 8s with no pointer, scroll or key input */
  useEffect(() => {
    if (reduced) return;
    lastInput.current = performance.now();
    const bump = () => {
      lastInput.current = performance.now();
      if (stateRef.current.tour) dispatch({ type: "stopTour" });
    };
    const evs = ["pointermove", "pointerdown", "wheel", "scroll", "keydown", "touchstart"] as const;
    evs.forEach((ev) => window.addEventListener(ev, bump, { passive: true }));
    let i = 0;
    const timer = window.setInterval(() => {
      const s = stateRef.current;
      if (s.pinned || s.hover) return;
      if (performance.now() - lastInput.current < TOUR_IDLE_MS) return;
      dispatch({ type: "tour", id: ITEMS[i++ % ITEMS.length].id });
    }, TOUR_STEP_MS);
    return () => {
      window.clearInterval(timer);
      evs.forEach((ev) => window.removeEventListener(ev, bump));
    };
  }, [reduced]);

  /* Keyboard: Escape closes */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearTimers();
        cancelLeave();
        dispatch({ type: "close" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* Card + leader placement, every frame */
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng || !shown) {
      if (lineRef.current) lineRef.current.style.opacity = "0";
      if (dotRef.current) dotRef.current.style.opacity = "0";
      return;
    }
    const off = eng.onFrame(() => {
      const stage = stageRef.current,
        pos = cardPosRef.current,
        line = lineRef.current,
        dot = dotRef.current;
      if (!stage || !line || !dot) return;
      const W = stage.clientWidth,
        H = stage.clientHeight;
      const me = eng.box(shown);
      dot.setAttribute("cx", String(me.anchorX));
      dot.setAttribute("cy", String(me.anchorY));
      dot.style.opacity = "1";
      if (!pos || narrowUI) {
        line.style.opacity = "0";
        return;
      }
      const pw = pos.offsetWidth,
        ph = pos.offsetHeight;
      const sr = stage.getBoundingClientRect();
      const overlap = (l: number, t: number, o: { left: number; right: number; top: number; bottom: number }) =>
        Math.max(0, Math.min(l + pw, o.right) - Math.max(l, o.left)) * Math.max(0, Math.min(t + ph, o.bottom) - Math.max(t, o.top));
      const others = ITEMS.filter((i) => i.id !== shown).map((i) => eng.box(i.id));
      // Hero copy that shares the stage: the card must never sit on the words or buttons.
      const words = copyRects(stage, sr);
      const clampX = (v: number) => Math.max(16, Math.min(W - pw - 16, v));
      const clampY = (v: number) => Math.max(16, Math.min(H - ph - 84, v));
      const aboveY = clampY(me.anchorY - ph - 42);
      const sideY = clampY(me.anchorY - ph * 0.45);
      const xs = [
        clampX(me.anchorX - pw / 2),
        clampX(me.anchorX - pw + 48),
        clampX(me.anchorX - 48),
        clampX(me.right + 28),
        clampX(me.left - 28 - pw),
        clampX(W - pw - 24),
      ];
      const ys = [aboveY, sideY];
      for (let v = 16; v <= H - ph - 84; v += 24) ys.push(v);
      const cost = (c: { x: number; y: number }) => {
        // Never cover the item itself.
        const selfHit = c.x < me.right && c.x + pw > me.left && c.y + ph > me.anchorY + 24 && c.y < me.bottom;
        if (selfHit) return Infinity;
        const items = others.reduce((sum, o) => sum + overlap(c.x, c.y, o), 0);
        const text = words.reduce((sum, o) => sum + overlap(c.x, c.y, o), 0);
        // Prefer staying close to the item the card describes.
        const nx = Math.max(c.x - me.anchorX, me.anchorX - (c.x + pw), 0);
        const ny = Math.max(c.y - me.anchorY, me.anchorY - (c.y + ph), 0);
        return items + text * 50 + Math.hypot(nx, ny) * 30;
      };
      let pick = { x: xs[0], y: aboveY },
        bestA = Infinity;
      for (const y of ys)
        for (const x of xs) {
          const a = cost({ x, y });
          if (a < bestA - 1) {
            bestA = a;
            pick = { x, y };
          }
        }
      // Hold the last spot unless the new one is clearly better, so the card never twitches.
      const prev = lastPick.current;
      if (prev && prev.id === shown && cost(prev) <= bestA * 1.15 + 2500) pick = prev;
      lastPick.current = { ...pick, id: shown };
      const side: "above" | "left" | "right" =
        pick.y + ph <= me.anchorY - 8 ? "above" : pick.x >= me.anchorX ? "right" : "left";
      const { x, y } = pick;
      pos.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      const ex = side === "above" ? Math.max(x + 28, Math.min(x + pw - 28, me.anchorX)) : side === "right" ? x : x + pw;
      const ey = side === "above" ? y + ph : Math.max(y + 28, Math.min(y + ph - 28, me.anchorY));
      line.setAttribute("x1", String(me.anchorX));
      line.setAttribute("y1", String(me.anchorY));
      line.setAttribute("x2", String(ex));
      line.setAttribute("y2", String(ey));
      line.style.opacity = "1";
    });
    return () => {
      off();
    };
  }, [shown, narrowUI, ready]);

  /* Selector tabs: roving tabindex + arrows */
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIdx, setFocusIdx] = useState(0);
  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % ITEMS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + ITEMS.length) % ITEMS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = ITEMS.length - 1;
    else return;
    e.preventDefault();
    setFocusIdx(n);
    tabRefs.current[n]?.focus();
  };

  const item = ITEMS.find((i) => i.id === shown) ?? null;
  const pinned = mode === "pinned";
  const card = item && (
    <div
      ref={cardPosRef}
      className={narrowUI ? styles.cardSlot : `${styles.cardPos} ${pinned ? styles.interactive : ""}`}
      onMouseEnter={cancelLeave}
    >
      <ItemCard
        key={item.id}
        item={item}
        onClose={
          pinned
            ? () => {
                clearTimers();
                dispatch({ type: "close" });
              }
            : undefined
        }
      />
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <div
        ref={stageRef}
        className={styles.stage}
        aria-label="3D view of IntroBand on a sneaker, backpack, fidget, teddy bear and headphones, each on its own display stand"
        data-mode={mode}
      >
        <div className={`${styles.poster} ${ready ? styles.posterGone : ""}`} aria-hidden="true">
          {ITEMS.map((it, i) => (
            <span key={it.id} style={{ left: `${10 + i * 16}%` }} />
          ))}
        </div>
        {!webgl && <div className={styles.fallback}>The 3D preview needs WebGL. Use the buttons below to see each item.</div>}
        <svg className={styles.leader} aria-hidden="true">
          <line ref={lineRef} x1="0" y1="0" x2="0" y2="0" style={{ opacity: 0 }} />
          <circle ref={dotRef} r="4.5" cx="-20" cy="-20" style={{ opacity: 0 }} />
        </svg>
        {!narrowUI && card}
        <div className={styles.selector} role="tablist" aria-label="Choose an item">
          {ITEMS.map((it, i) => (
            <button
              key={it.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              tabIndex={i === focusIdx ? 0 : -1}
              aria-selected={shown === it.id}
              aria-controls="hero-card"
              className={`${styles.tab} ${state.pinned === it.id ? styles.tabPinned : ""}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && !state.pinned && zone(it.id)}
              onPointerLeave={(e) => e.pointerType === "mouse" && !state.pinned && zone(null)}
              onKeyDown={(e) => onTabKey(e, i)}
              onFocus={() => setFocusIdx(i)}
              onClick={() => {
                clearTimers();
                cancelLeave();
                dispatch({ type: "toggle", id: it.id });
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.below}>
        <p className={styles.hint}>
          {mode === "touring" ? "Taking a quick tour. " : ""}
          {narrowUI ? "Tap anything to lift it and see how it works." : "Hover to look closer. Click to keep it open."}
        </p>
        {narrowUI && card}
      </div>
    </div>
  );
}
