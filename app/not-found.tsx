import Link from "next/link";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";

export default function NotFound() {
  return (
    <div className="wrap">
      <SiteHeader cta={false} />
      <main className="prose">
        <h1>We couldn&apos;t find that page.</h1>
        <p>If you scanned a tag, check the code printed on it and try typing it again.</p>
        <p>
          <Link href="/">Go to the IntroBand home page</Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
