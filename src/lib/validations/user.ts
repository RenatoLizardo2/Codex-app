import { z } from "zod";

const clerkEmailSchema = z.object({
  email_address: z.string().email(),
  id: z.string(),
});

const clerkUserDataSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email_addresses: z.array(clerkEmailSchema).min(1),
  image_url: z.string().url().optional(),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
});

export const clerkWebhookEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("user.created"),
    data: clerkUserDataSchema,
  }),
  z.object({
    type: z.literal("user.updated"),
    data: clerkUserDataSchema,
  }),
  z.object({
    type: z.literal("user.deleted"),
    data: z.object({
      id: z.string(),
      deleted: z.boolean().optional(),
    }),
  }),
]);

export type ClerkWebhookEvent = z.infer<typeof clerkWebhookEventSchema>;
export type ClerkUserData = z.infer<typeof clerkUserDataSchema>;
