import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

const HANDLE_TTL_MS = 8 * 60 * 60 * 1_000;

function handleKey(secret: string) {
  if (secret.length < 32) {
    throw new Error("Merge user identity secret must be at least 32 characters");
  }
  return createHash("sha256")
    .update(`shepard:merge-handle:${secret}`)
    .digest();
}

export function deriveMergeOriginUserId(
  providerSub: string,
  secret: string
): string {
  if (!providerSub.trim()) {
    throw new Error("Google provider subject is required");
  }
  if (secret.length < 32) {
    throw new Error("Merge user identity secret must be at least 32 characters");
  }

  const digest = createHmac("sha256", secret)
    .update(`google:${providerSub}`)
    .digest("hex");
  return `shepard_${digest}`;
}

export function sealMergeUserHandle(
  registeredUserId: string,
  originUserId: string,
  secret: string,
  now = Date.now()
): string {
  if (!registeredUserId.trim() || !originUserId.trim()) {
    throw new Error("Merge handle identifiers are required");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", handleKey(secret), iv);
  const plaintext = JSON.stringify({
    registeredUserId,
    originUserId,
    expiresAt: now + HANDLE_TTL_MS,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function openMergeUserHandle(
  sealed: string,
  expectedOriginUserId: string,
  secret: string,
  now = Date.now()
): string | undefined {
  try {
    const [version, rawIv, rawEncrypted, rawTag, extra] = sealed.split(".");
    if (version !== "v1" || !rawIv || !rawEncrypted || !rawTag || extra) {
      return undefined;
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      handleKey(secret),
      Buffer.from(rawIv, "base64url")
    );
    decipher.setAuthTag(Buffer.from(rawTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(rawEncrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plaintext) as Record<string, unknown>;
    if (
      payload.originUserId !== expectedOriginUserId ||
      typeof payload.registeredUserId !== "string" ||
      !payload.registeredUserId ||
      typeof payload.expiresAt !== "number" ||
      now >= payload.expiresAt
    ) {
      return undefined;
    }
    return payload.registeredUserId;
  } catch {
    return undefined;
  }
}
