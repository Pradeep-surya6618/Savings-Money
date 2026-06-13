import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SwRegister } from "@/components/pwa/sw-register";

const sans = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const display = Sora({ variable: "--font-sora", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FuFi — Future Financial",
  description: "FuFi (Future Financial) — manage your salary, allocations, savings & more",
  applicationName: "FuFi",
  appleWebApp: { capable: true, title: "FuFi", statusBarStyle: "black-translucent" },
  icons: { apple: "/Icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#080c0a" },
  ],
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
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <SwRegister />
        <style href="view-transition-theme" precedence="high">
          {VIEW_TRANSITION_CSS}
        </style>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
