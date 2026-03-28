import type { Metadata, Viewport } from "next";
import { inter, jetbrainsMono } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadence",
  description: "Habit tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cadence",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#0a0a0a] text-white">{children}</body>
    </html>
  );
}
