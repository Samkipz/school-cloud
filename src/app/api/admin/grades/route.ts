import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { grades } from "@/lib/schema";

const createGradeSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  const actor = await getRequestActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const data = await db
    .select({ id: grades.id, name: grades.name })
    .from(grades)
    .orderBy(asc(grades.name));
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const actor = await getRequestActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createGradeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid grade payload" }, { status: 400 });

  const db = getDb();
  const inserted = await db
    .insert(grades)
    .values({ name: parsed.data.name })
    .onConflictDoNothing({ target: grades.name })
    .returning({ id: grades.id, name: grades.name });

  if (!inserted[0]) {
    const existing = await db.select({ id: grades.id, name: grades.name }).from(grades).where(eq(grades.name, parsed.data.name)).limit(1);
    return NextResponse.json({ data: existing[0] }, { status: 200 });
  }

  return NextResponse.json({ data: inserted[0] }, { status: 201 });
}

