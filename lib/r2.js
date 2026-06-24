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

export function assertImageContentType(contentType, label = "File") {
  if (!contentType || !contentType.startsWith("image/")) {
    throw new Error(`${label} must be an image`);
  }
}

function extensionFromFileName(fileName, fallback = "jpg") {
  return String(fileName).split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || fallback;
}

async function bodyToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.transformToByteArray === "function") {
    return Buffer.from(await body.transformToByteArray());
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createPaymentProofKey(ticketId, fileName = "payment-proof") {
  const extension = extensionFromFileName(fileName);
  return `payment-proofs/${ticketId}/${crypto.randomUUID()}.${extension}`;
}

export function createRetailPriceScreenshotKey(ticketId, fileName = "retail-price-screenshot") {
  const extension = extensionFromFileName(fileName);
  return `retail-price-screenshots/${ticketId}/${crypto.randomUUID()}.${extension}`;
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

export async function createRetailPriceScreenshotUploadUrl({ key, contentType }) {
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

export async function createRetailPriceScreenshotViewUrl(key) {
  const { bucketName } = getR2Env();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: viewUrlExpiresInSeconds });
}

export async function getR2ObjectAttachment(key, fileName) {
  const { bucketName } = getR2Env();
  const response = await getR2Client().send(new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  }));
  const buffer = await bodyToBuffer(response.Body);

  return {
    filename: fileName,
    content: buffer.toString("base64"),
  };
}

export function isPaymentProofKeyForTicket(key, ticketId) {
  return typeof key === "string" && key.startsWith(`payment-proofs/${ticketId}/`);
}

export function isRetailPriceScreenshotKeyForTicket(key, ticketId) {
  return typeof key === "string" && key.startsWith(`retail-price-screenshots/${ticketId}/`);
}

export function getExtensionFromR2Key(key, fallback = "jpg") {
  return extensionFromFileName(key, fallback);
}
