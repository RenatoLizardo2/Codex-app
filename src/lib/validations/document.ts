import { z } from "zod";

export const FILE_TYPES = ["pdf", "md", "txt", "url"] as const;

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  fileType: z.enum(FILE_TYPES),
  sourceUrl: z.string().url("Must be a valid URL").optional(),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
