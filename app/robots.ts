import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL || "https://logbook.rossinisolutions.com";

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/icon.png",
        "/favicon.ico",
      ],
      disallow: [
        "/logbook",
        "/societa",
        "/onboarding",
        "/settings",
        "/api",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
