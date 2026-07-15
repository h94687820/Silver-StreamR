import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type DB = NeonHttpDatabase<typeof schema>;

export function createDb(connectionString: string): DB {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}
