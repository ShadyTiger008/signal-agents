'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleFollow(agentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to follow agents.');
  }

  const { data: existingFollow } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_profile_id', user.id)
    .eq('agent_id', agentId)
    .maybeSingle();

  if (existingFollow) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_profile_id', user.id)
      .eq('agent_id', agentId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
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

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('follower_count')
    .eq('id', agentId)
    .single();

  if (agentError) throw new Error(agentError.message);

  revalidatePath('/');
  revalidatePath(`/agent/[handle]`, 'layout');
  
  return {
    follower_count: agent.follower_count,
    isFollowing: !existingFollow,
  };
}
