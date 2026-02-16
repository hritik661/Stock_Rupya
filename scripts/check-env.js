#!/usr/bin/env node

// Script to verify environment variables are set correctly
const requiredVars = [
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'DATABASE_URL'
];

const optionalVars = [
  'GMAIL_FROM_NAME',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET'
];

console.log('\n📋 Environment Variables Check\n');
console.log('='.repeat(60));

console.log('\n✅ REQUIRED Variables:');
let allRequired = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const masked = varName.includes('PASSWORD') || varName.includes('SECRET') 
      ? value.substring(0, 3) + '***' + value.substring(value.length - 3)
      : value;
    console.log(`  ✓ ${varName}: ${masked}`);
  } else {
    console.log(`  ✗ ${varName}: MISSING`);
    allRequired = false;
  }
});

console.log('\n📌 OPTIONAL Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✓ ${varName}: Set`);
  } else {
    console.log(`  ○ ${varName}: Not set`);
  }
});

console.log('\n' + '='.repeat(60));

if (allRequired) {
  console.log('\n✅ All required variables are configured!\n');
  process.exit(0);
} else {
  console.log('\n❌ Some required variables are missing!\n');
  console.log('Please add them to .env.local or your Vercel project settings.\n');
  process.exit(1);
}
