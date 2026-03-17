import { z } from "zod";

export const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  documentId: z.string().uuid("Invalid document ID").optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(10000),
  conversationId: z.string().uuid("Invalid conversation ID"),
});

export const chatRequestSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(10000),
  conversationId: z.string().optional(),
  documentId: z.string().optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
