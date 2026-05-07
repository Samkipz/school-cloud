import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit-log";
import { canReadModule, getRequestActor, toPolicyActor, type RequestActor } from "@/lib/auth";
import { canMutatePortfolioAsset, isFullAdmin, portfolioAssetsScopeWhere } from "@/lib/policy";
import { getDb } from "@/lib/db";
import { assetStudents, assetTags, assets, students, tags } from "@/lib/schema";
import { getS3Client, getStorageConfig } from "@/lib/storage";

const updateAssetSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  approvalStatus: z.enum(["raw", "approved", "rejected"]).optional(),
  tags: z.array(z.string().min(1)).min(1).optional(),
  studentId: z.string().uuid().nullable().optional(),
});

function isPrivilegedReader(actor: RequestActor) {
  return (
    actor.baseRole === "marketing" ||
    (actor.baseRole === "admin" && actor.persona === "admin")
  );
}

async function loadPortfolioMutationContext(db: ReturnType<typeof getDb>, assetId: string) {
  const tagRows = await db
    .select({ name: tags.name })
    .from(assetTags)
    .innerJoin(tags, eq(assetTags.tagId, tags.id))
    .where(eq(assetTags.assetId, assetId));
  const studentRows = await db
    .select({
      id: students.id,
      gradeId: students.gradeId,
      className: students.className,
    })
    .from(assetStudents)
    .innerJoin(students, eq(assetStudents.studentId, students.id))
    .where(eq(assetStudents.assetId, assetId));
  return {
    tagNames: tagRows.map((r) => r.name),
    studentIds: studentRows.map((r) => r.id),
    studentRows,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateAssetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db
    .select({
      id: assets.id,
      module: assets.module,
      uploadedBy: assets.uploadedBy,
    })
    .from(assets)
    .where(eq(assets.id, params.id))
    .limit(1);

  if (!existing[0]) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const isOwner = existing[0].uploadedBy === actor.dbUserId;
  const policyActor = toPolicyActor(actor);

  if (existing[0].module === "portfolio") {
    const ctx = await loadPortfolioMutationContext(db, params.id);
    if (!canMutatePortfolioAsset(policyActor, { uploadedBy: existing[0].uploadedBy, ...ctx })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!isOwner && !isFullAdmin(policyActor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.studentId) {
    const studentExists = await db.select({ id: students.id }).from(students).where(eq(students.id, parsed.data.studentId)).limit(1);
    if (!studentExists[0]) {
      return NextResponse.json({ error: "Invalid studentId" }, { status: 400 });
    }
  }

  const assetPatch: {
    title?: string;
    description?: string | null;
    approvalStatus?: "raw" | "approved" | "rejected";
  } = {};
  if (parsed.data.title !== undefined) assetPatch.title = parsed.data.title;
  if (parsed.data.description !== undefined) assetPatch.description = parsed.data.description;
  if (parsed.data.approvalStatus !== undefined) assetPatch.approvalStatus = parsed.data.approvalStatus;

  const updated = await db
    .update(assets)
    .set(assetPatch)
    .where(eq(assets.id, params.id))
    .returning({
      id: assets.id,
      title: assets.title,
      module: assets.module,
      approvalStatus: assets.approvalStatus,
    });

  if (parsed.data.tags) {
    await db.delete(assetTags).where(eq(assetTags.assetId, params.id));
    const normalizedTags = Array.from(new Set(parsed.data.tags.map((tag) => tag.trim()).filter(Boolean)));
    for (const tagName of normalizedTags) {
      await db.insert(tags).values({ name: tagName }).onConflictDoNothing({ target: tags.name });
      const matched = await db.select({ id: tags.id }).from(tags).where(eq(tags.name, tagName)).limit(1);
      if (matched[0]) {
        await db
          .insert(assetTags)
          .values({ assetId: params.id, tagId: matched[0].id })
          .onConflictDoNothing({ target: [assetTags.assetId, assetTags.tagId] });
      }
    }
  }

  if (existing[0].module === "portfolio" && parsed.data.studentId !== undefined) {
    await db.delete(assetStudents).where(eq(assetStudents.assetId, params.id));
    if (parsed.data.studentId) {
      await db.insert(assetStudents).values({ assetId: params.id, studentId: parsed.data.studentId });
    }
  }

  await writeAuditLog({
    actorId: actor.dbUserId,
    action: "asset.patch",
    entityType: "asset",
    entityId: params.id,
    metadata: { module: existing[0].module, fields: Object.keys(parsed.data) },
  });

  return NextResponse.json({ data: updated[0] });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const existing = await db
    .select({
      id: assets.id,
      module: assets.module,
      uploadedBy: assets.uploadedBy,
      storageKey: assets.storageKey,
    })
    .from(assets)
    .where(eq(assets.id, params.id))
    .limit(1);

  if (!existing[0]) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const policyActor = toPolicyActor(actor);
  if (existing[0].module === "portfolio") {
    const ctx = await loadPortfolioMutationContext(db, params.id);
    if (!canMutatePortfolioAsset(policyActor, { uploadedBy: existing[0].uploadedBy, ...ctx })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const isOwner = existing[0].uploadedBy === actor.dbUserId;
    if (!isOwner && !isFullAdmin(policyActor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.delete(assetTags).where(eq(assetTags.assetId, params.id));
  await db.delete(assetStudents).where(eq(assetStudents.assetId, params.id));
  await db.delete(assets).where(eq(assets.id, params.id));

  const config = getStorageConfig();
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: existing[0].storageKey }));

  await writeAuditLog({
    actorId: actor.dbUserId,
    action: "asset.delete",
    entityType: "asset",
    entityId: params.id,
    metadata: { module: existing[0].module },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getRequestActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: assets.id,
      title: assets.title,
      module: assets.module,
      description: assets.description,
      mimeType: assets.mimeType,
      fileSizeBytes: assets.fileSizeBytes,
      createdAt: assets.createdAt,
      storageKey: assets.storageKey,
      uploadedBy: assets.uploadedBy,
      approvalStatus: assets.approvalStatus,
    })
    .from(assets)
    .where(eq(assets.id, params.id))
    .limit(1);

  if (!rows[0]) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const tagRows = await db
    .select({ name: tags.name })
    .from(assetTags)
    .innerJoin(tags, eq(assetTags.tagId, tags.id))
    .where(eq(assetTags.assetId, params.id));

  const studentRows = await db
    .select({ studentId: assetStudents.studentId })
    .from(assetStudents)
    .where(eq(assetStudents.assetId, params.id));

  const isOwner = rows[0].uploadedBy === actor.dbUserId;
  const canRead = canReadModule(actor.role, rows[0].module);
  if (!isOwner && !canRead && !isPrivilegedReader(actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const scope = portfolioAssetsScopeWhere(toPolicyActor(actor));
  if (rows[0].module === "portfolio" && scope && !isOwner && !isPrivilegedReader(actor)) {
    const allowed = await db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, params.id), scope)).limit(1);
    if (!allowed[0]) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({
    data: {
      ...rows[0],
      tags: tagRows.map((row) => row.name),
      studentId: studentRows[0]?.studentId ?? null,
    },
  });
}
