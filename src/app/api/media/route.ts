import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { canReadModule, getRequestRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assetTags, assets, tags } from "@/lib/schema";

export async function GET(request: NextRequest) {
  const role = await getRequestRole();
  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canReadModule(role, "media")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const approval =
    (request.nextUrl.searchParams.get("approval") as "raw" | "approved" | "rejected" | null) ?? undefined;

  const db = getDb();
  const filters = [eq(assets.module, "media" as const)];
  if (q) filters.push(ilike(assets.title, `%${q}%`));
  if (approval) filters.push(eq(assets.approvalStatus, approval));

  const rows = await db
    .select({
      id: assets.id,
      module: assets.module,
      title: assets.title,
      description: assets.description,
      storageKey: assets.storageKey,
      mimeType: assets.mimeType,
      fileSizeBytes: assets.fileSizeBytes,
      approvalStatus: assets.approvalStatus,
      createdAt: assets.createdAt,
      tags: sql<string[]>`coalesce((
        select array_agg(${tags.name})
        from ${assetTags}
        inner join ${tags} on ${assetTags.tagId} = ${tags.id}
        where ${assetTags.assetId} = ${assets.id}
      ), ARRAY[]::varchar[])`,
    })
    .from(assets)
    .where(and(...filters))
    .orderBy(desc(assets.createdAt))
    .limit(200);

  const publicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL?.replace(/\/$/, "");

  const data = rows.map((row) => ({
    ...row,
    publicUrl: publicBaseUrl ? `${publicBaseUrl}/${row.storageKey}` : null,
  }));

  return NextResponse.json({ data });
}
