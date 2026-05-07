import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { assets } from "@/lib/schema";
import { canReadModule, getRequestRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const role = await getRequestRole();
  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canReadModule(role, "portfolio")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const grade = request.nextUrl.searchParams.get("grade");
  const query = request.nextUrl.searchParams.get("q");

  const filters = [eq(assets.module, "portfolio")];
  if (query) filters.push(ilike(assets.title, `%${query}%`));
  if (grade) filters.push(ilike(assets.description, `%${grade}%`));

  const db = getDb();
  const portfolioAssets = await db
    .select({
      id: assets.id,
      title: assets.title,
      description: assets.description,
      mimeType: assets.mimeType,
      createdAt: assets.createdAt,
      approvalStatus: assets.approvalStatus,
    })
    .from(assets)
    .where(and(...filters))
    .orderBy(desc(assets.createdAt))
    .limit(100);

  return NextResponse.json({ data: portfolioAssets });
}
