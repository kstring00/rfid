import type { Metadata } from "next";
import PitchHero from "./PitchHero";

export const metadata: Metadata = {
  title: "IntroBand™ Pitch",
  description: "Full-screen presentation mode for IntroBand. Use the arrow keys to move through the items.",
  robots: { index: false, follow: false },
};

export default function PitchPage() {
  return (
    <main>
      <h1 className="srOnly">IntroBand pitch</h1>
      <PitchHero />
    </main>
  );
}
