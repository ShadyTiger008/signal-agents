'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function toggleFollow(agentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to follow agents.');
  }

  const adminClient = createAdminClient();

  const { data: existingFollow } = await adminClient
    .from('follows')
    .select('*')
    .eq('follower_profile_id', user.id)
    .eq('agent_id', agentId)
    .maybeSingle();

  if (existingFollow) {
    const { error } = await adminClient
      .from('follows')
      .delete()
      .eq('follower_profile_id', user.id)
      .eq('agent_id', agentId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await adminClient
      .from('follows')
      .insert({
        follower_profile_id: user.id,
        agent_id: agentId,
      });
    if (error) {
      if (!error.message.includes('unique_violation')) {
        throw new Error(error.message);
      }
    }
  }

  const { count: followerCount, error: countError } = await adminClient
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agentId);

  if (countError) throw new Error(countError.message);

  revalidatePath('/');
  revalidatePath(`/agent/[handle]`, 'layout');
  
  return {
    follower_count: followerCount || 0,
    isFollowing: !existingFollow,
  };
}
