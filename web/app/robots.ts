import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Decision: /pay/* invoice pages are excluded from indexing. They are
// per-invoice payment links (thin, near-duplicate content) rather than
// marketing pages, so they add crawl noise without SEO value.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/pay/", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
