import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing. Add it to your environment variables.`);
  }
  return value;
}

export function getStorageConfig() {
  return {
    bucket: requireEnv("STORAGE_BUCKET"),
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint: process.env.STORAGE_ENDPOINT,
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
  };
}

export function getS3Client() {
  const config = getStorageConfig();
  const accessKeyId = requireEnv("STORAGE_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("STORAGE_SECRET_ACCESS_KEY");

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: { accessKeyId, secretAccessKey },
  });
}
