import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { assetTags, assets, tags } from "@/lib/schema";

export async function getAssetsByModule(
  moduleName: "portfolio" | "resources" | "media" | "tools",
  options?: { q?: string; approval?: "raw" | "approved" | "rejected"; limit?: number },
) {
  const filters = [eq(assets.module, moduleName)];

  if (options?.q) filters.push(ilike(assets.title, `%${options.q}%`));
  if (options?.approval) filters.push(eq(assets.approvalStatus, options.approval));

  const db = getDb();
  return db
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
    .limit(options?.limit ?? 100);
}
