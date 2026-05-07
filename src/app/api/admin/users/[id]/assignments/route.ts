import { eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";
import { getDb } from "@/lib/db";
import { classTeacherAssignments, grades, learningAreas, userLearningAreas, users } from "@/lib/schema";

const putSchema = z.object({
  learningAreaIds: z.array(z.string().uuid()).default([]),
  classes: z
    .array(
      z.object({
        gradeId: z.string().uuid(),
        className: z.string().min(1).max(60),
      }),
    )
    .default([]),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const userRow = await db.select({ id: users.id }).from(users).where(eq(users.id, params.id)).limit(1);
  if (!userRow[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [laRows, classRows] = await Promise.all([
    db
      .select({ learningAreaId: userLearningAreas.learningAreaId })
      .from(userLearningAreas)
      .where(eq(userLearningAreas.userId, params.id)),
    db
      .select({
        gradeId: classTeacherAssignments.gradeId,
        className: classTeacherAssignments.className,
      })
      .from(classTeacherAssignments)
      .where(eq(classTeacherAssignments.userId, params.id)),
  ]);

  return NextResponse.json({
    data: {
      learningAreaIds: laRows.map((r) => r.learningAreaId),
      classes: classRows,
    },
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = putSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const userRow = await db.select({ id: users.id }).from(users).where(eq(users.id, params.id)).limit(1);
  if (!userRow[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { learningAreaIds, classes } = parsed.data;

  if (learningAreaIds.length) {
    const found = await db
      .select({ id: learningAreas.id })
      .from(learningAreas)
      .where(inArray(learningAreas.id, learningAreaIds));
    if (found.length !== learningAreaIds.length) {
      return NextResponse.json({ error: "One or more learning area ids are invalid." }, { status: 400 });
    }
  }

  if (classes.length) {
    const gradeIds = [...new Set(classes.map((c) => c.gradeId))];
    const foundGrades = await db.select({ id: grades.id }).from(grades).where(inArray(grades.id, gradeIds));
    if (foundGrades.length !== gradeIds.length) {
      return NextResponse.json({ error: "One or more grade ids are invalid." }, { status: 400 });
    }
  }

  await db.delete(userLearningAreas).where(eq(userLearningAreas.userId, params.id));
  await db.delete(classTeacherAssignments).where(eq(classTeacherAssignments.userId, params.id));

  if (learningAreaIds.length) {
    await db.insert(userLearningAreas).values(
      learningAreaIds.map((learningAreaId) => ({
        userId: params.id,
        learningAreaId,
      })),
    );
  }
  if (classes.length) {
    await db.insert(classTeacherAssignments).values(
      classes.map((c) => ({
        userId: params.id,
        gradeId: c.gradeId,
        className: c.className.trim(),
      })),
    );
  }

  await writeAuditLog({
    actorId: actor.dbUserId,
    action: "user.assignments.update",
    entityType: "user",
    entityId: params.id,
    metadata: { learningAreaIds, classes },
  });

  return NextResponse.json({ ok: true });
}
