import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discord-lite MVP",
  description: "Servers, channels, text chat, and voice."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
