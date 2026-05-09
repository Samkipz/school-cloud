import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestActor } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit-log";

const bodySchema = z.object({
  persona: z.enum(["admin", "teacher"]),
});

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getRequestActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (actor.baseRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await writeAuditLog({
      actorId: actor.dbUserId,
      action: "persona.change",
      entityType: "user",
      entityId: actor.dbUserId,
      metadata: { persona: parsed.data.persona },
    });

    return NextResponse.json({ ok: true, persona: parsed.data.persona });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not switch persona.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
