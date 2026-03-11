"use client";

import { useQuery } from "@tanstack/react-query";

import type { Document } from "@/src/types/database";
import type { ApiSuccessResponse } from "@/src/types/api";

const POLLING_INTERVAL_MS = 3000;

export function useDocumentStatus(id: string) {
  const query = useQuery<ApiSuccessResponse<Document>>({
    queryKey: ["document", id],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Document not found");
        }
        throw new Error("Failed to fetch document");
      }

      return response.json() as Promise<ApiSuccessResponse<Document>>;
    },
    refetchInterval: (query) => {
      const document = query.state.data?.data;
      if (document?.status === "processing") {
        return POLLING_INTERVAL_MS;
      }
      return false;
    },
    enabled: !!id,
  });

  return {
    document: query.data?.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
