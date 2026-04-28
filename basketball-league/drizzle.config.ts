import { defineConfig } from "drizzle-kit";

// drizzle-kit 0.31.x removed the `driver: "libsql"` option from the sqlite
// dialect typings (it became a hard TS error rather than the deprecation
// warning the spec anticipated). The supported equivalent is `dialect: "turso"`,
// which works for both local `file:` URLs and remote libSQL/Turso URLs.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
