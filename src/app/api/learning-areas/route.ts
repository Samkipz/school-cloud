import { asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { learningAreas, userLearningAreas } from "@/lib/schema";

/** Authenticated read of learning areas for portfolio uploads. */
export async function GET() {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const assignedIds =
    actor.role === "teacher" || actor.role === "student"
      ? (
          await db
            .select({ learningAreaId: userLearningAreas.learningAreaId })
            .from(userLearningAreas)
            .where(eq(userLearningAreas.userId, actor.dbUserId))
        ).map((row) => row.learningAreaId)
      : [];
  const data = await db
    .select({
      id: learningAreas.id,
      name: learningAreas.name,
      gradeId: learningAreas.gradeId,
    })
    .from(learningAreas)
    .where(
      assignedIds.length && (actor.role === "teacher" || actor.role === "student")
        ? inArray(learningAreas.id, assignedIds)
        : undefined,
    )
    .orderBy(asc(learningAreas.name));

  return NextResponse.json({ data });
}
