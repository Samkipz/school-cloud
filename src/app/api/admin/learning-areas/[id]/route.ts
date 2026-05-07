import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { grades, learningAreas } from "@/lib/schema";

const updateLearningAreaSchema = z.object({
  name: z.string().min(1).optional(),
  gradeId: z.string().uuid().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateLearningAreaSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid learning area payload" }, { status: 400 });

  const db = getDb();
  const patch: { name?: string; gradeId?: string } = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
  if (parsed.data.gradeId !== undefined) {
    const gradeRow = await db.select({ id: grades.id }).from(grades).where(eq(grades.id, parsed.data.gradeId)).limit(1);
    if (!gradeRow[0]) {
      return NextResponse.json({ error: "Invalid grade selected for this learning area." }, { status: 400 });
    }
    patch.gradeId = parsed.data.gradeId;
  }
  const updated = await db
    .update(learningAreas)
    .set(patch)
    .where(eq(learningAreas.id, params.id))
    .returning({ id: learningAreas.id, name: learningAreas.name, gradeId: learningAreas.gradeId });

  if (!updated[0]) return NextResponse.json({ error: "Learning area not found" }, { status: 404 });
  return NextResponse.json({ data: updated[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const deleted = await db.delete(learningAreas).where(eq(learningAreas.id, params.id)).returning({ id: learningAreas.id });
  if (!deleted[0]) return NextResponse.json({ error: "Learning area not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
