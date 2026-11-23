import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// /pay/* is intentionally omitted, matching the robots.txt decision: invoice
// payment links are per-recipient pages, not indexable content.
const ROUTES = [
  "/",
  "/create",
  "/dashboard",
  "/history",
  "/activity",
  "/help",
  "/pitch",
  "/withdraw",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));
}
