import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { grades } from "@/lib/schema";

const updateGradeSchema = z.object({
  name: z.string().min(1).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateGradeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid grade payload" }, { status: 400 });

  const patch: { name?: string } = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();

  const db = getDb();
  const updated = await db
    .update(grades)
    .set(patch)
    .where(eq(grades.id, params.id))
    .returning({ id: grades.id, name: grades.name });

  if (!updated[0]) return NextResponse.json({ error: "Grade not found" }, { status: 404 });
  return NextResponse.json({ data: updated[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  try {
    const deleted = await db.delete(grades).where(eq(grades.id, params.id)).returning({ id: grades.id });
    if (!deleted[0]) return NextResponse.json({ error: "Grade not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "23503") {
      return NextResponse.json(
        { error: "This grade is still assigned to students. Reassign or delete those students first." },
        { status: 409 },
      );
    }
    throw e;
  }
}

