import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthGuard } from "./auth-guard";
import { AppShell } from "./app-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "processOS",
  description: "JSON-defined processes, state in your DB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full min-h-0 overflow-hidden">
      <body
        className={`${inter.variable} h-full min-h-0 overflow-hidden font-sans antialiased`}
      >
        <AuthGuard>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </body>
    </html>
  );
}
