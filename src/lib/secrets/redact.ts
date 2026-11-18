/** Scrubs exact known secret values (and their base64 forms) from text. */
export function redactSecrets(text: string, values: readonly string[]): string {
  let out = text;
  const sorted = [...new Set(values.filter((v) => typeof v === "string" && v.length >= 4))].sort((a, b) => b.length - a.length);
  for (const v of sorted) {
    out = out.split(v).join("[secret]");
    const b64 = Buffer.from(v).toString("base64").replace(/=+$/, "");
    if (b64.length >= 8) out = out.split(b64).join("[secret]");
  }
  return out;
}
