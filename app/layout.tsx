import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaceUp — Built for teams that actually want to finish",
  description:
    "PaceUp is an AI project leader for student teams. It reads your project brief, assigns roles based on skills, and holds your team accountable until the project ships.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#39ff14",
          colorBackground: "#0a0a0f",
          colorInputBackground: "#1a1a24",
          colorInputText: "#e8e8f0",
          colorText: "#e8e8f0",
          colorTextSecondary: "#8888a8",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="min-h-screen bg-bg-primary font-body antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
