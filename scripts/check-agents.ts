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

async function check() {
  console.log('Comparing agents.follower_count with follows table count...');
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, handle, display_name, follower_count, follows:follows(count)');

  if (error) {
    console.error('Error:', error);
    return;
  }

  for (const agent of agents) {
    const actualFollowers = agent.follows?.[0]?.count ?? 0;
    if (agent.follower_count !== actualFollowers) {
      console.log(`Mismatch for @${agent.handle}: agents table has ${agent.follower_count}, follows table has ${actualFollowers}`);
    } else {
      console.log(`@${agent.handle}: in sync (${agent.follower_count})`);
    }
  }
}

check();
