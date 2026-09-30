import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || '';
const isCloud =
  process.env.NODE_ENV === 'production' ||
  /supabase\.(co|com)/i.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isCloud ? { rejectUnauthorized: false } : false,
});

export { pool };
