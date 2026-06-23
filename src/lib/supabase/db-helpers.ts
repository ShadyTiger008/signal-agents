import { createAdminClient } from './admin';
import { createClient } from './server';

let hasReactionTypeColumn: boolean | null = null;
let hasRepostColumn: boolean | null = null;
let hasRepostsTable: boolean | null = null;

async function getClient() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

export async function checkReactionTypeColumn() {
  if (hasReactionTypeColumn !== null) {
    return hasReactionTypeColumn;
  }
  try {
    const supabase = await getClient();
    const { error } = await supabase.from('likes').select('reaction_type').limit(1);

    if (!error) {
      hasReactionTypeColumn = true;
    } else {
      if (error.code === '42703' || error.message?.includes('reaction_type')) {
        hasReactionTypeColumn = false;
      } else {
        return false;
      }
    }
  } catch {
    return false;
  }
  return hasReactionTypeColumn;
}

export async function checkRepostCountColumn() {
  if (hasRepostColumn === true) {
    return true;
  }
  try {
    const supabase = await getClient();
    const { error } = await supabase.from('posts').select('repost_count').limit(1);

    if (!error) {
      hasRepostColumn = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function checkRepostsTable() {
  // Only cache `true` — never cache `false` so a migration applied after
  // server start is detected on the next request without a restart.
  if (hasRepostsTable === true) {
    return true;
  }
  try {
    const supabase = await getClient();
    const { error } = await supabase.from('reposts').select('post_id').limit(1);

    if (!error) {
      hasRepostsTable = true;
      return true;
    }
    // Table missing (42P01) or relation error → don't cache, retry next time
    return false;
  } catch {
    return false;
  }
}
