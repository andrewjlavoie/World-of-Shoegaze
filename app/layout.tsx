import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { SettingsProvider } from "@/components/SettingsProvider";
import { SiteNav } from "@/components/SiteNav";
import { Shelf } from "@/components/Shelf";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "World of Shoegaze — an atlas",
  description:
    "A hand-maintained atlas of shoegaze. No accounts, no tracking. A love letter, written slowly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jetbrains.variable} ${instrument.variable}`}>
      <body data-tone="ink">
        <SettingsProvider>
          <div
            style={{ width: "100vw", minHeight: "100vh", display: "flex", flexDirection: "column" }}
          >
            <SiteNav />
            <main style={{ flex: 1, position: "relative" }}>{children}</main>
          </div>
          <Shelf />
        </SettingsProvider>
      </body>
    </html>
  );
}
