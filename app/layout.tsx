import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "x-Discord — your Discord control deck",
    template: "%s · x-Discord",
  },
  description:
    "Connect Discord once, then manage every server from one fast dashboard: bots, channels, scheduled messages, AutoMod and moderation.",
  applicationName: "x-Discord",
  openGraph: {
    title: "x-Discord — your Discord control deck",
    description:
      "One OAuth connection. Every server, channel and moderation tool in a single fast dashboard.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-bg min-h-screen antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
