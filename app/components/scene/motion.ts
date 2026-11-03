/** One easing curve for the whole hero: cubic-bezier(.2,.8,.2,1). Shared by CSS and the 3D scene. */
export const EASE_CSS = "cubic-bezier(.2,.8,.2,1)";
export const LIFT = 0.45;
export const LIFT_MS = 520;

const X1 = 0.2,
  Y1 = 0.8,
  X2 = 0.2,
  Y2 = 1;
const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * X1 + 3 * (1 - t) * t * t * X2 + t * t * t;
const by = (t: number) => 3 * (1 - t) * (1 - t) * t * Y1 + 3 * (1 - t) * t * t * Y2 + t * t * t;
const dbx = (t: number) => 3 * (1 - t) * (1 - t) * X1 + 6 * (1 - t) * t * (X2 - X1) + 3 * t * t * (1 - X2);

/** Evaluate the easing at progress p (0..1). */
export function ease(p: number) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let t = p;
  for (let i = 0; i < 6; i++) {
    const d = dbx(t);
    if (Math.abs(d) < 1e-6) break;
    t -= (bx(t) - p) / d;
    t = Math.min(1, Math.max(0, t));
  }
  return by(t);
}
