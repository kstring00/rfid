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
          <div className="eyebrow">One profile. Many places.</div>
          <h1>One profile. Everything they love.</h1>
          <p className="sub">
            Put IntroBand on the shoe, bag, toy or headphones your child never leaves behind. Anyone can tap or scan to meet them.
          </p>
        </section>

        <Hero3D />

        <section className="ways" aria-labelledby="ways-title">
          <h2 id="ways-title" className="eyebrow" style={{ gridColumn: "1 / -1", margin: 0 }}>
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

        <section className="cta" id="waitlist" aria-labelledby="wl-title">
          <div>
            <h2 id="wl-title">Make what they already love speak for them.</h2>
            <p className="lede">
              One profile for your child, on the things they never leave behind. Starter kits go to the first families on the list.
            </p>
          </div>
          <WaitlistForm />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
