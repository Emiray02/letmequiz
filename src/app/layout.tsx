import type { Metadata, Viewport } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import PwaRegister from "@/components/pwa-register";
import BottomNav from "@/components/bottom-nav";
import ProfileGate from "@/components/profile-gate";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c14" },
  ],
};

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LetMeQuiz — Almanca öğrenme stüdyosu",
    template: "%s · LetMeQuiz",
  },
  description:
    "Almanca sınavına hazırlanmanın en akıllı yolu. CEFR planı, der/die/das, fiil çekimleri, diktat, dinleme, AI özet ve kişisel quizler — hepsi tek uygulamada.",
  manifest: "/manifest.webmanifest",
  applicationName: "LetMeQuiz",
  keywords: ["almanca","deutsch","telc","goethe","der die das","flashcard","AI","dil öğrenme","quiz"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${spaceGrotesk.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <PwaRegister />
        <ProfileGate>
          <div className="app-shell">{children}</div>
          <BottomNav />
        </ProfileGate>
      </body>
    </html>
  );
}
