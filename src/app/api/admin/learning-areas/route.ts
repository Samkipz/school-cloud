import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { grades, learningAreas } from "@/lib/schema";

const createLearningAreaSchema = z.object({
  name: z.string().min(1),
  gradeId: z.string().uuid(),
});

export async function GET() {
  const actor = await getRequestActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const data = await db
    .select({
      id: learningAreas.id,
      name: learningAreas.name,
      gradeId: learningAreas.gradeId,
      gradeName: grades.name,
    })
    .from(learningAreas)
    .leftJoin(grades, eq(learningAreas.gradeId, grades.id))
    .orderBy(asc(grades.name), asc(learningAreas.name));
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const actor = await getRequestActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createLearningAreaSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid learning area payload" }, { status: 400 });

  const db = getDb();
  const gradeRow = await db.select({ id: grades.id }).from(grades).where(eq(grades.id, parsed.data.gradeId)).limit(1);
  if (!gradeRow[0]) {
    return NextResponse.json({ error: "Invalid grade selected for this learning area." }, { status: 400 });
  }
  const inserted = await db
    .insert(learningAreas)
    .values({ name: parsed.data.name.trim(), gradeId: parsed.data.gradeId })
    .onConflictDoNothing({ target: learningAreas.name })
    .returning({ id: learningAreas.id, name: learningAreas.name, gradeId: learningAreas.gradeId });

  if (!inserted[0]) {
    const existing = await db
      .select({ id: learningAreas.id, name: learningAreas.name, gradeId: learningAreas.gradeId })
      .from(learningAreas)
      .where(eq(learningAreas.name, parsed.data.name.trim()))
      .limit(1);
    return NextResponse.json({ data: existing[0] }, { status: 200 });
  }

  return NextResponse.json({ data: inserted[0] }, { status: 201 });
}
