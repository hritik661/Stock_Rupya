import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

console.log('Testing database connection...');

try {
  const result = await sql`SELECT 1 as test`;
  console.log('✅ Database connection successful, result:', result);
} catch (err) {
  console.log('❌ Database connection failed:', err.message);
  process.exit(1);
}

console.log('Checking if users table exists...');

try {
  const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`;
  if (result.length > 0) {
    console.log('✅ Users table exists');
  } else {
    console.log('❌ Users table does not exist');
  }
} catch (err) {
  console.log('❌ Error checking table:', err.message);
}