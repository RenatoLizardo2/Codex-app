"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, MessageSquare } from "lucide-react";

import { DocumentSummary } from "@/src/components/library/document-summary";
import { DocumentViewer } from "@/src/components/library/document-viewer";
import { useDocumentStatus } from "@/src/hooks/queries/use-document-status";
import { cn } from "@/src/lib/utils/cn";

type DocumentPageProps = {
  params: Promise<{ id: string }>;
};

export default function DocumentPage({ params }: DocumentPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { document, isLoading, error } = useDocumentStatus(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-shimmer rounded bg-muted/60 bg-[length:200%_100%] bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="h-8 w-2/3 animate-shimmer rounded bg-muted/60 bg-[length:200%_100%] bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
          <div className="mt-4 flex gap-4">
            <div className="h-6 w-16 animate-shimmer rounded bg-muted/60 bg-[length:200%_100%] bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
            <div className="h-6 w-20 animate-shimmer rounded bg-muted/60 bg-[length:200%_100%] bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="h-6 w-24 animate-shimmer rounded bg-muted/60 bg-[length:200%_100%] bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
          <div className="mt-3 h-20 animate-shimmer rounded bg-muted/60 bg-[length:200%_100%] bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60" />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="space-y-6">
        <Link
          href="/library"
          className="inline-flex items-center gap-1 font-ui text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Link>

        <div
          className={cn(
            "flex flex-col items-center justify-center py-16 text-center",
            "rounded-lg border border-border bg-card"
          )}
        >
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">
            Document not found
          </h2>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            This document may have been deleted or you don&apos;t have access to
            it.
          </p>
          <Link
            href="/library"
            className={cn(
              "mt-6 rounded-md px-6 py-2.5",
              "bg-primary text-primary-foreground",
              "font-ui text-sm font-medium",
              "hover:opacity-90 transition-opacity"
            )}
          >
            Go to Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 font-ui text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Link>

      <DocumentViewer document={document} />

      {document.status === "ready" && (
        <button
          onClick={() => {
            router.push(`/chat?documentId=${document.id}`);
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-5 py-2.5",
            "bg-primary text-primary-foreground",
            "font-ui text-sm font-medium",
            "hover:opacity-90 transition-opacity",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Ask about this document
        </button>
      )}

      {document.status === "processing" && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border border-border bg-card p-4",
            "text-primary"
          )}
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="font-body text-sm">
            Your document is being processed. This page will update
            automatically.
          </p>
        </div>
      )}

      <DocumentSummary summary={document.summary} />
    </div>
  );
}
