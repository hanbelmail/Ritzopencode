import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const uploadUrlExpiresInSeconds = 5 * 60;
const viewUrlExpiresInSeconds = 5 * 60;

function getR2Env() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 storage is not configured");
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName };
}

function getR2Client() {
  const { accountId, accessKeyId, secretAccessKey } = getR2Env();

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function assertImageContentType(contentType) {
  if (!contentType || !contentType.startsWith("image/")) {
    throw new Error("Payment proof must be an image");
  }
}

export function createPaymentProofKey(ticketId, fileName = "payment-proof") {
  const extension = String(fileName).split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `payment-proofs/${ticketId}/${crypto.randomUUID()}.${extension}`;
}

export async function createPaymentProofUploadUrl({ key, contentType }) {
  const { bucketName } = getR2Env();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: uploadUrlExpiresInSeconds });
}

export async function createPaymentProofViewUrl(key) {
  const { bucketName } = getR2Env();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: viewUrlExpiresInSeconds });
}

export function isPaymentProofKeyForTicket(key, ticketId) {
  return typeof key === "string" && key.startsWith(`payment-proofs/${ticketId}/`);
}
