import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "../styles/index.css";
import { AppToaster } from "./components/AppToaster";
import { validateServerEnv } from "@/lib/env";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "School Cloud Dashboard UI",
  description: "Figma-generated School Cloud Dashboard converted to Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  validateServerEnv();

  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <AppToaster />
        </Providers>
      </body>
    </html>
  );
}
