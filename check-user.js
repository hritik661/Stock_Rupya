import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

console.log('Checking if user exists in database...');

try {
  const result = await sql`SELECT email, balance FROM users WHERE email = 'hritikparmar33@gmail.com'`;
  if (result.length > 0) {
    console.log('✅ User found in database:', result[0]);
  } else {
    console.log('❌ User not found in database');
  }
} catch (err) {
  console.log('❌ Error:', err.message);
}