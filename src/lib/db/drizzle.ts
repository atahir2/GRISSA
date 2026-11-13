import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../../drizzle/schema";

let cachedDb: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (cachedDb) return cachedDb;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for PostgreSQL mode.");
  }
  const pool = new Pool({
    connectionString: databaseUrl,
  });
  cachedDb = drizzle(pool, { schema });
  return cachedDb;
}

