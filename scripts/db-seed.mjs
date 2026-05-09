import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Add it to .env.local.");
}

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
});

async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

try {
    await sql.begin(async (tx) => {
    await tx`TRUNCATE TABLE asset_students, asset_tags, collection_assets, versions, permissions, audit_logs, assets, collections, tags, students, grades, users RESTART IDENTITY CASCADE`;

    const hashedAdminPassword = await hashPassword("admin123");
    const hashedTeacherPassword = await hashPassword("teacher123");
    const hashedMarketingPassword = await hashPassword("marketing123");

    const [adminUser] = await tx`
      INSERT INTO users (username, password_hash, full_name, email, role, department)
      VALUES ('admin', ${hashedAdminPassword}, 'System Admin', 'admin@schoolcloud.local', 'admin', 'Administration')
      RETURNING id
    `;

    const [teacherUser] = await tx`
      INSERT INTO users (username, password_hash, full_name, email, role, department)
      VALUES ('teacher', ${hashedTeacherPassword}, 'Grace Wanjiru', 'teacher@schoolcloud.local', 'teacher', 'Academics')
      RETURNING id
    `;

    const [marketingUser] = await tx`
      INSERT INTO users (username, password_hash, full_name, email, role, department)
      VALUES ('marketing', ${hashedMarketingPassword}, 'Daniel Mwangi', 'marketing@schoolcloud.local', 'marketing', 'Communications')
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
        ('2601', 'Jadon Joseph Kihara', ${grade10.id}, 'East', true),
        ('2602', 'Mark Kamau', ${grade10.id}, 'East', true),
        ('2603', 'Eutychus Gatore', ${grade10.id}, 'East', true),
        ('2604', 'Austine Karau', ${grade10.id}, 'East', true),
        ('2605', 'Andrew Ndichu', ${grade10.id}, 'East', true),
        ('2606', 'Michael Kamau', ${grade10.id}, 'East', true),
        ('2607', 'Dilan Mutua', ${grade10.id}, 'East', true),
        ('2608', 'Bryaden Muiruri', ${grade10.id}, 'East', true),
        ('2609', 'Zephania Kamau', ${grade10.id}, 'East', true),
        ('2610', 'Michael Russo Nderitu', ${grade10.id}, 'East', true)
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
