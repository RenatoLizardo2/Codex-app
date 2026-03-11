"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Document } from "@/src/types/database";
import type { PaginatedResponse, ApiSuccessResponse } from "@/src/types/api";

type UseDocumentsOptions = {
  page?: number;
  pageSize?: number;
  status?: string;
};

export function useDocuments(options: UseDocumentsOptions = {}) {
  const { page = 1, pageSize = 20, status } = options;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (status) params.set("status", status);

  const query = useQuery<PaginatedResponse<Document>>({
    queryKey: ["documents", { page, status }],
    queryFn: async () => {
      const response = await fetch(`/api/documents?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      return response.json() as Promise<PaginatedResponse<Document>>;
    },
  });

  return {
    documents: query.data?.data ?? [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation<ApiSuccessResponse<Document>, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ?? "Failed to create document"
        );
      }

      return response.json() as Promise<ApiSuccessResponse<Document>>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useCreateDocumentFromUrl() {
  const queryClient = useQueryClient();

  return useMutation<
    ApiSuccessResponse<Document>,
    Error,
    { url: string; title?: string }
  >({
    mutationFn: async (payload) => {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ?? "Failed to import URL"
        );
      }

      return response.json() as Promise<ApiSuccessResponse<Document>>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (documentId) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
