function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

// Dominant color of an image (the most prominent color bucket) as a #rrggbb hex.
// Used to tint a team's bracket slot with its logo color. Returns null on failure.
//
// `sharp` is a native module that can fail to load on some serverless runtimes.
// It's imported lazily here so that routes which only SERVE images (and never
// call this) don't pull sharp into their bundle and crash on load.
export async function dominantHex(buffer: Buffer): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const { dominant } = await sharp(buffer).stats();
    return `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`;
  } catch {
    return null;
  }
}
