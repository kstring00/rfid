import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://introband.com";
  // Tag profile pages (/t/...) must never be indexed.
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/t/", "/api/"] }], sitemap: `${site}/sitemap.xml` };
}
