import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { normalizePhoneE164, tryNormalizePhoneE164 } from "@/lib/phone";
import { normalizeClassName, type AdminPersona, type PolicyActor } from "@/lib/policy";
import {
  classTeacherAssignments,
  learningAreas,
  userLearningAreas,
  users,
} from "@/lib/schema";

const roleSchema = z.enum(["admin", "teacher", "marketing", "student"]);
const moduleSchema = z.enum(["portfolio", "resources", "media", "tools"]);

export type AppRole = z.infer<typeof roleSchema>;
export type AppModule = z.infer<typeof moduleSchema>;

export type RequestActor = {
  userId: string;
  email: string | null;
  phone: string | null;
  /** Effective role for module access and data scoping. */
  role: AppRole;
  baseRole: AppRole;
  persona: AdminPersona;
  dbUserId: string;
  learningAreas: { id: string; name: string }[];
  classAssignments: { gradeId: string; className: string }[];
};

function parseRole(value: unknown): AppRole {
  const parsed = roleSchema.safeParse(value);
  return parsed.success ? parsed.data : "teacher";
}

function parseAdminEmails() {
  const value = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function parseAdminPhones() {
  const value = process.env.ADMIN_PHONES ?? "";
  const set = new Set<string>();
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const r = normalizePhoneE164(trimmed);
    if (r.ok) set.add(r.value);
  }
  return set;
}

function parsePersona(value: unknown, baseRole: AppRole): AdminPersona {
  if (baseRole !== "admin") return "teacher";
  const parsed = z.enum(["admin", "teacher"]).safeParse(value);
  return parsed.success ? parsed.data : "admin";
}

function effectiveRoleFrom(baseRole: AppRole, persona: AdminPersona): AppRole {
  if (baseRole === "admin" && persona === "teacher") return "teacher";
  return baseRole;
}

async function loadTeacherAssignments(dbUserId: string) {
  const db = getDb();
  try {
    const [laRows, classRows] = await Promise.all([
      db
        .select({ id: learningAreas.id, name: learningAreas.name })
        .from(userLearningAreas)
        .innerJoin(learningAreas, eq(userLearningAreas.learningAreaId, learningAreas.id))
        .where(eq(userLearningAreas.userId, dbUserId)),
      db
        .select({
          gradeId: classTeacherAssignments.gradeId,
          className: classTeacherAssignments.className,
        })
        .from(classTeacherAssignments)
        .where(eq(classTeacherAssignments.userId, dbUserId)),
    ]);

    return {
      learningAreas: laRows,
      classAssignments: classRows,
    };
  } catch (err) {
    // If the migration adding these tables hasn't been applied yet, avoid crashing auth.
    // We'll fall back to "unscoped teacher" behavior (no assignments) until migration completes.
    const maybeCode =
      err && typeof err === "object" && "cause" in err
        ? String(((err as { cause?: { code?: string } }).cause?.code ?? ""))
        : "";
    if (maybeCode === "42P01") {
      console.warn(
        "Assignment tables not found yet (run db:migrate). Falling back to empty teacher assignments.",
      );
    } else {
      console.warn("loadTeacherAssignments failed; falling back to empty assignments.", err);
    }
    return { learningAreas: [], classAssignments: [] };
  }
}

export function toPolicyActor(actor: RequestActor): PolicyActor {
  return {
    dbUserId: actor.dbUserId,
    baseRole: actor.baseRole,
    effectiveRole: actor.role,
    persona: actor.persona,
    learningAreaNames: actor.learningAreas.map((la) => la.name.trim().toLowerCase()).filter(Boolean),
    classAssignments: actor.classAssignments.map((c) => ({
      gradeId: c.gradeId,
      classNameNorm: normalizeClassName(c.className),
    })),
  };
}

