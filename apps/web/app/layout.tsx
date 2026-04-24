import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { WebVitalsReporter } from "./web-vitals-reporter";
import { APP_NAME } from "@/lib/app-brand";

const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Hunt, claim, and redeem rewards near you.",
  openGraph: {
    title: APP_NAME,
    siteName: APP_NAME,
    description: "Hunt, claim, and redeem rewards near you.",
  },
  twitter: {
    title: APP_NAME,
    card: "summary",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <WebVitalsReporter />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
