import { Playfair_Display, Lora, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { ThemeProvider } from "@/src/components/providers/theme-provider";
import { QueryProvider } from "@/src/components/providers/query-provider";
import { siteConfig } from "@/src/config/site";
import "./globals.css";

import type { Metadata } from "next";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["700"],
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  weight: ["400", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${lora.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <ClerkProvider>
          <ThemeProvider>
            <QueryProvider>
              {children}
            </QueryProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
