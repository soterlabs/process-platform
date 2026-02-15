import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Process Platform",
  description: "JSON-defined processes, state in your DB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-950 text-stone-100 antialiased">{children}</body>
    </html>
  );
}
