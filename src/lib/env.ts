const requiredServerEnv = [
  "DATABASE_URL",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "NEXTAUTH_SECRET",
] as const;

let validated = false;

export function validateServerEnv() {
  if (validated) return;

  const missing = requiredServerEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  validated = true;
}
