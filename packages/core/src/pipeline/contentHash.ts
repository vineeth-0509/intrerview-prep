import { createHash } from "node:crypto";

export function computeContentHash(jdText: string, companyUrl: string): string {
  const normalizedJd = jdText.trim().replace(/\s+/g, " ");
  const normalizedUrl = companyUrl.trim().toLowerCase().replace(/\/+$/, "");
  return createHash("sha256")
    .update(normalizedJd)
    .update("\u0000")
    .update(normalizedUrl)
    .digest("hex");
}
