import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "school-cloud-api",
    timestamp: new Date().toISOString(),
  });
}
