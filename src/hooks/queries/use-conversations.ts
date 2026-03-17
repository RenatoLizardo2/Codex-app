"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { ConversationListItem } from "@/src/types/chat";
import type { PaginatedResponse } from "@/src/types/api";

type UseConversationsOptions = {
  page?: number;
  pageSize?: number;
};

export function useConversations(options: UseConversationsOptions = {}) {
  const { page = 1, pageSize = 20 } = options;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const query = useQuery<PaginatedResponse<ConversationListItem>>({
    queryKey: ["conversations", { page, pageSize }],
    queryFn: async () => {
      const response = await fetch(`/api/conversations?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      return response.json() as Promise<PaginatedResponse<ConversationListItem>>;
    },
  });

  return {
    conversations: query.data?.data ?? [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useConversation(id: string | null) {
  const query = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch conversation");
      }

      const json = await response.json();
      return json.data as {
        id: string;
        title: string;
        documentId: string | null;
        messages: {
          id: string;
          role: string;
          content: string;
          citations: unknown;
          createdAt: string;
        }[];
      };
    },
    enabled: !!id,
  });

  return {
    conversation: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (conversationId) => {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
