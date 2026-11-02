"use client";

import { useState } from "react";
import { TAG_PLACES } from "@/lib/items";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "ok" } | { kind: "error"; message: string };

export default function WaitlistForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({ kind: "error", message: "Enter an email address like name@example.com." });
      return;
    }
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, place: data.get("place"), age: data.get("age"), website: data.get("website") }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong. Try again in a minute.");
      setState({ kind: "ok" });
      form.reset();
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div>
        <label htmlFor="wl-email">Your email</label>
        <input id="wl-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </div>
      <div>
        <label htmlFor="wl-place">Where would your child actually keep a tag?</label>
        <select id="wl-place" name="place" defaultValue="Shoe">
          {TAG_PLACES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="wl-age">Child&apos;s age range</label>
        <select id="wl-age" name="age" defaultValue="4-7">
          <option>Under 4</option>
          <option>4-7</option>
          <option>8-12</option>
          <option>13-17</option>
          <option>Adult</option>
        </select>
      </div>
      {/* Hidden from people; bots tend to fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
      <button className="btn" type="submit" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Joining…" : "Join the waitlist"}
      </button>
      <div aria-live="polite">
        {state.kind === "ok" && <p className="ok">You&apos;re on the list. We&apos;ll email you when starter kits are ready.</p>}
        {state.kind === "error" && <p className="err">{state.message}</p>}
      </div>
      <p className="fine">IntroBand is not a GPS tracker. In an emergency, call 911.</p>
    </form>
  );
}
