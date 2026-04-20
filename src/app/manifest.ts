import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LetMeQuiz",
    short_name: "LetMeQuiz",
    description: "Flashcards, quiz practice, AI study workbench, and class mode.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7ef",
    theme_color: "#0f172a",
    lang: "en",
    categories: ["education", "productivity"],
    icons: [
      { src: "/logo.png", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "any", type: "image/png", purpose: "maskable" },
    ],
  };
}
