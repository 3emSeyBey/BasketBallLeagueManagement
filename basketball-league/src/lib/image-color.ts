import sharp from "sharp";

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

// Dominant color of an image (the most prominent color bucket) as a #rrggbb hex.
// Used to tint a team's bracket slot with its logo color. Returns null on failure.
export async function dominantHex(buffer: Buffer): Promise<string | null> {
  try {
    const { dominant } = await sharp(buffer).stats();
    return `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`;
  } catch {
    return null;
  }
}
