import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Surya Savings",
  description: "Personal finance manager — salary, allocations, savings & more",
};

// Delivered inline (not via the CSS bundle) so the theme "wave" reveal always
// works in dev and prod: it disables the default view-transition cross-fade so
// the JS clip-path reveal in ThemeToggle plays cleanly. See theme-toggle.tsx.
const VIEW_TRANSITION_CSS = `
::view-transition-old(root),
::view-transition-new(root){animation:none;mix-blend-mode:normal}
::view-transition-old(root){z-index:0}
::view-transition-new(root){z-index:1}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <style href="view-transition-theme" precedence="high">
          {VIEW_TRANSITION_CSS}
        </style>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
