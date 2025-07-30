const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Setting up production database...');

try {
  // Pull environment variables from Vercel
  console.log('📥 Pulling environment variables...');
  execSync('vercel env pull .env.production.local', { stdio: 'inherit' });
  
  // Generate Prisma client
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Push database schema
  console.log('📊 Pushing database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  console.log('✅ Database setup complete!');
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1);
} 