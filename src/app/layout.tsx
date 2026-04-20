import type { Metadata, Viewport } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import PwaRegister from "@/components/pwa-register";
import AppShell from "@/components/app-shell";
import ProfileGate from "@/components/profile-gate";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
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
  metadataBase: new URL("https://letmequiz.vercel.app"),
  title: {
    default: "LetMeQuiz — Almanca öğrenme stüdyosu",
    template: "%s · LetMeQuiz",
  },
  description:
    "Almanca sınavına hazırlanmanın en akıllı yolu. CEFR planı, der/die/das, fiil çekimleri, diktat, dinleme, AI özet ve kişisel quizler — hepsi tek uygulamada.",
  manifest: "/manifest.webmanifest",
  applicationName: "LetMeQuiz",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png" }],
    shortcut: ["/logo.png"],
  },
  keywords: ["almanca","deutsch","telc","goethe","der die das","flashcard","AI","dil öğrenme","quiz"],
  alternates: { canonical: "https://letmequiz.vercel.app" },
  openGraph: {
    type: "website",
    url: "https://letmequiz.vercel.app",
    siteName: "LetMeQuiz",
    title: "LetMeQuiz — Almanca öğrenme stüdyosu",
    description:
      "Sınav odaklı Almanca çalışma planı, AI geri bildirimli yazma/konuşma, sitcom kliplerle gerçek dil.",
    locale: "tr_TR",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${spaceGrotesk.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <PwaRegister />
        <ProfileGate>
          <AppShell>{children}</AppShell>
        </ProfileGate>
      </body>
    </html>
  );
}
