import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SQL Rush",
    short_name: "SQL Rush",
    description: "Race the clock. Master SQL.",
    start_url: "/",
    display: "standalone",
    background_color: "#efeafb",
    theme_color: "#efeafb",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
