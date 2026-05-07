import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { grades } from "@/lib/schema";

/** Authenticated read of grade catalog (filters, student forms). */
export async function GET() {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const data = await db
    .select({
      id: grades.id,
      name: grades.name,
    })
    .from(grades)
    .orderBy(asc(grades.name));

  return NextResponse.json({ data });
}
