import type { Metadata } from "next";
import "../styles/globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Dev Tracker",
  description: "Software Development Progress Tracker",
};

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "next-themes";
import { NotificationManager } from "@/components/notification-manager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        <main className="h-screen w-screen overflow-hidden flex bg-background text-foreground selection:bg-primary/20">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <AuthProvider>
              <NotificationManager />
              {children}
              <Toaster theme="dark" position="bottom-right" richColors />
            </AuthProvider>
          </ThemeProvider>
        </main>
      </body>
    </html>
  );
}
