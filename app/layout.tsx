import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claw Vault | Secure HTML Library",
  description: "A premium, secure environment for reviewing and managing generated HTML documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
