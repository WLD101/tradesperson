import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { RealtimeToaster } from "../components/notifications/realtime-toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradesperson.net"),
  title: {
    default: "Tradesperson Network",
    template: "%s | Tradesperson Network",
  },
  description: "The digital world for trades. One connected network for every trade, every customer, and every job.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/brand/tradesperson-erp-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body>
        {children}
        <RealtimeToaster />
      </body>
    </html>
  );
}
