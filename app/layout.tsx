import type { Metadata, Viewport } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Providers } from "./providers";

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-mulish",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NSR Canvassing",
  description: "New Standard Restoration field canvassing & door-knocking",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "NSR Canvassing" },
};

export const viewport: Viewport = {
  themeColor: "#51C5F4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mulish.variable} dark`}>
      <body className="font-sans bg-nsr-black text-nsr-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
