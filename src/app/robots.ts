import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** ログインが必要な画面・運営の画面・求職の投稿は検索エンジンに載せない */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/me",
        "/employer",
        "/messages",
        "/seekers",
        "/settings",
        "/ops",
        "/axis",
        "/api",
        "/welcome",
        "/agency",
        "/invite",
      ],
    },
    sitemap: `${env().APP_URL}/sitemap.xml`,
  };
}
