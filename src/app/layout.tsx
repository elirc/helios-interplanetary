import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helios · Mission Control",
  description: "Odyssey operations console — Helios Interplanetary.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
