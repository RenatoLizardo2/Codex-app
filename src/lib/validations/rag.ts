import { z } from "zod";

export const triggerEmbeddingsSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export const searchQuerySchema = z.object({
  query: z.string().min(1, "Query is required").max(2000, "Query is too long"),
  documentId: z.string().optional(),
  topK: z.number().int().min(1).max(50).optional(),
});

export type TriggerEmbeddingsInput = z.infer<typeof triggerEmbeddingsSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
