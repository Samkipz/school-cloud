import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";

const DEFAULT_EMAIL = "teacher.demo@school.local";
const DEFAULT_NAME = "Demo Teacher";

export async function resolveActorId(preferredEmail?: string) {
  const db = getDb();
  const email = preferredEmail || DEFAULT_EMAIL;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return existing[0].id;

  const username = `actor_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const passwordHash = await bcrypt.hash(randomUUID(), 12);

  const inserted = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      firstName: DEFAULT_NAME,
      lastName: DEFAULT_NAME,
      fullName: DEFAULT_NAME,
      email,
      role: "teacher",
      department: "General",
    })
    .returning({ id: users.id });

  return inserted[0].id;
}
