'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function toggleLike(postId: string, reactionType: string = 'like') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You must be logged in to react to posts.');
  }

  const adminClient = createAdminClient();

  const { data: existingLike } = await adminClient
    .from('likes')
    .select('*')
    .eq('profile_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  let hasLiked = false;
  let currentReaction: string | null = null;

  if (existingLike) {
    const existingReactionType = existingLike.reaction_type ?? 'like';
    if (existingReactionType === reactionType) {
      // Toggle off
      const { error } = await adminClient
        .from('likes')
        .delete()
        .eq('profile_id', user.id)
        .eq('post_id', postId);
      if (error) throw new Error(error.message);
      hasLiked = false;
      currentReaction = null;
    } else {
      // Update reaction
      try {
        const { error } = await adminClient
          .from('likes')
          .update({ reaction_type: reactionType })
          .eq('profile_id', user.id)
          .eq('post_id', postId);
        if (error) {
          // If column doesn't exist, fallback
          if (error.message.includes('column') && error.message.includes('reaction_type')) {
            // Treat as toggle off since we cannot update to another type
            const { error: delError } = await adminClient
              .from('likes')
              .delete()
              .eq('profile_id', user.id)
              .eq('post_id', postId);
            if (delError) throw new Error(delError.message);
            hasLiked = false;
            currentReaction = null;
          } else {
            throw new Error(error.message);
          }
        } else {
          hasLiked = true;
          currentReaction = reactionType;
        }
      } catch (err: any) {
        throw new Error(err.message);
      }
    }
  } else {
    // Insert new reaction
    try {
      const { error } = await adminClient
        .from('likes')
        .insert({
          profile_id: user.id,
          post_id: postId,
          reaction_type: reactionType,
        });

      if (error) {
        if (error.message.includes('column') && error.message.includes('reaction_type')) {
          // Fallback to inserting without reaction_type
          const { error: fallbackError } = await adminClient
            .from('likes')
            .insert({
              profile_id: user.id,
              post_id: postId,
            });
          if (fallbackError) {
            if (!fallbackError.message.includes('unique_violation')) {
              throw new Error(fallbackError.message);
            }
          }
          hasLiked = true;
          currentReaction = 'like';
        } else if (!error.message.includes('unique_violation')) {
          throw new Error(error.message);
        } else {
          hasLiked = true;
          currentReaction = reactionType;
        }
      } else {
        hasLiked = true;
        currentReaction = reactionType;
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  // Fetch updated reactions count and all reactions on this post
  let likesList: { reaction_type?: string }[] = [];
  try {
    const { data: likes, error: fetchError } = await adminClient
      .from('likes')
      .select('reaction_type')
      .eq('post_id', postId);
      
    if (fetchError) {
      // Fallback if column doesn't exist
      const { count: likeCount } = await adminClient
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      likesList = Array(likeCount || 0).fill({ reaction_type: 'like' });
    } else {
      likesList = likes || [];
    }
  } catch (err) {
    const { count: likeCount } = await adminClient
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    likesList = Array(likeCount || 0).fill({ reaction_type: 'like' });
  }

  revalidatePath('/');
  revalidatePath(`/post/${postId}`);

  return {
    like_count: likesList.length,
    hasLiked,
    userReaction: currentReaction,
    likes: likesList,
  };
}
