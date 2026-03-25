import { auth, clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/src/lib/clients/prisma";

import type { User } from "@prisma/client";

type AuthResult =
  | { user: User; error?: never }
  | { user?: never; error: "unauthorized" | "clerk_error" };

/**
 * Authenticate the current request and ensure the user exists in the database.
 * If the user is authenticated via Clerk but missing from the DB (e.g. webhook
 * never fired in local dev), the user is created automatically.
 */
export async function getOrCreateUser(): Promise<AuthResult> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return { error: "unauthorized" };
  }

  // Try to find existing user first
  const existing = await prisma.user.findUnique({ where: { clerkId } });

  if (existing) {
    return { user: existing };
  }

  // User missing in DB — fetch from Clerk and create
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      "User";

    const user = await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, email, name },
      update: { email, name },
    });

    console.log("[Auth] Auto-created user from Clerk:", { clerkId, email });

    return { user };
  } catch (error) {
    console.error("[Auth] Failed to fetch/create user from Clerk:", error);
    return { error: "clerk_error" };
  }
}
