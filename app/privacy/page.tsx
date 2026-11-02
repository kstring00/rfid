import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy | IntroBand™",
  description: "How IntroBand handles waitlist emails and children's profile information. Parents own and control every profile.",
};

export default function Privacy() {
  return (
    <div className="wrap">
      <SiteHeader cta={false} />
      <main className="prose">
        <div className="eyebrow">Last updated November 2, 2026</div>
        <h1>Privacy Policy</h1>
        <p>
          IntroBand is built for families of autistic and neurodivergent kids. We collect as little as possible, and the parent or guardian
          controls everything about their child&apos;s profile.
        </p>
        <h2>The waitlist</h2>
        <p>
          When you join the waitlist we save your email address, where you said your child would keep a tag, and their age range. We use this only
          to tell you when starter kits are available and to decide which tag styles to make first. We never sell it.
        </p>
        <h2>Children&apos;s profiles (when the parent app launches)</h2>
        <ul>
          <li>The parent or guardian is the account holder. Children do not create accounts.</li>
          <li>Profiles show a first name only. We never ask for a last name, address or school.</li>
          <li>The parent chooses what appears on the profile and can change or remove it at any time.</li>
          <li>When someone sends a message through a tag, it comes through IntroBand. The finder never sees your phone number or email.</li>
          <li>Location is only shared if the person who finds your child chooses to share it.</li>
          <li>Deleting your account deletes your children&apos;s profiles and tag history.</li>
        </ul>
        <h2>Safety</h2>
        <p>IntroBand is not a GPS tracker and is not an emergency service. In an emergency, call 911.</p>
        <h2>Contact</h2>
        <p>Questions or deletion requests: kyle@stringhamwebdesign.com</p>
      </main>
      <SiteFooter />
    </div>
  );
}
