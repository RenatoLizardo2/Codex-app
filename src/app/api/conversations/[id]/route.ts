import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/src/lib/clients/prisma";
import { getOrCreateUser } from "@/src/lib/auth/get-or-create-user";

import type { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateTitleSchema = z.object({
  title: z.string().min(1).max(200),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await getOrCreateUser();

    if (authResult.error) {
      const status = authResult.error === "unauthorized" ? 401 : 500;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    const user = authResult.user;

    const { id } = await context.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
    });

    if (!conversation || conversation.userId !== user.id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: conversation });
  } catch (error) {
    console.error("[API] GET /api/conversations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await getOrCreateUser();

    if (authResult.error) {
      const status = authResult.error === "unauthorized" ? 401 : 500;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    const user = authResult.user;

    const { id } = await context.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation || conversation.userId !== user.id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const body: unknown = await request.json();
    const validated = updateTitleSchema.parse(body);

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title: validated.title },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("[API] PATCH /api/conversations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const authResult = await getOrCreateUser();

    if (authResult.error) {
      const status = authResult.error === "unauthorized" ? 401 : 500;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    const user = authResult.user;

    const { id } = await context.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation || conversation.userId !== user.id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Cascade delete handles messages
    await prisma.conversation.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[API] DELETE /api/conversations/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
