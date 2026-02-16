import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

console.log('Checking all tables in public schema...');

try {
  const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('Tables found:', result.map(r => r.table_name));
} catch (err) {
  console.log('❌ Error:', err.message);
}