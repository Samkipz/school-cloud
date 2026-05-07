import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { canReadModule, getRequestActor, toPolicyActor } from "@/lib/auth";
import { portfolioStudentsScopeWhere } from "@/lib/policy";
import { getDb } from "@/lib/db";
import { assetStudents, assets, grades, students } from "@/lib/schema";

export async function GET(_request: NextRequest) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReadModule(actor.role, "portfolio")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const scope = portfolioStudentsScopeWhere(toPolicyActor(actor));
  const activeFilter = scope ? and(eq(students.isActive, true), scope) : eq(students.isActive, true);

  const rows = await db
    .select({
      id: students.id,
      fullName: students.fullName,
      gradeId: students.gradeId,
      grade: grades.name,
      className: students.className,
      admissionNumber: students.admissionNumber,
      createdAt: students.createdAt,
      fileCount: sql<number>`(
        select count(*)::int
        from ${assetStudents}
        where ${assetStudents.studentId} = ${students.id}
      )`,
    })
    .from(students)
    .innerJoin(grades, eq(students.gradeId, grades.id))
    .where(activeFilter)
    .orderBy(desc(students.createdAt));

  const [{ totalPortfolioFiles }] = await db
    .select({ totalPortfolioFiles: sql<number>`count(*)` })
    .from(assets)
    .where(eq(assets.module, "portfolio"));

  return NextResponse.json({
    data: rows,
    stats: {
      totalPortfolioFiles: Number(totalPortfolioFiles ?? 0),
    },
  });
}
