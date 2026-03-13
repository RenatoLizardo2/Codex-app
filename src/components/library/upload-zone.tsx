"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";

import { cn } from "@/src/lib/utils/cn";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/src/lib/validations/upload";

type UploadZoneProps = {
  onUpload: (file: File) => void;
  onUrlSubmit: (url: string) => void;
  isUploading?: boolean;
  progress?: number;
};

export function UploadZone({
  onUpload,
  onUrlSubmit,
  isUploading = false,
  progress = 0,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      return "Only PDF, Markdown, and plain text files are allowed";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File must be 10MB or smaller";
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onUpload(file);
    },
    [onUpload, validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [handleFile]
  );

  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = urlValue.trim();
      if (!trimmed) return;

      try {
        new URL(trimmed);
      } catch {
        setError("Please enter a valid URL");
        return;
      }

      setError(null);
      onUrlSubmit(trimmed);
      setUrlValue("");
    },
    [urlValue, onUrlSubmit]
  );

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center",
          "rounded-lg border-2 border-dashed p-8 transition-colors",
          "bg-card/50",
          isDragOver
            ? "border-primary bg-accent"
            : "border-border hover:border-primary/50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.md,.txt,text/markdown,text/plain,application/pdf"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <Upload className="h-10 w-10 text-muted-foreground" />

        <p className="mt-3 font-body text-sm text-foreground">
          Drop your document here or click to browse
        </p>

        <p className="mt-1 font-ui text-xs text-muted-foreground">
          PDF, Markdown, Plain Text · Max 10MB
        </p>

        {isUploading && (
          <div className="mt-4 w-full max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-center font-ui text-xs text-muted-foreground">
              Uploading... {Math.round(progress)}%
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleUrlSubmit} className="flex gap-2">
        <input
          type="text"
          value={urlValue}
          onChange={(e) => {
            setUrlValue(e.target.value);
            setError(null);
          }}
          placeholder="https://..."
          disabled={isUploading}
          className={cn(
            "flex-1 rounded-md border border-input bg-card px-3 py-2",
            "font-ui text-sm text-foreground placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        <button
          type="submit"
          disabled={isUploading || !urlValue.trim()}
          className={cn(
            "rounded-md px-4 py-2",
            "bg-primary text-primary-foreground",
            "font-ui text-sm font-medium",
            "hover:opacity-90 transition-opacity",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          Add
        </button>
      </form>

      {error && (
        <p className="font-ui text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
