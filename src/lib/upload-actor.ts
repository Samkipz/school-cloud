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

  const inserted = await db
    .insert(users)
    .values({
      email,
      fullName: DEFAULT_NAME,
      role: "teacher",
      department: "General",
    })
    .returning({ id: users.id });

  return inserted[0].id;
}
