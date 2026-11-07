import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spotter",
  description: "Your competitive-programming spotter. Hints one step at a time, never the answer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
