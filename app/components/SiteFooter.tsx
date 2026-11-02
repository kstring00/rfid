import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="foot">
      <span>© {new Date().getFullYear()} IntroBand™</span>
      <span>
        First name only. No address. Parents control everything. · <Link href="/privacy">Privacy</Link>
      </span>
    </footer>
  );
}
