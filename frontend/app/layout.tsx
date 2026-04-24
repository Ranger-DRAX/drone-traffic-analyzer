import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Drone Traffic Analyzer | ANTS",
  description:
    "Upload MP4 drone footage to automatically detect, track, and count vehicles using YOLO + ByteTrack. Get annotated video playback and downloadable CSV reports.",
  keywords: ["drone", "traffic", "vehicle detection", "YOLO", "computer vision", "ANTS"],
  authors: [{ name: "ANTS Engineering" }],
  robots: "noindex,nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
