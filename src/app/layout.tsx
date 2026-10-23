import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Finder",
  description: "Track job applications and find matching openings",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-5xl items-center gap-3 overflow-x-auto whitespace-nowrap px-4 py-3 text-sm sm:gap-4">
            <Link href="/" className="font-semibold">
              Job Finder
            </Link>
            <Link href="/" className="text-muted hover:text-foreground">
              Applications
            </Link>
            <Link href="/openings" className="text-muted hover:text-foreground">
              Openings
            </Link>
            <Link href="/settings" className="text-muted hover:text-foreground">
              Settings
            </Link>
            <form action="/auth/signout" method="post" className="ml-auto">
              <button className="text-muted hover:text-foreground">Sign out</button>
            </form>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
