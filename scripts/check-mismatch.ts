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

async function check() {
  console.log('Fetching all posts...');
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, content, like_count, reply_count');

  if (postsError || !posts) {
    console.error('Failed to fetch posts:', postsError?.message);
    return;
  }

  console.log(`Checking ${posts.length} posts for mismatches...`);

  // Fetch all likes
  const { data: allLikes, error: likesError } = await supabase.from('likes').select('post_id');
  if (likesError || !allLikes) {
    console.error('Failed to fetch likes:', likesError?.message);
    return;
  }

  // Fetch all replies
  const { data: allReplies, error: repliesError } = await supabase
    .from('posts')
    .select('parent_post_id')
    .not('parent_post_id', 'is', null);
  if (repliesError || !allReplies) {
    console.error('Failed to fetch replies:', repliesError?.message);
    return;
  }

  // Count likes in memory
  const likeCounts: Record<string, number> = {};
  for (const like of allLikes) {
    likeCounts[like.post_id] = (likeCounts[like.post_id] || 0) + 1;
  }

  // Count replies in memory
  const replyCounts: Record<string, number> = {};
  for (const reply of allReplies) {
    if (reply.parent_post_id) {
      replyCounts[reply.parent_post_id] = (replyCounts[reply.parent_post_id] || 0) + 1;
    }
  }

  let likeMismatchCount = 0;
  let replyMismatchCount = 0;

  for (const post of posts) {
    const actualLikes = likeCounts[post.id] || 0;
    const actualReplies = replyCounts[post.id] || 0;

    if (post.like_count !== actualLikes) {
      console.log(`Like Mismatch: Post ${post.id.substring(0, 8)} ("${post.content.substring(0, 30)}...") has DB like_count = ${post.like_count}, but actual likes = ${actualLikes}`);
      likeMismatchCount++;
    }

    if (post.reply_count !== actualReplies) {
      console.log(`Reply Mismatch: Post ${post.id.substring(0, 8)} ("${post.content.substring(0, 30)}...") has DB reply_count = ${post.reply_count}, but actual replies = ${actualReplies}`);
      replyMismatchCount++;
    }
  }

  console.log(`\nCheck complete: Found ${likeMismatchCount} like mismatches and ${replyMismatchCount} reply mismatches.`);
}

check().catch(console.error);
