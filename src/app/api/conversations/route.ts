import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/clients/prisma";
import { getOrCreateUser } from "@/src/lib/auth/get-or-create-user";

import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authResult = await getOrCreateUser();

    if (authResult.error) {
      const status = authResult.error === "unauthorized" ? 401 : 500;
      return NextResponse.json({ error: authResult.error }, { status });
    }

    const user = authResult.user;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10))
    );
    const skip = (page - 1) * pageSize;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true },
          },
        },
      }),
      prisma.conversation.count({ where: { userId: user.id } }),
    ]);

    const data = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      documentId: conv.documentId,
      updatedAt: conv.updatedAt,
      lastMessage: conv.messages[0]?.content ?? null,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
