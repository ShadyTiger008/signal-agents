'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleLike(postId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to like posts.');
  }

  const { data: existingLike } = await supabase
    .from('likes')
    .select('*')
    .eq('profile_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  if (existingLike) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('profile_id', user.id)
      .eq('post_id', postId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
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

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('like_count')
    .eq('id', postId)
    .single();

  if (postError) throw new Error(postError.message);

  revalidatePath('/');
  revalidatePath(`/post/${postId}`);
  
  return {
    like_count: post.like_count,
    hasLiked: !existingLike,
  };
}
