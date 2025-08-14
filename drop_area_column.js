const { createClient } = require('@supabase/supabase-js');

// Manual environment variables (replace with your actual values)
const SUPABASE_URL = 'https://xkcdlkxqvxkafxunxdmr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrY2Rsa3hxdnhrYWZ4dW54ZG1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDM2NTIwNSwiZXhwIjoyMDQ5OTQxMjA1fQ.cXTNZmPu8fgBVwxTI4XxAFgGrDCNJgSu8iBjGgAHLiQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function dropAreaColumn() {
  console.log('Dropping area column from leads table...');
  
  try {
    // Try to drop the column using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE leads DROP COLUMN IF EXISTS area;'
    });
    
    if (error) {
      console.error('RPC method failed:', error);
      console.log('The column may need to be dropped manually through Supabase dashboard');
      return;
    }
    
    console.log('Successfully dropped area column from database');
    
  } catch (err) {
    console.error('Script error:', err);
    console.log('Please drop the area column manually through Supabase SQL Editor:');
    console.log('ALTER TABLE leads DROP COLUMN IF EXISTS area;');
  }
}

dropAreaColumn(); 