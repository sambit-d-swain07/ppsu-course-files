import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PPSU Course Files - Faculty Course File Management & Evaluation",
  description: "P P Savani University - School of Engineering Faculty Course File Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
