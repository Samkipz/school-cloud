import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { normalizeClassName, type AdminPersona, type PolicyActor } from "@/lib/policy";
import {
  classTeacherAssignments,
  learningAreas,
  userLearningAreas,
  users,
} from "@/lib/schema";

const roleSchema = z.enum(["admin", "teacher", "marketing", "student"]);

export type AppRole = z.infer<typeof roleSchema>;
export type AppModule = "portfolio" | "resources" | "media" | "tools";

export type AdminPersona = "admin" | "teacher";

export type RequestActor = {
  userId: string;
  email: string | null;
  phone: string | null;
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

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const normalizedUsername = credentials.username.trim();
        if (!normalizedUsername) return null;

        const db = getDb();
        const [user] = await db
          .select()
          .from(users)
          .where(sql`lower(${users.username}) = lower(${normalizedUsername})`)
          .limit(1);

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          fullName: user.fullName,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.fullName = user.fullName;
        token.dbUserId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as AppRole;
        session.user.fullName = token.fullName as string;
        session.user.dbUserId = token.dbUserId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
};

export async function getRequestActor(): Promise<RequestActor | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.dbUserId))
    .limit(1);

  if (!user) return null;

  const { learningAreas: la, classAssignments: ca } = await loadTeacherAssignments(user.id);

  return {
    userId: session.user.id,
    email: user.email,
    phone: user.phone,
    role: parseRole(user.role),
    baseRole: parseRole(user.role),
    persona: parsePersona(null, parseRole(user.role)), // Default persona logic
    dbUserId: user.id,
    learningAreas: la,
    classAssignments: ca,
  };
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

export function canManageUsers(actor: RequestActor): boolean {
  return actor.baseRole === "admin" && actor.persona === "admin";
}