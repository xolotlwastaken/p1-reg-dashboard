import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Singapore P1 Registration Dashboard",
  description:
    "Scraped and downloadable P1 registration vacancy and balloting data with filters, charts, and CSV exports."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
