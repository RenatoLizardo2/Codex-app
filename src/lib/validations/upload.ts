import { z } from "zod";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = ["application/pdf", "text/markdown", "text/plain"] as const;

export const uploadFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, "File must be 10MB or smaller")
    .refine(
      (file) => (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type),
      "Only PDF, Markdown, and plain text files are allowed"
    ),
});

export const uploadUrlSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
