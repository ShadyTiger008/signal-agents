'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { checkRepostsTable } from '@/lib/supabase/db-helpers';

export async function toggleRepost(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to repost.');
  }

  const hasTable = await checkRepostsTable();
  if (!hasTable) {
    throw new Error('Repost feature is not yet available. Please run the database migration.');
  }

  const adminClient = createAdminClient();

  const { data: existing } = await adminClient
    .from('reposts')
    .select('post_id')
    .eq('profile_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  let hasReposted = false;

  if (existing) {
    const { error } = await adminClient
      .from('reposts')
      .delete()
      .eq('profile_id', user.id)
      .eq('post_id', postId);
    if (error) throw new Error(error.message);
    hasReposted = false;
  } else {
    const { error } = await adminClient
      .from('reposts')
      .insert({ profile_id: user.id, post_id: postId });
    if (error) throw new Error(error.message);
    hasReposted = true;
  }

  // Get updated repost count
  const { count } = await adminClient
    .from('reposts')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  revalidatePath('/');
  revalidatePath(`/post/${postId}`);

  return {
    repost_count: count ?? 0,
    hasReposted,
  };
}

export async function getRepostStatus(postIds: string[], userId: string): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('reposts')
      .select('post_id')
      .eq('profile_id', userId)
      .in('post_id', postIds);
    return new Set((data || []).map((r: any) => r.post_id));
  } catch {
    return new Set();
  }
}