export async function getRequestActor(): Promise<RequestActor | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || null;
  const phoneRaw =
    user.primaryPhoneNumber?.phoneNumber || user.phoneNumbers[0]?.phoneNumber || null;
  if (!email && !phoneRaw) return null;

  const phoneNorm = tryNormalizePhoneE164(phoneRaw);
  const normalizedEmail = email?.toLowerCase() ?? null;
  const adminEmails = parseAdminEmails();
  const adminPhones = parseAdminPhones();
  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const bootstrapPhoneRaw = process.env.BOOTSTRAP_ADMIN_PHONE?.trim();
  const bootstrapAdminPhone = bootstrapPhoneRaw
    ? tryNormalizePhoneE164(bootstrapPhoneRaw) ?? bootstrapPhoneRaw
    : null;

  const metadataRole = parseRole(user.publicMetadata?.role);
  const desiredBaseRole: AppRole =
    (bootstrapAdminEmail && normalizedEmail === bootstrapAdminEmail) ||
    (bootstrapAdminPhone && phoneNorm && bootstrapAdminPhone === phoneNorm) ||
    (bootstrapAdminPhone && phoneRaw && bootstrapAdminPhone === phoneRaw)
      ? "admin"
      : (normalizedEmail && adminEmails.has(normalizedEmail)) ||
          (phoneNorm && adminPhones.has(phoneNorm)) ||
          (phoneRaw && adminPhones.has(phoneRaw))
        ? "admin"
        : metadataRole;

  const persona = parsePersona(user.publicMetadata?.activePersona, desiredBaseRole);

  const db = getDb();
  const matchClauses = [];
  if (email) matchClauses.push(eq(users.email, email));
  if (phoneNorm) matchClauses.push(eq(users.phone, phoneNorm));
  if (phoneRaw && phoneNorm !== phoneRaw) matchClauses.push(eq(users.phone, phoneRaw));

  const existing = matchClauses.length
    ? await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(or(...matchClauses))
        .limit(1)
    : [];

  const finalize = async (dbUserId: string): Promise<RequestActor> => {
    const { learningAreas: la, classAssignments: ca } = await loadTeacherAssignments(dbUserId);
    return {
      userId,
      email,
      phone: phoneNorm ?? phoneRaw,
      role: effectiveRoleFrom(desiredBaseRole, persona),
      baseRole: desiredBaseRole,
      persona,
      dbUserId,
      learningAreas: la,
      classAssignments: ca,
    };
  };

  if (existing[0]) {
    const storedRole = parseRole(existing[0].role);
    if (desiredBaseRole !== storedRole) {
      await db.update(users).set({ role: desiredBaseRole }).where(eq(users.id, existing[0].id));
    }
    return finalize(existing[0].id);
  }

  const insertPhone = phoneNorm ?? phoneRaw;
  try {
    const inserted = await db
      .insert(users)
      .values({
        fullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "School User",
        email,
        phone: insertPhone ?? undefined,
        role: desiredBaseRole,
        department: "General",
      })
      .returning({ id: users.id, role: users.role });

    return finalize(inserted[0].id);
  } catch (error) {
    const maybeExisting = matchClauses.length
      ? await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(or(...matchClauses))
          .limit(1)
      : [];

    if (!maybeExisting[0]) {
      throw error;
    }

    const storedRole = parseRole(maybeExisting[0].role);
    if (desiredBaseRole !== storedRole) {
      await db.update(users).set({ role: desiredBaseRole }).where(eq(users.id, maybeExisting[0].id));
    }
    return finalize(maybeExisting[0].id);
  }
}

export async function getRequestRole() {
  const actor = await getRequestActor();
  return actor?.role ?? null;
}

export function canReadModule(role: AppRole, moduleName: AppModule) {
  if (role === "admin") return true;
  if (role === "teacher") return true;
  if (role === "marketing") return moduleName === "media" || moduleName === "resources";
  return moduleName === "portfolio";
}

export function canUploadModule(role: AppRole, moduleName: AppModule) {
  if (role === "admin") return true;
  if (role === "teacher") return true;
  if (role === "marketing") return moduleName === "media";
  return false;
}

export function canManageUsers(actor: RequestActor) {
  return actor.baseRole === "admin" && actor.persona === "admin";
}
