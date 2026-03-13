"use client";

import { useCallback, useState } from "react";

import {
  useCreateDocument,
  useCreateDocumentFromUrl,
} from "@/src/hooks/queries/use-documents";
import { useUIStore } from "@/src/stores/ui-store";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/src/lib/validations/upload";

export function useUpload() {
  const [error, setError] = useState<string | null>(null);

  const createDocument = useCreateDocument();
  const createFromUrl = useCreateDocumentFromUrl();
  const setUploadProgress = useUIStore((s) => s.setUploadProgress);
  const uploadProgress = useUIStore((s) => s.uploadProgress);

  const isUploading = createDocument.isPending || createFromUrl.isPending;

  const reset = useCallback(() => {
    setError(null);
    setUploadProgress(0);
    createDocument.reset();
    createFromUrl.reset();
  }, [setUploadProgress, createDocument, createFromUrl]);

  const uploadFile = useCallback(
    async (file: File, title?: string) => {
      setError(null);

      if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
        setError("Only PDF, Markdown, and plain text files are allowed");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("File must be 10MB or smaller");
        return;
      }

      setUploadProgress(30);

      const formData = new FormData();
      formData.append("file", file);
      if (title) formData.append("title", title);

      try {
        setUploadProgress(60);
        await createDocument.mutateAsync(formData);
        setUploadProgress(100);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        setUploadProgress(0);
      }
    },
    [createDocument, setUploadProgress]
  );

  const uploadUrl = useCallback(
    async (url: string, title?: string) => {
      setError(null);
      setUploadProgress(30);

      try {
        setUploadProgress(60);
        await createFromUrl.mutateAsync({ url, title });
        setUploadProgress(100);
      } catch (err) {
        const message = err instanceof Error ? err.message : "URL import failed";
        setError(message);
        setUploadProgress(0);
      }
    },
    [createFromUrl, setUploadProgress]
  );

  return {
    uploadFile,
    uploadUrl,
    isUploading,
    progress: uploadProgress,
    error,
    reset,
  };
}
