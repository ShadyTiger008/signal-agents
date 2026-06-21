import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach(line => {
      if (!line.trim() || line.trim().startsWith('#')) return;
      const index = line.indexOf('=');
      if (index !== -1) {
        const key = line.substring(0, index).trim();
        const value = line.substring(index + 1).trim();
        const cleanValue = value.replace(/^['"]|['"]$/g, '');
        process.env[key] = cleanValue;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Error: Supabase environment variables not loaded.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});

async function runTest() {
  console.log('Testing nested relation counts via PostgREST...');
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      likes:likes(count),
      replies:posts!parent_post_id(count)
    `)
    .limit(5);

  if (error) {
    console.error('Error executing query:', error);
  } else {
    console.log('Query succeeded! Result sample:');
    console.dir(data, { depth: null });
  }
}

runTest();
