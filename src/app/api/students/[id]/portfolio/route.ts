import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getRequestActor, toPolicyActor } from "@/lib/auth";
import {
  hasScopedTeacherAccess,
  portfolioViewRequiresLaEvidenceCheck,
  studentMatchesClassAssignment,
} from "@/lib/policy";
import { getDb } from "@/lib/db";
import { assetStudents, assetTags, assets, grades, students, tags, users } from "@/lib/schema";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const student = await db
    .select({
      id: students.id,
      fullName: students.fullName,
      gradeId: students.gradeId,
      grade: grades.name,
      className: students.className,
      admissionNumber: students.admissionNumber,
    })
    .from(students)
    .innerJoin(grades, eq(students.gradeId, grades.id))
    .where(and(eq(students.id, params.id), eq(students.isActive, true)))
    .limit(1);

  if (!student[0]) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const policyActor = toPolicyActor(actor);
  if (actor.role === "teacher" && hasScopedTeacherAccess(policyActor)) {
    if (studentMatchesClassAssignment(policyActor, student[0])) {
      // allowed
    } else if (portfolioViewRequiresLaEvidenceCheck(policyActor, student[0])) {
      const lowered = policyActor.learningAreaNames;
      const hit = await db
        .select({ id: assets.id })
        .from(assetStudents)
        .innerJoin(assets, eq(assetStudents.assetId, assets.id))
        .innerJoin(assetTags, eq(assetTags.assetId, assets.id))
        .innerJoin(tags, eq(assetTags.tagId, tags.id))
        .where(
          and(
            eq(assetStudents.studentId, params.id),
            eq(assets.module, "portfolio"),
            sql`lower(${tags.name}) in (${sql.join(
              lowered.map((n) => sql`${n}`),
              sql`, `,
            )})`,
          ),
        )
        .limit(1);
      if (!hit[0]) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const fileRows = await db
    .select({
      id: assets.id,
      title: assets.title,
      description: assets.description,
      mimeType: assets.mimeType,
      fileSizeBytes: assets.fileSizeBytes,
      createdAt: assets.createdAt,
      approvalStatus: assets.approvalStatus,
      uploadedByName: users.fullName,
    })
    .from(assetStudents)
    .innerJoin(assets, eq(assetStudents.assetId, assets.id))
    .innerJoin(users, eq(assets.uploadedBy, users.id))
    .where(and(eq(assetStudents.studentId, params.id), eq(assets.module, "portfolio")))
    .orderBy(desc(assets.createdAt));

  const tagMap = new Map<string, string[]>();
  if (fileRows.length > 0) {
    const ids = fileRows.map((f) => f.id);
    const tagRows = await db
      .select({
        assetId: assetTags.assetId,
        tagName: tags.name,
      })
      .from(assetTags)
      .innerJoin(tags, eq(assetTags.tagId, tags.id))
      .where(inArray(assetTags.assetId, ids));

    for (const row of tagRows) {
      const list = tagMap.get(row.assetId) ?? [];
      list.push(row.tagName);
      tagMap.set(row.assetId, list);
    }
  }

  const files = fileRows.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description,
    mimeType: f.mimeType,
    fileSizeBytes: f.fileSizeBytes,
    createdAt: f.createdAt,
    approvalStatus: f.approvalStatus,
    uploadedByName: f.uploadedByName,
    tags: tagMap.get(f.id) ?? [],
  }));

  return NextResponse.json({
    data: {
      student: student[0],
      files,
    },
  });
}
