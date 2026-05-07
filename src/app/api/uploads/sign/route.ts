import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canUploadModule, getRequestActor } from "@/lib/auth";
import { getS3Client, getStorageConfig } from "@/lib/storage";

const signSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  module: z.enum(["portfolio", "resources", "media", "tools"]),
});

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getRequestActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = signSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    }

    const { filename, mimeType, module } = parsed.data;
    if (!canUploadModule(actor.role, module)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const key = `${module}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeFilename(filename)}`;

    const client = getS3Client();
    const config = getStorageConfig();

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const publicUrl = config.publicBaseUrl ? `${config.publicBaseUrl.replace(/\/$/, "")}/${key}` : null;

    return NextResponse.json({
      uploadUrl,
      key,
      bucket: config.bucket,
      publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sign upload" },
      { status: 500 },
    );
  }
}
