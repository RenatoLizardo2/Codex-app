import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";

import { prisma } from "@/src/lib/clients/prisma";
import { extractText } from "@/src/lib/parsers";
import { uploadFileSchema, uploadUrlSchema, MAX_FILE_SIZE } from "@/src/lib/validations/upload";

import type { NextRequest } from "next/server";
import type { FileType } from "@/src/types/database";

function getFileType(mimeType: string): FileType | null {
  const mimeToType: Record<string, FileType> = {
    "application/pdf": "pdf",
    "text/markdown": "md",
    "text/plain": "txt",
  };
  return mimeToType[mimeType] ?? null;
}

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return handleUrlUpload(request, user.id);
  }

  return handleFileUpload(request, user.id);
}

async function handleFileUpload(request: NextRequest, userId: string) {
  const formData = await request.formData();
  const file = formData.get("file");
  const titleField = formData.get("title");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const validation = uploadFileSchema.safeParse({ file });

  if (!validation.success) {
    const message = validation.error.issues[0]?.message ?? "Invalid file";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File must be 10MB or smaller" },
      { status: 400 }
    );
  }

  const fileType = getFileType(file.type);

  if (!fileType) {
    return NextResponse.json(
      { error: "Only PDF, Markdown, and plain text files are allowed" },
      { status: 400 }
    );
  }

  const title =
    typeof titleField === "string" && titleField.trim()
      ? titleField.trim()
      : file.name;

  const blob = await put(file.name, file, { access: "public" });

  const document = await prisma.document.create({
    data: {
      userId,
      title,
      originalName: file.name,
      fileUrl: blob.url,
      fileType,
      status: "processing",
    },
  });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const content = fileType === "pdf" ? buffer : buffer.toString("utf-8");
    const parsed = await extractText(fileType, content);

    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: {
        extractedText: parsed.content,
        title: parsed.metadata.title && title === file.name
          ? parsed.metadata.title
          : title,
        status: "ready",
      },
    });

    return NextResponse.json({ data: updatedDocument }, { status: 201 });
  } catch (error) {
    console.error("[Documents] Text extraction failed:", error);

    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: { status: "error" },
    });

    return NextResponse.json({ data: updatedDocument }, { status: 201 });
  }
}

async function handleUrlUpload(request: NextRequest, userId: string) {
  const body: unknown = await request.json();
  const validation = uploadUrlSchema.safeParse(body);

  if (!validation.success) {
    const message = validation.error.issues[0]?.message ?? "Invalid URL";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { url } = validation.data;
  const titleField = (body as Record<string, unknown>).title;
  const title =
    typeof titleField === "string" && titleField.trim()
      ? titleField.trim()
      : url;

  const document = await prisma.document.create({
    data: {
      userId,
      title,
      originalName: url,
      fileUrl: url,
      fileType: "url",
      status: "processing",
    },
  });

  try {
    const parsed = await extractText("url", "", url);

    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: {
        extractedText: parsed.content,
        title: parsed.metadata.title && title === url
          ? parsed.metadata.title
          : title,
        status: "ready",
      },
    });

    return NextResponse.json({ data: updatedDocument }, { status: 201 });
  } catch (error) {
    console.error("[Documents] URL extraction failed:", error);

    const updatedDocument = await prisma.document.update({
      where: { id: document.id },
      data: { status: "error" },
    });

    return NextResponse.json({ data: updatedDocument }, { status: 201 });
  }
}

export async function GET(request: NextRequest) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const status = searchParams.get("status");

  const where = {
    userId: user.id,
    ...(status ? { status } : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json({
    data: documents,
    pagination: { total, page, pageSize },
  });
}
