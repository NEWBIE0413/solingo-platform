import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/db/schema";

// Any Postgres (local Docker, NucBox, Neon over TCP). The upstream clone used Neon's HTTP driver,
// which only speaks to Neon; node-postgres removes that lock-in.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

export default db;
