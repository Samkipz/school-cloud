import { or, sql, type SQL } from "drizzle-orm";
import { assetStudents, assets, assetTags, students, tags } from "@/lib/schema";

export type AppRole = "admin" | "teacher" | "marketing" | "student";

export type AdminPersona = "admin" | "teacher";

/** Actor fields used for authorization (kept Clerk-free for unit tests). */
export type PolicyActor = {
  dbUserId: string;
  baseRole: AppRole;
  effectiveRole: AppRole;
  persona: AdminPersona;
  learningAreaNames: string[];
  classAssignments: { gradeId: string; classNameNorm: string }[];
};

export function normalizeClassName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function hasScopedTeacherAccess(actor: PolicyActor): boolean {
  return actor.effectiveRole === "teacher" && (actor.learningAreaNames.length > 0 || actor.classAssignments.length > 0);
}

export function isFullAdmin(actor: PolicyActor): boolean {
  return actor.baseRole === "admin" && actor.persona === "admin";
}

export function tagIntersectsLearningAreas(actor: PolicyActor, tagNames: string[]): boolean {
  if (!actor.learningAreaNames.length) return false;
  const tagSet = new Set(tagNames.map((t) => t.trim().toLowerCase()).filter(Boolean));
  return actor.learningAreaNames.some((la) => tagSet.has(la));
}

export function studentMatchesClassAssignment(
  actor: PolicyActor,
  student: { gradeId: string; className: string | null },
): boolean {
  if (!actor.classAssignments.length) return false;
  const cn = normalizeClassName(student.className);
  return actor.classAssignments.some((c) => c.gradeId === student.gradeId && c.classNameNorm === cn);
}

/** Portfolio list / student directory: restrict rows for scoped teachers. */
export function portfolioStudentsScopeWhere(actor: PolicyActor): SQL | undefined {
  if (actor.effectiveRole !== "teacher") return undefined;
  if (!hasScopedTeacherAccess(actor)) return undefined;

  const parts: SQL[] = [];
  for (const c of actor.classAssignments) {
    parts.push(
      sql`(${students.gradeId} = ${c.gradeId}::uuid and lower(trim(coalesce(${students.className}, ''))) = ${c.classNameNorm})`,
    );
  }
  if (actor.learningAreaNames.length) {
    const lowered = actor.learningAreaNames;
    parts.push(sql`exists (
      select 1 from ${assetStudents} ast
      inner join ${assets} a on a.id = ast.asset_id
      inner join ${assetTags} at2 on at2.asset_id = a.id
      inner join ${tags} t on t.id = at2.tag_id
      where ast.student_id = ${students.id}
        and a.module = 'portfolio'
        and lower(t.name) in (${sql.join(
          lowered.map((n) => sql`${n}`),
          sql`, `,
        )})
    )`);
  }
  return parts.length ? or(...parts) : undefined;
}

/** Search / asset lists: portfolio assets visible to scoped teacher. */
export function portfolioAssetsScopeWhere(actor: PolicyActor): SQL | undefined {
  if (actor.effectiveRole !== "teacher") return undefined;
  if (!hasScopedTeacherAccess(actor)) return undefined;

  const parts: SQL[] = [];
  for (const c of actor.classAssignments) {
    parts.push(sql`exists (
      select 1 from ${assetStudents} ast
      inner join ${students} s on s.id = ast.student_id
      where ast.asset_id = ${assets.id}
        and s.grade_id = ${c.gradeId}::uuid
        and lower(trim(coalesce(s.class_name, ''))) = ${c.classNameNorm}
    )`);
  }
  if (actor.learningAreaNames.length) {
    const lowered = actor.learningAreaNames;
    parts.push(sql`exists (
      select 1 from ${assetTags} at2
      inner join ${tags} t on t.id = at2.tag_id
      where at2.asset_id = ${assets.id}
        and lower(t.name) in (${sql.join(
          lowered.map((n) => sql`${n}`),
          sql`, `,
        )})
    )`);
  }
  return parts.length ? or(...parts) : undefined;
}

export function canMutatePortfolioAsset(
  actor: PolicyActor,
  ctx: {
    uploadedBy: string;
    tagNames: string[];
    studentIds: string[];
    studentRows: { id: string; gradeId: string; className: string | null }[];
  },
): boolean {
  if (isFullAdmin(actor)) return true;
  const isOwner = ctx.uploadedBy === actor.dbUserId;
  if (actor.effectiveRole !== "teacher") {
    if (actor.effectiveRole === "student") return isOwner;
    return isOwner;
  }

  if (!hasScopedTeacherAccess(actor)) {
    return isOwner;
  }

  const inClassStudent = ctx.studentRows.some((s) => studentMatchesClassAssignment(actor, s));
  const laOk = tagIntersectsLearningAreas(actor, ctx.tagNames);

  if (actor.classAssignments.length && actor.learningAreaNames.length) {
    return isOwner || inClassStudent || laOk;
  }
  if (actor.classAssignments.length) {
    return isOwner || inClassStudent;
  }
  if (actor.learningAreaNames.length) {
    return isOwner || laOk;
  }
  return isOwner;
}

export function canCreatePortfolioUpload(
  actor: PolicyActor,
  student: { gradeId: string; className: string | null },
  tagNames: string[],
): boolean {
  if (!canUploadPortfolio(actor)) return false;
  if (isFullAdmin(actor)) return true;
  if (actor.effectiveRole !== "teacher") return false;

  if (!hasScopedTeacherAccess(actor)) return true;

  if (actor.classAssignments.length && studentMatchesClassAssignment(actor, student)) return true;
  if (actor.learningAreaNames.length && tagIntersectsLearningAreas(actor, tagNames)) return true;
  if (!actor.classAssignments.length && actor.learningAreaNames.length) {
    return tagIntersectsLearningAreas(actor, tagNames);
  }
  if (actor.classAssignments.length && !actor.learningAreaNames.length) {
    return studentMatchesClassAssignment(actor, student);
  }
  return false;
}

export function canCreateStudentRecord(
  actor: PolicyActor,
  student: { gradeId: string; className: string | null },
): boolean {
  if (isFullAdmin(actor)) return true;
  if (actor.effectiveRole !== "teacher") return false;
  if (!hasScopedTeacherAccess(actor)) return true;
  return studentMatchesClassAssignment(actor, student);
}

export function canUploadPortfolio(actor: PolicyActor): boolean {
  if (actor.effectiveRole === "admin") return true;
  if (actor.effectiveRole === "teacher") return true;
  return false;
}

export function canManageStudentRecord(actor: PolicyActor, student: { gradeId: string; className: string | null }): boolean {
  if (isFullAdmin(actor)) return true;
  if (actor.effectiveRole !== "teacher") return false;
  if (!hasScopedTeacherAccess(actor)) return true;
  return studentMatchesClassAssignment(actor, student);
}

/** When true, route must verify LA-tagged portfolio evidence exists for this student. */
export function portfolioViewRequiresLaEvidenceCheck(
  actor: PolicyActor,
  student: { gradeId: string; className: string | null },
): boolean {
  if (actor.effectiveRole !== "teacher" || !hasScopedTeacherAccess(actor)) return false;
  if (studentMatchesClassAssignment(actor, student)) return false;
  return actor.learningAreaNames.length > 0;
}
