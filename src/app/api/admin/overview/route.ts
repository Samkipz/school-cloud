import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assets, users } from "@/lib/schema";

export async function GET() {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)` }).from(users);
  const [{ totalFiles }] = await db.select({ totalFiles: sql<number>`count(*)` }).from(assets);
  const [{ storageBytes }] = await db.select({ storageBytes: sql<number>`coalesce(sum(${assets.fileSizeBytes}), 0)` }).from(assets);
  const [{ uploadsLast7Days }] = await db
    .select({ uploadsLast7Days: sql<number>`count(*)` })
    .from(assets)
    .where(sql`${assets.createdAt} > now() - interval '7 days'`);

  return NextResponse.json({
    data: {
      totalUsers: Number(totalUsers ?? 0),
      totalFiles: Number(totalFiles ?? 0),
      storageBytes: Number(storageBytes ?? 0),
      uploadsLast7Days: Number(uploadsLast7Days ?? 0),
    },
  });
}
