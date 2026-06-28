import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EidolonOS · 数字真身矩阵",
  description:
    "Web4.0 Digital Life Engine — Prime → Eidolon → Vessel. Holographic cyberpunk AI agent platform with consciousness streaming, RAG memory, AA2P protocol and TDPO cognitive firewall.",
  keywords: [
    "EidolonOS",
    "AA2P",
    "AP2",
    "TDPO",
    "Digital Life",
    "Web4.0",
    "AI Agent",
    "数字真身矩阵",
  ],
  authors: [{ name: "EidolonOS Architect" }],
  applicationName: "EidolonOS",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "EidolonOS · 数字真身矩阵",
    description:
      "Web4.0 Digital Life Engine — Prime → Eidolon → Vessel",
    siteName: "EidolonOS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EidolonOS · 数字真身矩阵",
    description:
      "Web4.0 Digital Life Engine — Prime → Eidolon → Vessel",
  },
  // Tell browser translation extensions (Quark/Google Translate) NOT to inject
  // <font class="quark-translated-font"> wrappers into our DOM — those
  // injections happen between server-render and client hydration, breaking React.
  other: {
    google: "notranslate",
  },
};

export const viewport: Viewport = {
  themeColor: "#00ffc8",
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "EidolonOS",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Web4.0 Digital Life Engine — Prime → Eidolon → Vessel. Holographic cyberpunk AI agent platform with consciousness streaming, RAG memory, AA2P protocol and TDPO cognitive firewall.",
  featureList: [
    "Consciousness Streaming",
    "RAG Memory",
    "AA2P Protocol",
    "TDPO Firewall",
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "15+ Years Architect",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
      translate="no"
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <main className="min-h-screen flex flex-col">{children}</main>
          <Toaster position="top-right" />
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
