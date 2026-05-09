import { asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/lib/phone";
import { users } from "@/lib/schema";

const createUserSchema = z.object({
  username: z.string().min(3).max(80),
  fullName: z.string().min(1),
  phone: z.string().min(7),
  password: z.string().min(8),
  email: z.string().email().optional(),
  role: z.enum(["admin", "teacher", "marketing", "student"]),
  department: z.string().optional(),
});

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
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role,
      department: users.department,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.fullName));
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user payload" }, { status: 400 });
  }

  const { username, fullName, phone, password, email, role, department } = parsed.data;
  const phoneNorm = normalizePhoneE164(phone);
  if (!phoneNorm.ok) {
    return NextResponse.json({ error: phoneNorm.error }, { status: 400 });
  }

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    const db = getDb();
    const inserted = await db
      .insert(users)
      .values({
        username: username.trim(),
        passwordHash,
        fullName: fullName.trim(),
        email: email?.trim() || undefined,
        phone: phoneNorm.value,
        role,
        department: department?.trim() || undefined,
      })
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        department: users.department,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ data: inserted[0] }, { status: 201 });
  } catch (error) {
    const pgCode =
      error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
    if (pgCode === "23505") {
      return NextResponse.json(
        { error: "A user with this username, phone, or email already exists." },
        { status: 409 },
      );
    }

    const message = error instanceof Error ? error.message : "Could not create user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
