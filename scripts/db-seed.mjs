import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Add it to .env.local.");
}

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
});

try {
    await sql.begin(async (tx) => {
    await tx`TRUNCATE TABLE asset_students, asset_tags, collection_assets, versions, permissions, audit_logs, assets, collections, tags, students, grades, users RESTART IDENTITY CASCADE`;

    const [adminUser] = await tx`
      INSERT INTO users (full_name, email, role, department)
      VALUES ('System Admin', 'admin@schoolcloud.local', 'admin', 'Administration')
      RETURNING id
    `;

    const [teacherUser] = await tx`
      INSERT INTO users (full_name, email, role, department)
      VALUES ('Grace Wanjiru', 'teacher@schoolcloud.local', 'teacher', 'Academics')
      RETURNING id
    `;

    const [marketingUser] = await tx`
      INSERT INTO users (full_name, email, role, department)
      VALUES ('Daniel Mwangi', 'marketing@schoolcloud.local', 'marketing', 'Communications')
      RETURNING id
    `;

    const [grade10] = await tx`
      INSERT INTO grades (name, sort_order)
      VALUES ('Grade 10', 10)
      RETURNING id
    `;

    await tx`
      INSERT INTO students (admission_number, full_name, grade_id, class_name, is_active)
      VALUES
        ('G10-001', 'Emma Njeri', ${grade10.id}, 'Blue', true),
        ('G10-002', 'Liam Otieno', ${grade10.id}, 'Blue', true),
        ('G10-003', 'Ava Wambui', ${grade10.id}, 'Green', true),
        ('G10-004', 'Noah Kiptoo', ${grade10.id}, 'Green', true),
        ('G10-005', 'Sophia Akinyi', ${grade10.id}, 'Red', true)
    `;

    await tx`
      INSERT INTO tags (name)
      VALUES
        ('Grade 10'),
        ('CBC'),
        ('Biology'),
        ('Timetable'),
        ('Marketing Approved')
    `;

    await tx`
      INSERT INTO assets (
        module,
        title,
        description,
        storage_key,
        mime_type,
        file_size_bytes,
        visibility,
        approval_status,
        uploaded_by
      )
      VALUES
        ('portfolio', 'Grade 10 Biology Lab Report', 'Grade 10 Biology', 'portfolio/2026-05-01/biology-lab-report.pdf', 'application/pdf', 2450000, 'internal', 'approved', ${teacherUser.id}),
        ('portfolio', 'Student Reflection Video - Emma', 'Grade 10 Biology', 'portfolio/2026-05-01/emma-reflection.mp4', 'video/mp4', 48200000, 'internal', 'approved', ${teacherUser.id}),
        ('resources', 'Term 2 Master Timetable', 'Administration', 'resources/2026-05-01/term2-timetable.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 820000, 'internal', 'approved', ${adminUser.id}),
        ('resources', 'CBC Lesson Plan Template', 'Templates', 'resources/2026-05-01/cbc-lesson-plan.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 380000, 'internal', 'approved', ${teacherUser.id}),
        ('media', 'Sports Day Opening Ceremony', 'Events', 'media/2026-05-01/sports-day-opening.jpg', 'image/jpeg', 3100000, 'public', 'approved', ${marketingUser.id}),
        ('media', 'Choir Performance Rehearsal', 'Events', 'media/2026-05-01/choir-rehearsal.jpg', 'image/jpeg', 2750000, 'internal', 'raw', ${marketingUser.id}),
        ('tools', 'Assessment Rubric Template', 'Rubrics', 'tools/2026-05-01/assessment-rubric.pdf', 'application/pdf', 640000, 'internal', 'approved', ${teacherUser.id}),
        ('tools', 'Homework Tracking Sheet', 'Tracking', 'tools/2026-05-01/homework-tracking.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 530000, 'internal', 'approved', ${teacherUser.id})
    `;

    await tx`
      INSERT INTO permissions (module, role, can_view, can_upload, can_edit, can_approve)
      VALUES
        ('portfolio', 'admin', true, true, true, true),
        ('portfolio', 'teacher', true, true, true, false),
        ('resources', 'admin', true, true, true, true),
        ('resources', 'teacher', true, true, true, false),
        ('media', 'admin', true, true, true, true),
        ('media', 'marketing', true, true, true, true),
        ('tools', 'admin', true, true, true, true),
        ('tools', 'teacher', true, true, true, false)
    `;
  });

  console.log("Seed completed successfully.");
} finally {
  await sql.end({ timeout: 5 });
}
