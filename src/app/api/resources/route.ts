import { NextRequest, NextResponse } from "next/server";
import { canReadModule, getRequestRole } from "@/lib/auth";
import { getAssetsByModule } from "@/lib/assets-query";

export async function GET(request: NextRequest) {
  const role = await getRequestRole();
  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canReadModule(role, "resources")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const approval =
    (request.nextUrl.searchParams.get("approval") as "raw" | "approved" | "rejected" | null) ?? undefined;

  const data = await getAssetsByModule("resources", { q, approval });
  return NextResponse.json({ data });
}
