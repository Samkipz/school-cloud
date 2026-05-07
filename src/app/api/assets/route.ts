import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { canUploadModule, getRequestActor, toPolicyActor } from "@/lib/auth";
import { canCreatePortfolioUpload } from "@/lib/policy";
import { writeAuditLog } from "@/lib/audit-log";
import { getDb } from "@/lib/db";
import { assetStudents, assetTags, assets, students, tags } from "@/lib/schema";

const createAssetSchema = z.object({
  module: z.enum(["portfolio", "resources", "media", "tools"]),
  title: z.string().min(1),
  description: z.string().optional(),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  tags: z.array(z.string().min(1)).optional().default([]),
  studentId: z.string().uuid().optional(),
  approvalStatus: z.enum(["raw", "approved", "rejected"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await getRequestActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid asset payload" }, { status: 400 });
    }

    if (!canUploadModule(actor.role, parsed.data.module)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (parsed.data.module === "portfolio" && !parsed.data.studentId) {
      return NextResponse.json({ error: "studentId is required for portfolio uploads" }, { status: 400 });
    }

    const normalizedTags = Array.from(new Set(parsed.data.tags.map((tag) => tag.trim()).filter(Boolean)));
    if (parsed.data.module === "portfolio" && normalizedTags.length === 0) {
      return NextResponse.json({ error: "At least one tag is required for portfolio uploads" }, { status: 400 });
    }

    const db = getDb();

    if (parsed.data.studentId) {
      const studentExists = await db
        .select({ id: students.id, gradeId: students.gradeId, className: students.className })
        .from(students)
        .where(eq(students.id, parsed.data.studentId))
        .limit(1);
      if (!studentExists[0]) {
        return NextResponse.json({ error: "Invalid studentId" }, { status: 400 });
      }
      if (parsed.data.module === "portfolio") {
        if (!canCreatePortfolioUpload(toPolicyActor(actor), studentExists[0], normalizedTags)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const createdRows = await db
      .insert(assets)
      .values({
        module: parsed.data.module,
        title: parsed.data.title,
        description: parsed.data.description,
        storageKey: parsed.data.storageKey,
        mimeType: parsed.data.mimeType,
        fileSizeBytes: parsed.data.fileSizeBytes,
        uploadedBy: actor.dbUserId,
        visibility: "internal",
        approvalStatus: parsed.data.approvalStatus ?? (parsed.data.module === "media" ? "raw" : "approved"),
      })
      .returning({
        id: assets.id,
        module: assets.module,
        title: assets.title,
        createdAt: assets.createdAt,
      });
    const created = createdRows[0];

    for (const tagName of normalizedTags) {
      await db.insert(tags).values({ name: tagName }).onConflictDoNothing({ target: tags.name });
      const matched = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, tagName)).limit(1);
      if (matched[0]) {
        await db
          .insert(assetTags)
          .values({ assetId: created.id, tagId: matched[0].id })
          .onConflictDoNothing({ target: [assetTags.assetId, assetTags.tagId] });
      }
    }

    if (parsed.data.studentId) {
      await db
        .insert(assetStudents)
        .values({ assetId: created.id, studentId: parsed.data.studentId })
        .onConflictDoNothing({ target: [assetStudents.assetId, assetStudents.studentId] });
    }

    await writeAuditLog({
      actorId: actor.dbUserId,
      action: "asset.create",
      entityType: "asset",
      entityId: created.id,
      metadata: { module: parsed.data.module },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create asset" },
      { status: 500 },
    );
  }
}
