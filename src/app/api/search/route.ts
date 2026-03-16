import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { prisma } from "@/src/lib/clients/prisma";
import { searchQuerySchema } from "@/src/lib/validations/rag";
import { retrieveContext } from "@/src/lib/rag/pipeline";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const validated = searchQuerySchema.parse(body);

    const chunks = await retrieveContext(validated.query, user.id, {
      documentId: validated.documentId,
      topK: validated.topK,
    });

    return NextResponse.json({
      data: {
        chunks,
        query: validated.query,
        totalResults: chunks.length,
      },
    });
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

    console.error("[API] POST /api/search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
