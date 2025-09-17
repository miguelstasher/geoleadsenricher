#!/usr/bin/env node

/**
 * Environment Setup Helper
 * This script helps you set up the required environment variables for the Sales Tool
 */

const fs = require('fs');
const path = require('path');

const envExampleContent = `# Supabase Configuration
# Copy this file to .env.local and fill in your actual values

# Your Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here

# Your Supabase anon/public key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Example:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
`;

const envLocalPath = path.join(__dirname, '.env.local');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('🔧 Setting up environment configuration...\n');

// Create .env.example file
try {
  fs.writeFileSync(envExamplePath, envExampleContent);
  console.log('✅ Created .env.example file');
} catch (error) {
  console.error('❌ Error creating .env.example:', error.message);
}

// Check if .env.local exists
if (fs.existsSync(envLocalPath)) {
  console.log('⚠️  .env.local already exists');
  console.log('   If you need to update it, please edit it manually');
} else {
  console.log('📝 Creating .env.local template...');
  try {
    fs.writeFileSync(envLocalPath, envExampleContent);
    console.log('✅ Created .env.local file');
    console.log('   Please edit .env.local and add your actual Supabase credentials');
  } catch (error) {
    console.error('❌ Error creating .env.local:', error.message);
  }
}

console.log('\n📋 Next steps:');
console.log('1. Edit .env.local and replace the placeholder values with your actual Supabase credentials');
console.log('2. Get your Supabase URL and anon key from your Supabase project dashboard');
console.log('3. Restart your development server (npm run dev)');
console.log('\n🔗 Supabase Dashboard: https://supabase.com/dashboard');
console.log('   Go to Settings > API to find your project URL and anon key');
