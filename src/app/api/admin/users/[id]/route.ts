import { eq } from "drizzle-orm";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/lib/phone";
import { users } from "@/lib/schema";

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(["admin", "teacher", "marketing", "student"]).optional(),
  department: z.union([z.string(), z.null()]).optional(),
  phone: z.union([z.string().min(7), z.null()]).optional(),
  email: z.union([z.string().email(), z.null()]).optional(),
});

function clerkErr(e: unknown) {
  if (isClerkAPIResponseError(e)) {
    return e.errors?.map((x) => x.longMessage || x.message).filter(Boolean).join(" ") || e.message;
  }
  if (e instanceof Error) return e.message;
  return "Clerk error";
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user payload" }, { status: 400 });
  }

  const patch: {
    fullName?: string;
    role?: "admin" | "teacher" | "marketing" | "student";
    department?: string | null;
    phone?: string | null;
    email?: string | null;
  } = {};
  if (parsed.data.fullName !== undefined) patch.fullName = parsed.data.fullName.trim();
  if (parsed.data.role !== undefined) patch.role = parsed.data.role;
  if (parsed.data.department !== undefined) patch.department = parsed.data.department === null ? null : parsed.data.department.trim() || null;
  if (parsed.data.phone !== undefined) {
    if (parsed.data.phone === null) {
      patch.phone = null;
    } else {
      const pn = normalizePhoneE164(parsed.data.phone);
      if (!pn.ok) return NextResponse.json({ error: pn.error }, { status: 400 });
      patch.phone = pn.value;
    }
  }
  if (parsed.data.email !== undefined) {
    patch.email = parsed.data.email === null ? null : parsed.data.email.trim().toLowerCase();
  }

  const db = getDb();
  const updated = await db.update(users).set(patch).where(eq(users.id, params.id)).returning({
    id: users.id,
    fullName: users.fullName,
    email: users.email,
    phone: users.phone,
    role: users.role,
    department: users.department,
  });

  if (!updated[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (parsed.data.role) {
    try {
      const dbUser = updated[0];
      const clerk = await clerkClient();
      const match = dbUser.phone
        ? (await clerk.users.getUserList({ phoneNumber: [dbUser.phone] })).data[0]
        : dbUser.email
          ? (await clerk.users.getUserList({ emailAddress: [dbUser.email] })).data[0]
          : null;
      if (match) {
        await clerk.users.updateUser(match.id, { publicMetadata: { role: parsed.data.role } });
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ data: updated[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (actor.dbUserId === params.id) {
    return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
  }

  const db = getDb();
  const row = await db
    .select({ id: users.id, email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.id, params.id))
    .limit(1);

  if (!row[0]) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const clerk = await clerkClient();
    const match = row[0].phone
      ? (await clerk.users.getUserList({ phoneNumber: [row[0].phone] })).data[0]
      : row[0].email
        ? (await clerk.users.getUserList({ emailAddress: [row[0].email] })).data[0]
        : null;
    if (match) {
      await clerk.users.deleteUser(match.id);
    }
  } catch (e) {
    return NextResponse.json({ error: `Could not remove Clerk user: ${clerkErr(e)}` }, { status: 502 });
  }

  await db.delete(users).where(eq(users.id, params.id));

  return NextResponse.json({ ok: true });
}
