import "./globals.css";

import { dehydrate } from "@tanstack/react-query";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Suspense } from "react";

import { Providers } from "@/app/providers";
import { RouteLoadingOverlay } from "@/components/navigation/RouteLoadingOverlay";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getCurrentUser, getTeamForUser } from "@/lib/db/queries";
import {
  currentTeamQueryOptions,
  currentUserQueryOptions,
} from "@/lib/query/options";
import { createQueryClient } from "@/lib/query/query-client";
import { toQueryDto } from "@/lib/query/types";
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
    "A monochrome recruiting workspace for team collaboration, candidate reviews, and subscription-managed growth.",
};

export const viewport: Viewport = {
  maximumScale: 1,
};

export const dynamic = "force-dynamic";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const queryClient = createQueryClient(); // server temp queryclient https://tanstack.com/query/v5/docs/framework/react/guides/ssr#using-the-hydration-apis

  await Promise.all([
    queryClient.prefetchQuery({
      ...currentUserQueryOptions(),
      queryFn: async () => toQueryDto(await getCurrentUser()),
    }),
    queryClient.prefetchQuery({
      ...currentTeamQueryOptions(),
      queryFn: async () => toQueryDto(await getTeamForUser()),
    }),
  ]);

  const dehydratedState = dehydrate(queryClient); // Server Query Cache JSON Snapshot, https://tanstack.com/query/v5/docs/framework/react/guides/ssr#using-the-hydration-apis

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
          <Providers dehydratedState={dehydratedState}>
            <Suspense fallback={null}>
              <RouteLoadingOverlay />
            </Suspense>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
