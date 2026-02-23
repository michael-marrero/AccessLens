import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "AccessLens AI",
  description: "Identity access risk triage and policy assistant"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <TopNav />
          <main className="mt-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
