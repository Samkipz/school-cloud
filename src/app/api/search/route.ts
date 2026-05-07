import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { assetStudents, assetTags, assets, students, tags } from "@/lib/schema";
import { canReadModule, getRequestActor, toPolicyActor } from "@/lib/auth";
import { portfolioAssetsScopeWhere } from "@/lib/policy";

const querySchema = z.object({
  q: z.string().optional().default(""),
  module: z.enum(["portfolio", "resources", "media", "tools"]).optional(),
  mime: z.string().optional(),
  approval: z.enum(["raw", "approved", "rejected"]).optional(),
  tag: z.string().optional(),
  student: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  page: z.coerce.number().int().min(1).optional().default(1),
  sort: z.enum(["newest", "oldest"]).optional().default("newest"),
});

export async function GET(request: NextRequest) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = actor.role;
  const parsed = querySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    module: request.nextUrl.searchParams.get("module") ?? undefined,
    mime: request.nextUrl.searchParams.get("mime") ?? undefined,
    approval: request.nextUrl.searchParams.get("approval") ?? undefined,
    tag: request.nextUrl.searchParams.get("tag") ?? undefined,
    student: request.nextUrl.searchParams.get("student") ?? undefined,
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
    sort: request.nextUrl.searchParams.get("sort") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search parameters" }, { status: 400 });
  }

  const { q, module, mime, approval, tag, student, limit, page, sort } = parsed.data;

  const readableModules = (["portfolio", "resources", "media", "tools"] as const).filter((moduleName) =>
    canReadModule(role, moduleName),
  );

  if (readableModules.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const filters: SQL[] = [inArray(assets.module, readableModules)];
  const portfolioScope = portfolioAssetsScopeWhere(toPolicyActor(actor));
  if (portfolioScope) {
    filters.push(or(ne(assets.module, "portfolio"), portfolioScope) as SQL);
  }
  if (module) filters.push(eq(assets.module, module));
  if (q) filters.push(ilike(assets.title, `%${q}%`));
  if (mime) filters.push(ilike(assets.mimeType, `%${mime}%`));
  if (approval) filters.push(eq(assets.approvalStatus, approval));
  if (tag) {
    filters.push(
      sql`exists (
        select 1 from ${assetTags}
        inner join ${tags} on ${assetTags.tagId} = ${tags.id}
        where ${assetTags.assetId} = ${assets.id}
          and ${tags.name} ilike ${"%" + tag + "%"}
      )`,
    );
  }
  if (student) {
    filters.push(
      sql`exists (
        select 1 from ${assetStudents}
        inner join ${students} on ${assetStudents.studentId} = ${students.id}
        where ${assetStudents.assetId} = ${assets.id}
          and (${students.fullName} ilike ${"%" + student + "%"} or ${students.admissionNumber} ilike ${"%" + student + "%"})
      )`,
    );
  }

  const db = getDb();
  const offset = (page - 1) * limit;
  const orderBy = sort === "oldest" ? asc(assets.createdAt) : desc(assets.createdAt);

  const rows = await db
    .select({
      id: assets.id,
      module: assets.module,
      title: assets.title,
      mimeType: assets.mimeType,
      approvalStatus: assets.approvalStatus,
      createdAt: assets.createdAt,
      fileSizeBytes: assets.fileSizeBytes,
    })
    .from(assets)
    .where(and(...filters))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    data: rows,
    pagination: {
      page,
      limit,
      count: rows.length,
    },
  });
}
