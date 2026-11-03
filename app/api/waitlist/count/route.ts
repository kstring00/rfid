import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const MIN_TO_SHOW = 25;

/** Waitlist size for pitch mode. Returns null until there are at least 25 signups. */
export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ count: null }, { headers: { "Cache-Control": "no-store" } });
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { count, error } = await supabase.from("waitlist").select("*", { count: "exact", head: true });
  if (error || count == null) return NextResponse.json({ count: null }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ count: count >= MIN_TO_SHOW ? count : null }, { headers: { "Cache-Control": "no-store" } });
}
