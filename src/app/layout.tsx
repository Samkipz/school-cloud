import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "../styles/index.css";
import { AppToaster } from "./components/AppToaster";
import { validateServerEnv } from "@/lib/env";

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
        <ClerkProvider>
          {children}
          <AppToaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
