import { asc } from "drizzle-orm";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageUsers, getRequestActor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizePhoneE164 } from "@/lib/phone";
import { users } from "@/lib/schema";

const createUserSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(7),
  /** Clerk password policy is typically ≥ 8 characters. */
  password: z.string().min(8),
  email: z.string().email().optional(),
  role: z.enum(["admin", "teacher", "marketing", "student"]),
  department: z.string().optional(),
});

function clerkErrorMessage(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    const fromFields = error.errors?.map((e) => e.longMessage || e.message).filter(Boolean);
    if (fromFields?.length) return fromFields.join(" ");
    return error.message || "Clerk rejected this request.";
  }
  if (error instanceof Error) return error.message;
  return "Could not create user.";
}

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

  const { fullName, phone, password, email, role, department } = parsed.data;
  const phoneNorm = normalizePhoneE164(phone);
  if (!phoneNorm.ok) {
    return NextResponse.json({ error: phoneNorm.error }, { status: 400 });
  }

  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || undefined;

  const db = getDb();
  const clerk = await clerkClient();

  const createPayload = {
    firstName,
    lastName,
    phoneNumber: [phoneNorm.value],
    password,
    publicMetadata: {
      role,
      activePersona: role === "admin" ? ("admin" as const) : ("teacher" as const),
    },
    ...(email ? { emailAddress: [email] as string[] } : {}),
  };

  let clerkUserId: string | null = null;
  try {
    const clerkUser = await clerk.users.createUser(createPayload);
    clerkUserId = clerkUser.id;

    const inserted = await db
      .insert(users)
      .values({
        fullName: fullName.trim(),
        email: email?.trim() || undefined,
        phone: phoneNorm.value,
        role,
        department: department?.trim() || undefined,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        department: users.department,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ data: inserted[0] }, { status: 201 });
  } catch (error) {
    if (clerkUserId) {
      try {
        await clerk.users.deleteUser(clerkUserId);
      } catch {
        // Best-effort rollback
      }
    }

    const pgCode =
      error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "";
    if (pgCode === "23505") {
      return NextResponse.json(
        { error: "A user with this phone or email already exists in the database." },
        { status: 409 },
      );
    }

    const message = clerkErrorMessage(error);
    const status = isClerkAPIResponseError(error)
      ? Math.min(499, Math.max(400, error.status || 400))
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
