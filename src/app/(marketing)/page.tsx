import Link from "next/link";

import { Library, MessageSquare, Search } from "lucide-react";

const features = [
  {
    icon: Library,
    title: "Your Personal Library",
    description:
      "Upload PDFs, Markdown, text files, and URLs. Each document becomes a tome in your curated collection.",
  },
  {
    icon: Search,
    title: "Intelligent Search",
    description:
      "Find answers across all your documents with hybrid semantic and keyword search, powered by AI.",
  },
  {
    icon: MessageSquare,
    title: "Ask the Librarian",
    description:
      "Chat with your documents and get answers with verified citations from original sources.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center md:py-32">
        <h1 className="font-heading text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
          The Codex
        </h1>
        <p className="mt-4 max-w-2xl font-body text-lg text-muted-foreground md:text-xl">
          Your AI-powered personal knowledge base. Upload your documents, ask
          questions, and get answers with verified citations.
        </p>
        <Link
          href="/sign-up"
          className="mt-8 rounded-md bg-primary px-8 py-3 font-ui text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Get Started
        </Link>
      </section>

      <section className="border-t border-border px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="flex flex-col items-center rounded-lg border border-border bg-card p-6 text-center"
              >
                <div className="mb-4 rounded-full bg-accent p-3">
                  <Icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="font-heading text-lg font-bold text-card-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
