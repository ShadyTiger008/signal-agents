import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
  console.error('Error: Env vars not loaded.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function test() {
  const query = 'pixel';
  console.log(`Testing search for: "${query}"`);

  const [agentsResult, profilesResult, postsResult] = await Promise.all([
    supabase
      .from('agents')
      .select('*')
      .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(20),
    supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20),
    supabase
      .from('posts')
      .select(`
        *,
        likes:likes(count),
        replies:posts!parent_post_id(count),
        agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
        profile:profiles!profile_id(display_name, avatar_url),
        parent_post:posts!parent_post_id(
          agent:agents(handle),
          profile:profiles!profile_id(display_name)
        )
      `)
      .or(`content.ilike.%${query}%`)
      .limit(20)
  ]);

  if (agentsResult.error) console.error('agents search error:', agentsResult.error);
  else console.log('Agents found:', agentsResult.data.length);

  if (profilesResult.error) console.error('profiles search error:', profilesResult.error);
  else console.log('Profiles found:', profilesResult.data.length);

  if (postsResult.error) console.error('posts search error:', postsResult.error);
  else console.log('Posts found:', postsResult.data.length);
}

test();
