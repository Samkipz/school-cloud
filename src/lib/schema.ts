import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "teacher", "marketing", "student"]);
export const moduleEnum = pgEnum("module", ["portfolio", "resources", "media", "tools"]);
export const visibilityEnum = pgEnum("visibility", ["private", "internal", "public"]);
export const approvalStatusEnum = pgEnum("approval_status", ["raw", "approved", "rejected"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 80 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 80 }).notNull(),
  lastName: varchar("last_name", { length: 80 }).notNull(),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  email: varchar("email", { length: 180 }).unique(),
  phone: varchar("phone", { length: 40 }).unique(),
  role: roleEnum("role").notNull().default("teacher"),
  department: varchar("department", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const grades = pgTable("grades", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 60 }).notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const learningAreas = pgTable("learning_areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  gradeId: uuid("grade_id").references(() => grades.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userLearningAreas = pgTable(
  "user_learning_areas",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    learningAreaId: uuid("learning_area_id")
      .references(() => learningAreas.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.learningAreaId] }),
  }),
);

export const classTeacherAssignments = pgTable("class_teacher_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  gradeId: uuid("grade_id")
    .references(() => grades.id, { onDelete: "cascade" })
    .notNull(),
  className: varchar("class_name", { length: 60 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  admissionNumber: varchar("admission_number", { length: 60 }).notNull().unique(),
  fullName: varchar("full_name", { length: 180 }).notNull(),
  gradeId: uuid("grade_id")
    .references(() => grades.id)
    .notNull(),
  className: varchar("class_name", { length: 60 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const collections = pgTable("collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  module: moduleEnum("module").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  grade: varchar("grade", { length: 30 }),
  department: varchar("department", { length: 120 }),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  module: moduleEnum("module").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  storageKey: text("storage_key").notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  visibility: visibilityEnum("visibility").notNull().default("internal"),
  approvalStatus: approvalStatusEnum("approval_status").notNull().default("raw"),
  uploadedBy: uuid("uploaded_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const collectionAssets = pgTable("collection_assets", {
  collectionId: uuid("collection_id")
    .references(() => collections.id)
    .notNull(),
  assetId: uuid("asset_id")
    .references(() => assets.id)
    .notNull(),
  linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
});

export const assetTags = pgTable("asset_tags", {
  assetId: uuid("asset_id")
    .references(() => assets.id)
    .notNull(),
  tagId: uuid("tag_id")
    .references(() => tags.id)
    .notNull(),
});

export const assetStudents = pgTable("asset_students", {
  assetId: uuid("asset_id")
    .references(() => assets.id)
    .notNull(),
  studentId: uuid("student_id")
    .references(() => students.id)
    .notNull(),
});

export const versions = pgTable("versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id")
    .references(() => assets.id)
    .notNull(),
  versionNumber: integer("version_number").notNull(),
  notes: text("notes"),
  storageKey: text("storage_key").notNull(),
  changedBy: uuid("changed_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  module: moduleEnum("module").notNull(),
  role: roleEnum("role").notNull(),
  canView: boolean("can_view").notNull().default(true),
  canUpload: boolean("can_upload").notNull().default(false),
  canEdit: boolean("can_edit").notNull().default(false),
  canApprove: boolean("can_approve").notNull().default(false),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 120 }).notNull(),
  entityId: uuid("entity_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
