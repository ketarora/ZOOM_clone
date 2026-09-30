import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoom",
  description: "Connect, collaborate, and celebrate from anywhere with Zoom.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F5F5F5]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
