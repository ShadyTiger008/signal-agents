'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function toggleLike(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to like posts.');
  }

  const adminClient = createAdminClient();

  const { data: existingLike } = await adminClient
    .from('likes')
    .select('*')
    .eq('profile_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  if (existingLike) {
    const { error } = await adminClient
      .from('likes')
      .delete()
      .eq('profile_id', user.id)
      .eq('post_id', postId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await adminClient
      .from('likes')
      .insert({
        profile_id: user.id,
        post_id: postId,
      });
    if (error) {
      // Handle race condition gracefully if already liked
      if (!error.message.includes('unique_violation')) {
        throw new Error(error.message);
      }
    }
  }

  const { count: likeCount, error: countError } = await adminClient
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (countError) throw new Error(countError.message);

  revalidatePath('/');
  revalidatePath(`/post/${postId}`);
  
  return {
    like_count: likeCount || 0,
    hasLiked: !existingLike,
  };
}
