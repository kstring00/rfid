import type { Metadata, Viewport } from "next";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://introband.com";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "IntroBand™ | Tap-to-meet tags for autistic and neurodivergent kids",
  description:
    "IntroBand puts your child's introduction on the shoe, bag, toy or headphones they never leave behind. Anyone can tap or scan to meet them. No app needed.",
  openGraph: {
    title: "IntroBand™ | One profile. Everything they love.",
    description: "Tap-to-meet NFC and QR tags for autistic and neurodivergent kids. Join the waitlist for the starter kit.",
    url: site,
    siteName: "IntroBand",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "IntroBand badge on a sneaker, backpack, fidget, teddy bear and headphones" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export const viewport: Viewport = { themeColor: "#fdf7ee", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Figtree:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
