import type { Item } from "@/lib/items";
import styles from "./Hero3D.module.css";

export default function ItemCard({ item, onClose, size = "page" }: { item: Item; onClose?: () => void; size?: "page" | "pitch" }) {
  return (
    <div className={`${styles.card} ${size === "pitch" ? styles.cardPitch : ""}`} role="region" aria-live="polite" aria-label={item.title} id="hero-card">
      {onClose && (
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
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
          <li key={u} style={{ animationDelay: `${120 + i * 50}ms` }}>
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
  );
}
