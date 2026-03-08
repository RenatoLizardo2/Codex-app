import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { clerkWebhookEventSchema } from "@/src/lib/validations/user";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Webhook] CLERK_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing Svix headers" },
      { status: 401 }
    );
  }

  const body = await request.text();

  const wh = new Webhook(webhookSecret);
  let payload: unknown;

  try {
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    console.error("[Webhook] Invalid signature");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  const result = clerkWebhookEventSchema.safeParse(payload);

  if (!result.success) {
    // Unknown event type — log and return 200 (Clerk may add new events)
    console.log("[Webhook] Unhandled event type, skipping:", payload);
    return NextResponse.json({ received: true });
  }

  const event = result.data;

  switch (event.type) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name } = event.data;
      const email = email_addresses[0]?.email_address;
      console.log("[Webhook] user.created:", { id, email, first_name, last_name });
      // TODO: issue 003 — persist to database
      break;
    }
    case "user.updated": {
      const { id, email_addresses, first_name, last_name } = event.data;
      const email = email_addresses[0]?.email_address;
      console.log("[Webhook] user.updated:", { id, email, first_name, last_name });
      // TODO: issue 003 — persist to database
      break;
    }
    case "user.deleted": {
      const { id } = event.data;
      console.log("[Webhook] user.deleted:", { id });
      // TODO: issue 003 — persist to database
      break;
    }
  }

  return NextResponse.json({ received: true });
}
