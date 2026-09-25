import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppProviders } from "@/components/providers/AppProviders";
import { getViewer } from "@/lib/auth";
import "./globals.css";

// Self-hosted Geist (from the `geist` package). Only the UI font is preloaded;
// the mono font is for code and can arrive a moment later.
const geistSans = localFont({
  src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "SQL Rush — Race the clock, master SQL",
    template: "%s · SQL Rush",
  },
  description:
    "A fast, competitive SQL learning game. Write, fix, predict and build SQL queries against the clock, climb the leaderboards and collect achievements.",
  applicationName: "SQL Rush",
  keywords: ["SQL", "learn SQL", "SQL game", "SQL practice", "SQL quiz", "window functions", "CTE"],
  openGraph: {
    title: "SQL Rush",
    description: "Race the clock. Master SQL. Combos, streaks, daily challenges and live leaderboards.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#04050d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans">
        <AppProviders viewer={viewer}>{children}</AppProviders>
      </body>
    </html>
  );
}
