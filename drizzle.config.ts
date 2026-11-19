import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Prefer local developer env file, then fallback to standard .env.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env.docker" });
loadEnv({ path: ".env.production" });
loadEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run Drizzle commands.");
}

export default defineConfig({
  out: "./drizzle/migrations",
  schema: "./drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});

