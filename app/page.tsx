import Hero3D from "./components/Hero3D";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import WaitlistForm from "./components/WaitlistForm";

export default function Home() {
  return (
    <div className="wrap">
      <SiteHeader />
      <main>
        <section className="head">
          <div className="eyebrow">For autistic and neurodivergent kids</div>
          <h1>One profile. Everything they love.</h1>
          <p className="sub">
            Not a wrist kid? No problem. IntroBand goes on the shoe, bag, toy or headphones your child never leaves behind, and anyone can tap or
            scan to meet them.
          </p>
        </section>

        <Hero3D />

        <section className="ways" aria-labelledby="ways-title">
          <h2 id="ways-title" className="eyebrow sectionLabel">
            Three ways in, so any phone works
          </h2>
          <div className="way">
            <h3>Tap</h3>
            <p>Any phone with NFC opens their profile in a second. No app to download.</p>
          </div>
          <div className="way">
            <h3>Scan</h3>
            <p>The QR code works on every camera phone, including ones with NFC turned off.</p>
          </div>
          <div className="way">
            <h3>Type</h3>
            <p>
              No luck with either? Type the short code, like <code>introband.com/K7Q2</code>.
            </p>
          </div>
        </section>

        <section className="steps" aria-labelledby="how-title">
          <h2 id="how-title" className="eyebrow sectionLabel">
            How it works
          </h2>
          <ol>
            <li>
              <h3>Build their profile</h3>
              <p>First name, how they communicate, what helps, what to avoid. You write it, you can change it any time.</p>
            </li>
            <li>
              <h3>Add tags to what they love</h3>
              <p>Lace one into a shoe, stick one on a fidget, sew one onto a plush. Every tag points to the same profile.</p>
            </li>
            <li>
              <h3>Anyone can meet them</h3>
              <p>A teacher, a sitter, a stranger at the park. They tap, scan or type, and see how to help your child.</p>
            </li>
          </ol>
        </section>

        <section className="safety" aria-labelledby="safety-title">
          <h2 id="safety-title">Safe by design, in plain words</h2>
          <ul>
            <li>
              <strong>Not a GPS tracker.</strong> IntroBand works when someone finds your child and taps the tag.
            </li>
            <li>
              <strong>First name only.</strong> No last name, address or school. You choose everything shown.
            </li>
            <li>
              <strong>Your number stays private.</strong> Messages come through IntroBand, so the finder never sees your phone or email.
            </li>
            <li>
              <strong>Lost a tag?</strong> Turn it off in seconds and move their profile to a new one.
            </li>
          </ul>
        </section>

        <section className="cta" id="waitlist" aria-labelledby="wl-title">
          <div>
            <h2 id="wl-title">Make what they already love speak for them.</h2>
            <p className="lede">
              Starter kits go to the first families on the list, and pricing is announced to the waitlist first. Tell us where your child would
              keep a tag so we make the right ones.
            </p>
          </div>
          <WaitlistForm />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
