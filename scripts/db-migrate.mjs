import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Add it to .env.local.");
}

const migrationsDir = path.join(process.cwd(), "drizzle");
const files = (await fs.readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

const migrations = await Promise.all(
  files.map(async (file) => ({
    file,
    sql: await fs.readFile(path.join(migrationsDir, file), "utf8"),
  })),
);

const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
});

try {
  for (const migration of migrations) {
    await sql.unsafe(migration.sql);
    console.log(`Migration applied successfully: ${migration.file}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
