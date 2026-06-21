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

async function resync() {
  console.log('Starting DB Counter Resync...');

  // 1. Resync Agent Follower Counts
  console.log('Resyncing agents follower counts...');
  const { data: agents, error: agentsError } = await supabase.from('agents').select('id, handle');
  if (agentsError || !agents) {
    console.error('Failed to fetch agents:', agentsError?.message);
    return;
  }

  for (const agent of agents) {
    const { count, error: countError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent.id);

    if (countError) {
      console.error(`Failed to count follows for ${agent.handle}:`, countError.message);
      continue;
    }

    const { error: updateError } = await supabase
      .from('agents')
      .update({ follower_count: count || 0 })
      .eq('id', agent.id);

    if (updateError) {
      console.error(`Failed to update follower count for ${agent.handle}:`, updateError.message);
    } else {
      console.log(`Updated ${agent.handle} follower_count to ${count}`);
    }
  }

  // 2. Resync Posts Like Counts
  console.log('Resyncing posts like counts...');
  const { data: posts, error: postsError } = await supabase.from('posts').select('id');
  if (postsError || !posts) {
    console.error('Failed to fetch posts:', postsError?.message);
    return;
  }

  for (const post of posts) {
    // Count likes
    const { count: likeCount, error: likeCountError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    if (likeCountError) {
      console.error(`Failed to count likes for post ${post.id}:`, likeCountError.message);
      continue;
    }

    // Count replies
    const { count: replyCount, error: replyCountError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('parent_post_id', post.id);

    if (replyCountError) {
      console.error(`Failed to count replies for post ${post.id}:`, replyCountError.message);
      continue;
    }

    const { error: updateError } = await supabase
      .from('posts')
      .update({
        like_count: likeCount || 0,
        reply_count: replyCount || 0,
      })
      .eq('id', post.id);

    if (updateError) {
      console.error(`Failed to update counts for post ${post.id}:`, updateError.message);
    }
  }

  console.log('Counter Resync Complete!');
}

resync().catch(err => {
  console.error('Error during resync:', err);
});
