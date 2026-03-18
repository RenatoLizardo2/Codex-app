"use client";

import { Children, isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/src/lib/utils/cn";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

const CITATION_REGEX = /\[(\d+)\]/g;

function styleCitations(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    const parts = node.split(CITATION_REGEX);
    if (parts.length === 1) return node;

    return parts.map((part, i) => {
      // Odd indices are the captured group (the number)
      if (i % 2 === 1) {
        return (
          <span
            key={i}
            className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1 align-baseline font-ui text-xs font-semibold text-primary"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }

  if (isValidElement<{ children?: React.ReactNode }>(node) && node.props.children) {
    return { ...node, props: { ...node.props, children: processChildren(node.props.children) } };
  }

  return node;
}

function processChildren(children: React.ReactNode): React.ReactNode {
  return Children.map(children, styleCitations);
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn("markdown-content font-body text-base leading-relaxed", className)}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-3 mt-4 font-heading text-2xl font-bold first:mt-0">
            {processChildren(children)}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-4 font-heading text-xl font-bold first:mt-0">
            {processChildren(children)}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-3 font-heading text-lg font-semibold first:mt-0">
            {processChildren(children)}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="mb-1 mt-3 font-heading text-base font-semibold first:mt-0">
            {processChildren(children)}
          </h4>
        ),
        p: ({ children }) => (
          <p className="mb-3 last:mb-0">{processChildren(children)}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/90">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 ml-1 list-none space-y-1.5 last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-1 list-none space-y-1.5 last:mb-0 [counter-reset:item]">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="relative pl-5 before:absolute before:left-0 before:top-[0.45em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/60 before:content-['']">
            {processChildren(children)}
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-3 border-primary/40 pl-4 italic text-muted-foreground last:mb-0">
            {children}
          </blockquote>
        ),
        code: ({ children, className: codeClassName }) => {
          const isInline = !codeClassName;
          if (isInline) {
            return (
              <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-sm text-primary">
                {children}
              </code>
            );
          }
          return (
            <code className={cn("block rounded-md bg-muted/30 p-4 font-mono text-sm leading-relaxed", codeClassName)}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="mb-3 overflow-x-auto rounded-md border border-border bg-card p-0 last:mb-0">
            {children}
          </pre>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
          >
            {children}
          </a>
        ),
        hr: () => (
          <hr className="my-4 border-border" />
        ),
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto last:mb-0">
            <table className="w-full border-collapse text-sm">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border bg-muted/30 px-3 py-2 text-left font-ui font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-3 py-2">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
