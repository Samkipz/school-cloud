import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { canReadModule, getRequestActor, toPolicyActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assetStudents, assetTags, assets, students, tags, users } from "@/lib/schema";
import { portfolioAssetsScopeWhere, portfolioStudentsScopeWhere } from "@/lib/policy";

export async function GET(_request: NextRequest) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReadModule(actor.role, "portfolio")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const policyActor = toPolicyActor(actor);
  const studentScope = portfolioStudentsScopeWhere(policyActor);
  const assetScope = portfolioAssetsScopeWhere(policyActor);
  const assetFilter = assetScope ? and(eq(assets.module, "portfolio"), assetScope) : eq(assets.module, "portfolio");
  const studentFilter = studentScope ? and(eq(students.isActive, true), studentScope) : eq(students.isActive, true);
  const [profile] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, actor.dbUserId)).limit(1);

  const [{ totalFiles }] = await db
    .select({ totalFiles: sql<number>`count(*)` })
    .from(assets)
    .where(assetFilter);
  const [{ totalStudents }] = await db
    .select({ totalStudents: sql<number>`count(*)` })
    .from(students)
    .where(studentFilter);
  const [{ storageBytes }] = await db
    .select({ storageBytes: sql<number>`coalesce(sum(${assets.fileSizeBytes}), 0)` })
    .from(assets)
    .where(assetFilter);
  const [{ recentUploads }] = await db
    .select({ recentUploads: sql<number>`count(*)` })
    .from(assets)
    .where(and(assetFilter, sql`${assets.createdAt} > now() - interval '7 days'`));

  const recentFiles = await db
    .select({
      id: assets.id,
      title: assets.title,
      mimeType: assets.mimeType,
      fileSizeBytes: assets.fileSizeBytes,
      createdAt: assets.createdAt,
      module: assets.module,
      studentNames: sql<string[]>`coalesce(array(
        select distinct s.full_name
        from ${assetStudents} ast
        inner join ${students} s on s.id = ast.student_id
        where ast.asset_id = ${assets.id}
      ), '{}')`,
      learningAreas: sql<string[]>`coalesce(array(
        select distinct t.name
        from ${assetTags} at2
        inner join ${tags} t on t.id = at2.tag_id
        where at2.asset_id = ${assets.id}
      ), '{}')`,
    })
    .from(assets)
    .where(assetFilter)
    .orderBy(desc(assets.createdAt))
    .limit(5);

  return NextResponse.json({
    actor: { fullName: profile?.fullName ?? "Teacher", learningAreas: actor.learningAreas },
    stats: {
      totalFiles: Number(totalFiles ?? 0),
      recentUploads: Number(recentUploads ?? 0),
      storageBytes: Number(storageBytes ?? 0),
      totalStudents: Number(totalStudents ?? 0),
    },
    recentFiles,
  });
}
