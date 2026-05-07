import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getRequestActor, toPolicyActor } from "@/lib/auth";
import { portfolioAssetsScopeWhere } from "@/lib/policy";
import { getDb } from "@/lib/db";
import { assets } from "@/lib/schema";
import { getS3Client, getStorageConfig } from "@/lib/storage";

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9.\-_ ]/g, "_").trim() || "download";
}

function filenameFromStorageKey(storageKey: string) {
  const base = storageKey.split("/").pop() || "download";
  // Keys are generated like `${uuid}-${originalFilename}`. Strip UUID prefix if present.
  const match = base.match(/^[0-9a-fA-F-]{36}-(.+)$/);
  return safeFilename(match?.[1] ?? base);
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const row = await db
    .select({
      id: assets.id,
      module: assets.module,
      storageKey: assets.storageKey,
      uploadedBy: assets.uploadedBy,
      title: assets.title,
      mimeType: assets.mimeType,
    })
    .from(assets)
    .where(eq(assets.id, params.id))
    .limit(1);

  if (!row[0]) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const isOwner = row[0].uploadedBy === actor.dbUserId;
  const canRead =
    actor.role === "admin" ||
    actor.role === "teacher" ||
    (actor.role === "marketing" && (row[0].module === "media" || row[0].module === "resources")) ||
    (actor.role === "student" && row[0].module === "portfolio") ||
    isOwner;

  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = portfolioAssetsScopeWhere(toPolicyActor(actor));
  if (row[0].module === "portfolio" && scope) {
    const isPrivileged =
      actor.baseRole === "marketing" || (actor.baseRole === "admin" && actor.persona === "admin");
    if (!isOwner && !isPrivileged) {
      const allowed = await db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, params.id), scope)).limit(1);
      if (!allowed[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const s3 = getS3Client();
  const config = getStorageConfig();
  const downloadName = filenameFromStorageKey(row[0].storageKey);
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: row[0].storageKey,
    ResponseContentDisposition: `attachment; filename="${downloadName}"`,
    ResponseContentType: row[0].mimeType,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });

  return NextResponse.json({ url });
}
