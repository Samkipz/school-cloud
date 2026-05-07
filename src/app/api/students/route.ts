import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor, toPolicyActor } from "@/lib/auth";
import { canCreateStudentRecord } from "@/lib/policy";
import { getDb } from "@/lib/db";
import { grades, students } from "@/lib/schema";

const createStudentSchema = z.object({
  admissionNumber: z.string().min(1),
  fullName: z.string().min(1),
  gradeId: z.string().uuid(),
  className: z.string().optional(),
});

export async function GET() {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const data = await db
    .select({
      id: students.id,
      admissionNumber: students.admissionNumber,
      fullName: students.fullName,
      gradeId: students.gradeId,
      grade: grades.name,
      className: students.className,
      isActive: students.isActive,
    })
    .from(students)
    .innerJoin(grades, eq(students.gradeId, grades.id))
    .where(eq(students.isActive, true))
    .orderBy(asc(students.fullName));

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createStudentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid student payload" }, { status: 400 });
  }

  const policyActor = toPolicyActor(actor);
  if (canManageUsers(actor)) {
    // ok
  } else if (actor.role === "teacher") {
    if (
      !canCreateStudentRecord(policyActor, {
        gradeId: parsed.data.gradeId,
        className: parsed.data.className?.trim() ?? null,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const gradeRow = await db.select({ id: grades.id }).from(grades).where(eq(grades.id, parsed.data.gradeId)).limit(1);
  if (!gradeRow[0]) {
    return NextResponse.json({ error: "Invalid gradeId — pick an existing grade." }, { status: 400 });
  }

  const inserted = await db
    .insert(students)
    .values({
      admissionNumber: parsed.data.admissionNumber.trim(),
      fullName: parsed.data.fullName.trim(),
      gradeId: parsed.data.gradeId,
      className: parsed.data.className?.trim() || undefined,
      isActive: true,
    })
    .returning({
      id: students.id,
      admissionNumber: students.admissionNumber,
      fullName: students.fullName,
      gradeId: students.gradeId,
      className: students.className,
    });

  const withName = await db
    .select({
      id: students.id,
      admissionNumber: students.admissionNumber,
      fullName: students.fullName,
      gradeId: students.gradeId,
      grade: grades.name,
      className: students.className,
      isActive: students.isActive,
    })
    .from(students)
    .innerJoin(grades, eq(students.gradeId, grades.id))
    .where(eq(students.id, inserted[0].id))
    .limit(1);

  return NextResponse.json({ data: withName[0] }, { status: 201 });
}
