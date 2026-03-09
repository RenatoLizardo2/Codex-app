import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <Link href="/" className="font-heading text-xl font-bold text-foreground">
          The Codex
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md bg-primary px-4 py-2 font-ui text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign In
        </Link>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
