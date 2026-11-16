import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voice Expense",
    short_name: "Expenses",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f4",
    theme_color: "#1f5fd1",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
