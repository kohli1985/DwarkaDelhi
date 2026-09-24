import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DelhiDwarka — Local Services for Dwarka, Delhi",
  description:
    "DelhiDwarka connects residents of Dwarka, Delhi with trusted local services and community resources — all in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
