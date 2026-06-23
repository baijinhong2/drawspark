import type { Metadata } from "next";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s | DrawSpark",
    default: "Drawing Ideas Generator - Free AI Inspiration",
  },
  description:
    "Get unlimited drawing inspiration with our free AI generator. Discover cute, cool, easy things to draw.",
  applicationName: "DrawSpark",
  authors: [{ name: "DrawSpark" }],
  creator: "DrawSpark",
  publisher: "DrawSpark",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: "DrawSpark",
    locale: "en_US",
    title: "Drawing Ideas Generator - Free AI Inspiration | DrawSpark",
    description:
      "Get unlimited drawing inspiration with our free AI generator. Discover cute, cool, easy things to draw.",
    url: SITE_URL,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "DrawSpark - AI drawing ideas generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Drawing Ideas Generator - Free AI Inspiration | DrawSpark",
    description:
      "Get unlimited drawing inspiration with our free AI generator. Discover cute, cool, easy things to draw.",
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
    // Bing Webmaster Tools ownership verification. Get the value from
    // https://www.bing.com/webmasters → Settings → Site Verification.
    other: process.env.NEXT_PUBLIC_BING_VERIFICATION
      ? {
          "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION,
        }
      : undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900 antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}