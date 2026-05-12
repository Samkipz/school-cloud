import { asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/lib/phone";
import { users } from "@/lib/schema";

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "teacher"]),
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

  const { firstName, lastName, phone, email, role, department } = parsed.data;
  const phoneNorm: { ok: false; error: string } | { ok: true; value: string | undefined } =
    phone ? normalizePhoneE164(phone) : { ok: true, value: undefined };
  if (!phoneNorm.ok) {
    return NextResponse.json({ error: phoneNorm.error }, { status: 400 });
  }

  const normalizedFirst = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedLast = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const baseUsername = `${normalizedFirst.slice(0, 1)}.${normalizedLast}@mts`;
  const initialPassword = `${normalizedLast}12345`;
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  const db = getDb();

  let username = baseUsername;
  let inserted;
  let attempt = 0;

  while (true) {
    try {
      const passwordHash = await bcrypt.hash(initialPassword, 12);
      inserted = await db
        .insert(users)
        .values({
          username,
          passwordHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
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
      break;
    } catch (error) {
      const pgCode =
        error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
      if (pgCode === "23505" && attempt < 5) {
        attempt += 1;
        username = `${normalizedFirst.slice(0, 1)}.${normalizedLast}${attempt}@mts`;
        continue;
      }
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

  return NextResponse.json({ data: inserted[0], initialPassword }, { status: 201 });
}
