import "./globals.css";

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";

import { Providers } from "@/app/providers";
import { DevAccountSwitcher } from "@/components/dev/DevAccountSwitcher";
import { RouteLoadingOverlay } from "@/components/navigation/RouteLoadingOverlay";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DEV_ACCOUNT_SWITCHER_ENABLED } from "@/lib/dev/test-account-definitions";
import { themeScript } from "@/lib/theme";

const geistSans = localFont({
  src: [
    {
      path: "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../node_modules/next/dist/next-devtools/server/font/geist-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: [
    {
      path: "../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../node_modules/next/dist/next-devtools/server/font/geist-mono-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "RecruitFlow",
  description:
    "A monochrome recruiting workspace for member collaboration, candidate reviews, and subscription-managed growth.",
};

export const viewport: Viewport = {
  maximumScale: 1,
};

export const dynamic = "force-dynamic";

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-[100dvh] bg-background text-foreground">
        <Script id="theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          <Providers>
            <Suspense fallback={null}>
              <RouteLoadingOverlay />
            </Suspense>
            {DEV_ACCOUNT_SWITCHER_ENABLED ? <DevAccountSwitcher /> : null}
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
