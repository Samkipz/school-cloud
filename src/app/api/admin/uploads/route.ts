import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assets } from "@/lib/schema";

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
      id: assets.id,
      title: assets.title,
      description: assets.description,
      module: assets.module,
      fileSizeBytes: assets.fileSizeBytes,
      approvalStatus: assets.approvalStatus,
      createdAt: assets.createdAt,
    })
    .from(assets)
    .orderBy(desc(assets.createdAt))
    .limit(100);

  return NextResponse.json({ data });
}
