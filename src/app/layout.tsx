import type { Metadata } from "next";
import "./globals.css";
import { AuthSessionProvider } from "@/src/components/auth/AuthSessionProvider";

export const metadata: Metadata = {
  title: "GRISSA - Green Research Infrastructure Sustainability Self-Assessment",
  description:
    "Green Research Infrastructure Sustainability Self-Assessment for research infrastructures and digital organisations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
