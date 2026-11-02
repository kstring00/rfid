import Link from "next/link";

export default function SiteHeader({ cta = true }: { cta?: boolean }) {
  return (
    <header className="bar">
      <Link href="/" className="brand" aria-label="IntroBand home">
        <b aria-hidden="true">✳</b> IntroBand™
      </Link>
      {cta && (
        <a className="navcta" href="#waitlist">
          Join the waitlist
        </a>
      )}
    </header>
  );
}
