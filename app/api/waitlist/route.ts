import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TAG_PLACES } from "@/lib/items";

const AGES = ["Under 4", "4-7", "8-12", "13-17", "Adult"];
const hits = new Map<string, { n: number; t: number }>();

export async function POST(req: Request) {
  // Light per-instance rate limit: 5 signups per IP per 10 minutes.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.t < 600_000 && h.n >= 5) {
    return NextResponse.json({ error: "Too many tries. Wait a few minutes and try again." }, { status: 429 });
  }
  hits.set(ip, h && now - h.t < 600_000 ? { n: h.n + 1, t: h.t } : { n: 1, t: now });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ ok: true }); // honeypot

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter an email address like name@example.com." }, { status: 400 });
  }
  const place = TAG_PLACES.includes(body.place as (typeof TAG_PLACES)[number]) ? String(body.place) : null;
  const age = AGES.includes(String(body.age)) ? String(body.age) : null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Waitlist: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
    return NextResponse.json({ error: "The waitlist isn't connected yet. Please try again soon." }, { status: 503 });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from("waitlist").upsert({ email, tag_place: place, age_range: age }, { onConflict: "email" });
  if (error) {
    console.error("Waitlist insert failed", error.message);
    return NextResponse.json({ error: "We couldn't save that. Try again in a minute." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
