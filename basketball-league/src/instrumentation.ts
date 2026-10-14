export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { client } = await import("@/db/client");
  const { ensureSchema } = await import("@/db/ensure-schema");
  try {
    await ensureSchema(client);
  } catch (err) {
    console.error("[ensureSchema] failed", err);
  }
}
