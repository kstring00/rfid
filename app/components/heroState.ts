import type { ItemId } from "@/lib/items";

/*
 * Hero selection state
 *
 *            HOVER (mouse rests 90ms)              CLICK / TAP / Enter
 *   idle ───────────────────────────▶ hovering ───────────────────────▶ pinned
 *    ▲  ▲   LEAVE (280ms off zone)       │                               │
 *    │  └────────────────────────────────┘                               │
 *    │                         CLOSE (click same / empty, Esc, ×)        │
 *    ├───────────────────────────────────────────────────────────────────┘
 *    │  8s of no input
 *    └──▶ touring ── any input ──▶ idle
 *
 * Rules: pinned wins over everything. While pinned, hovering other items does nothing.
 * Touring never runs while hovering or pinned.
 */

export type HeroState = { hover: ItemId | null; pinned: ItemId | null; tour: ItemId | null };

export type HeroAction =
  | { type: "hover"; id: ItemId }
  | { type: "leave" }
  | { type: "pin"; id: ItemId }
  | { type: "toggle"; id: ItemId }
  | { type: "close" }
  | { type: "tour"; id: ItemId }
  | { type: "stopTour" };

export const initialHero: HeroState = { hover: null, pinned: null, tour: null };

export function heroReducer(s: HeroState, a: HeroAction): HeroState {
  switch (a.type) {
    case "hover":
      if (s.pinned || s.hover === a.id) return s.tour ? { ...s, tour: null } : s;
      return { ...s, hover: a.id, tour: null };
    case "leave":
      return s.hover ? { ...s, hover: null } : s;
    case "pin":
      return { hover: null, pinned: a.id, tour: null };
    case "toggle":
      return s.pinned === a.id ? { hover: null, pinned: null, tour: null } : { hover: null, pinned: a.id, tour: null };
    case "close":
      return s.pinned || s.hover || s.tour ? initialHero : s;
    case "tour":
      return s.pinned || s.hover ? s : { ...s, tour: a.id };
    case "stopTour":
      return s.tour ? { ...s, tour: null } : s;
  }
}

export const shownOf = (s: HeroState) => s.pinned ?? s.hover ?? s.tour;
export const modeOf = (s: HeroState) => (s.pinned ? "pinned" : s.hover ? "hovering" : s.tour ? "touring" : "idle");
