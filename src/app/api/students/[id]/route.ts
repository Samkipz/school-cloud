import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor, toPolicyActor } from "@/lib/auth";
import { canManageStudentRecord } from "@/lib/policy";
import { getDb } from "@/lib/db";
import { assetStudents, grades, students } from "@/lib/schema";

const updateStudentSchema = z.object({
  fullName: z.string().min(1).optional(),
  gradeId: z.string().uuid().optional(),
  className: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateStudentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid student payload" }, { status: 400 });
  }

  const db = getDb();
  const currentRows = await db
    .select({
      id: students.id,
      gradeId: students.gradeId,
      className: students.className,
    })
    .from(students)
    .where(eq(students.id, params.id))
    .limit(1);

  if (!currentRows[0]) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const policyActor = toPolicyActor(actor);
  if (!canManageUsers(actor)) {
    if (actor.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!canManageStudentRecord(policyActor, currentRows[0])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (parsed.data.gradeId !== undefined) {
    const gradeRow = await db.select({ id: grades.id }).from(grades).where(eq(grades.id, parsed.data.gradeId)).limit(1);
    if (!gradeRow[0]) {
      return NextResponse.json({ error: "Invalid gradeId — pick an existing grade." }, { status: 400 });
    }
  }

  const patch: {
    fullName?: string;
    gradeId?: string;
    className?: string | null;
    isActive?: boolean;
  } = {};
  if (parsed.data.fullName !== undefined) patch.fullName = parsed.data.fullName.trim();
  if (parsed.data.gradeId !== undefined) patch.gradeId = parsed.data.gradeId;
  if (parsed.data.className !== undefined) {
    patch.className = parsed.data.className === "" ? null : parsed.data.className.trim();
  }
  if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive;

  const merged = {
    gradeId: patch.gradeId ?? currentRows[0].gradeId,
    className:
      patch.className !== undefined ? patch.className : (currentRows[0].className ?? null),
  };

  if (!canManageUsers(actor) && actor.role === "teacher") {
    if (!canManageStudentRecord(policyActor, merged)) {
      return NextResponse.json({ error: "Forbidden — result would be outside your assigned class." }, { status: 403 });
    }
  }

  const updated = await db
    .update(students)
    .set(patch)
    .where(eq(students.id, params.id))
    .returning({ id: students.id });

  if (!updated[0]) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const row = await db
    .select({
      id: students.id,
      fullName: students.fullName,
      gradeId: students.gradeId,
      grade: grades.name,
      className: students.className,
      isActive: students.isActive,
      admissionNumber: students.admissionNumber,
    })
    .from(students)
    .innerJoin(grades, eq(students.gradeId, grades.id))
    .where(eq(students.id, params.id))
    .limit(1);

  return NextResponse.json({ data: row[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const currentRows = await db
    .select({
      id: students.id,
      gradeId: students.gradeId,
      className: students.className,
    })
    .from(students)
    .where(eq(students.id, params.id))
    .limit(1);

  if (!currentRows[0]) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const policyActor = toPolicyActor(actor);
  if (!canManageUsers(actor)) {
    if (actor.role !== "teacher" || !canManageStudentRecord(policyActor, currentRows[0])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.delete(assetStudents).where(eq(assetStudents.studentId, params.id));
  await db.delete(students).where(eq(students.id, params.id));

  return NextResponse.json({ ok: true });
}
