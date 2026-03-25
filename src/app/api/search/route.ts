import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateUser } from "@/src/lib/auth/get-or-create-user";
import { searchQuerySchema } from "@/src/lib/validations/rag";
import { retrieveContext } from "@/src/lib/rag/pipeline";

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getOrCreateUser();

    if (authResult.error) {
      const status = authResult.error === "unauthorized" ? 401 : 500;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    const user = authResult.user;

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
