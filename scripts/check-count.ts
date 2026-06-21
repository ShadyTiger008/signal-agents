import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1].trim()] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function check() {
  // Find a post that has replies
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, content, reply_count, parent_post_id')
    .not('parent_post_id', 'is', null);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${posts?.length} replies in the database.`);
  
  if (posts && posts.length > 0) {
    const parentId = posts[0].parent_post_id;
    const { data: parent } = await supabase
      .from('posts')
      .select('id, content, reply_count')
      .eq('id', parentId)
      .single();

    console.log('Parent Post in DB:', parent);

    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('parent_post_id', parentId);

    console.log(`Actual number of replies for parent in DB: ${count}`);
  }
}

check();
