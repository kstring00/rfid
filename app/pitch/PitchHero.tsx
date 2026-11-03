"use client";

/*
 * Pitch mode: the hero full screen, driven only by the keyboard (or a presentation clicker).
 * Slides: intro → one slide per item → waitlist. No tour, no parallax, no hover.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ITEMS } from "@/lib/items";
import ItemCard from "../components/ItemCard";
import type { HeroEngine } from "../components/scene/engine";
import styles from "./pitch.module.css";

const LAST = ITEMS.length + 1;

export default function PitchHero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HeroEngine | null>(null);
  const [slide, setSlide] = useState(0);
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const item = slide >= 1 && slide <= ITEMS.length ? ITEMS[slide - 1] : null;

  const go = useCallback((d: number) => setSlide((s) => Math.max(0, Math.min(LAST, s + d))), []);

  useEffect(() => {
    let cancelled = false;
    const stage = stageRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (async () => {
      await Promise.race([document.fonts?.load ? document.fonts.load("800 34px Figtree") : Promise.resolve(), new Promise((r) => setTimeout(r, 1200))]);
      const { HeroEngine } = await import("../components/scene/engine");
      if (cancelled) return;
      engineRef.current = new HeroEngine(stage, { mode: "pitch", reducedMotion: reduce, onFirstFrame: () => setReady(true) });
      engineRef.current.setParallax(false);
    })();
    fetch("/api/waitlist/count")
      .then((r) => r.json())
      .then((d) => !cancelled && setCount(typeof d.count === "number" ? d.count : null))
      .catch(() => {});
    return () => {
      cancelled = true;
      engineRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setShown(item ? item.id : null);
  }, [item, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") setSlide(0);
      else if (e.key === "End") setSlide(LAST);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Place the card beside the item, on the side with more room.
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng || !item) return;
    return eng.onFrame(() => {
      const el = cardRef.current,
        stage = stageRef.current;
      if (!el || !stage) return;
      const W = stage.clientWidth,
        H = stage.clientHeight;
      const b = eng.box(item.id);
      const pw = el.offsetWidth,
        ph = el.offsetHeight;
      // Card sits in the open sky above the item, nudged toward the centre.
      let x = Math.max(32, Math.min(W - pw - 32, b.anchorX - pw / 2 + (W / 2 - b.anchorX) * 0.15));
      let y = b.anchorY - ph - 44;
      if (y < 24) {
        // Too tall to fit above (the exploded badge): sit beside it, top-aligned, on the roomier side.
        const right = W - b.right >= b.left;
        x = Math.max(32, Math.min(W - pw - 32, right ? b.right + 40 : b.left - 40 - pw));
        y = 24;
      }
      y = Math.min(H - ph - 96, y);
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    });
  }, [item, ready]);

  return (
    <div className={styles.root}>
      <div ref={stageRef} className={styles.stage} aria-hidden="true">
        <div className={styles.sun} />
      </div>

      <div className={styles.brand}>
        <b aria-hidden="true">✳</b> IntroBand™
      </div>

      {slide === 0 && (
        <section className={`${styles.overlay} ${styles.intro}`} key="intro">
          <div className={styles.eyebrow}>For autistic and neurodivergent kids</div>
          <h2>One profile. Everything they love.</h2>
          <p>Not a wrist kid? No problem. IntroBand goes on what they already keep, and anyone can tap, scan or type to meet them.</p>
        </section>
      )}

      {item && (
        <div ref={cardRef} className={styles.cardPos}>
          <ItemCard key={item.id} item={item} size="pitch" />
        </div>
      )}

      {slide === LAST && (
        <section className={`${styles.overlay} ${styles.final}`} key="final">
          {count != null && (
            <div className={styles.count}>
              <strong>{count.toLocaleString()}</strong>
              <span>families on the waitlist</span>
            </div>
          )}
          <h2>Make what they already love speak for them.</h2>
          <p className={styles.url}>introband.com</p>
          <p className={styles.small}>Tap · Scan · Type. First name only. Not a GPS tracker.</p>
        </section>
      )}

      <nav className={styles.nav} aria-label="Slides">
        <button type="button" onClick={() => go(-1)} aria-label="Previous slide" disabled={slide === 0}>
          ←
        </button>
        <div className={styles.dots}>
          {Array.from({ length: LAST + 1 }, (_, i) => (
            <span key={i} className={i === slide ? styles.dotOn : ""} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Next slide" disabled={slide === LAST}>
          →
        </button>
      </nav>
      <p className={styles.sr} aria-live="polite">
        {slide === 0 ? "Introduction" : item ? item.label : "Waitlist"}
      </p>
    </div>
  );
}
