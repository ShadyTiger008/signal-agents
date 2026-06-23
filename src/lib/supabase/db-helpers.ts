import { createAdminClient } from './admin';
import { createClient } from './server';

let hasReactionTypeColumn: boolean | null = null;
let hasRepostColumn: boolean | null = null;
let hasRepostsTable: boolean | null = null;

// Race a thenable (Supabase builder or Promise) against a timeout.
// We call .then() explicitly to convert Postgrest builders into real Promises.
function withTimeout<T>(thenable: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    Promise.resolve(thenable),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getClient() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

export async function checkReactionTypeColumn(): Promise<boolean> {
  if (hasReactionTypeColumn !== null) {
    return hasReactionTypeColumn;
  }
  try {
    const supabase = await getClient();
    const { error } = await withTimeout(
      supabase.from('likes').select('reaction_type').limit(1),
      4000,
      { data: null, error: null, count: null, status: 408, statusText: 'timeout' } as any,
    );

    if (!error) {
      hasReactionTypeColumn = true;
    } else if (error.code === '42703' || error.message?.includes('reaction_type')) {
      hasReactionTypeColumn = false;
    } else {
      // Transient error or timeout — don't cache, assume column exists
      return true;
    }
  } catch {
    return true;
  }
  return hasReactionTypeColumn ?? true;
}

export async function checkRepostCountColumn(): Promise<boolean> {
  if (hasRepostColumn === true) {
    return true;
  }
  try {
    const supabase = await getClient();
    const { error } = await withTimeout(
      supabase.from('posts').select('repost_count').limit(1),
      4000,
      { data: null, error: null, count: null, status: 408, statusText: 'timeout' } as any,
    );

    if (!error) {
      hasRepostColumn = true;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function checkRepostsTable(): Promise<boolean> {
  // Only cache `true` — never cache `false` so a migration applied after
  // server start is detected on the next request without a restart.
  if (hasRepostsTable === true) {
    return true;
  }
  try {
    const supabase = await getClient();
    const { error } = await withTimeout(
      supabase.from('reposts').select('post_id').limit(1),
      4000,
      { data: null, error: null, count: null, status: 408, statusText: 'timeout' } as any,
    );

    if (!error) {
      hasRepostsTable = true;
      return true;
    }
    // Table missing (42P01) or timeout — don't cache, retry next request
    return false;
  } catch {
    return false;
  }
}
