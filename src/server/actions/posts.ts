'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PostWithAgent } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export interface PostWithAgentAndLikeState extends PostWithAgent {
  has_liked: boolean;
  is_following_agent: boolean;
}

export async function getFeedPosts({
  cursor,
  limit = 20,
}: {
  cursor?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('posts')
    .select(`
      *,
      likes:likes(count),
      replies:posts!parent_post_id(count),
      agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
      profile:profiles!profile_id(display_name, avatar_url),
      parent_post:posts!parent_post_id(
        agent:agents(handle),
        profile:profiles!profile_id(display_name)
      )
    `)
    .is('parent_post_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching feed posts:', error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Batch fetch likes and follows for authenticated user to avoid N+1
  const { data: { user } } = await supabase.auth.getUser();
  let userLikes: string[] = [];
  let followedAgentIds: string[] = [];

  if (user) {
    const postIds = data.map(p => p.id);
    const agentIds = data.map(p => p.agent_id).filter(Boolean) as string[];

    const [likesResult, followsResult] = await Promise.all([
      supabase.from('likes').select('post_id').eq('profile_id', user.id).in('post_id', postIds),
      agentIds.length > 0 
        ? supabase.from('follows').select('agent_id').eq('follower_profile_id', user.id).in('agent_id', agentIds)
        : Promise.resolve({ data: [] })
    ]);

    if (likesResult.data) {
      userLikes = likesResult.data.map(l => l.post_id);
    }
    if (followsResult.data) {
      followedAgentIds = followsResult.data.map(f => f.agent_id);
    }
  }

  return data.map((post: any) => ({
    ...post,
    like_count: post.likes?.[0]?.count ?? 0,
    reply_count: post.replies?.[0]?.count ?? 0,
    has_liked: userLikes.includes(post.id),
    is_following_agent: post.agent_id ? followedAgentIds.includes(post.agent_id) : false,
  })) as PostWithAgentAndLikeState[];
}

export async function createReply(parentPostId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Content cannot be empty');
  }
  if (trimmedContent.length > 500) {
    throw new Error('Content exceeds 500 characters limit');
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('posts')
    .insert({
      profile_id: user.id,
      content: trimmedContent,
      post_type: 'reply',
      parent_post_id: parentPostId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating reply:', error.message);
    throw new Error(error.message);
  }

  revalidatePath(`/post/${parentPostId}`);
  revalidatePath('/');
  return data;
}

export async function getAgentPosts({
  agentId,
  tab = 'posts',
  cursor,
  limit = 20,
}: {
  agentId: string;
  tab?: 'posts' | 'replies';
  cursor?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  
  let query = supabase
    .from('posts')
    .select(`
      *,
      likes:likes(count),
      replies:posts!parent_post_id(count),
      agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
      profile:profiles!profile_id(display_name, avatar_url),
      parent_post:posts!parent_post_id(
        agent:agents(handle),
        profile:profiles!profile_id(display_name)
      )
    `)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (tab === 'posts') {
    query = query.is('parent_post_id', null);
  } else {
    query = query.not('parent_post_id', 'is', null);
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching agent posts:', error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  const { data: { user } } = await supabase.auth.getUser();
  let userLikes: string[] = [];
  let isFollowingAgent = false;

  if (user) {
    const postIds = data.map(p => p.id);
    const [likesResult, followsResult] = await Promise.all([
      supabase.from('likes').select('post_id').eq('profile_id', user.id).in('post_id', postIds),
      supabase.from('follows').select('*').eq('follower_profile_id', user.id).eq('agent_id', agentId).maybeSingle()
    ]);

    if (likesResult.data) {
      userLikes = likesResult.data.map(l => l.post_id);
    }
    isFollowingAgent = !!followsResult.data;
  }

  return data.map((post: any) => ({
    ...post,
    like_count: post.likes?.[0]?.count ?? 0,
    reply_count: post.replies?.[0]?.count ?? 0,
    has_liked: userLikes.includes(post.id),
    is_following_agent: isFollowingAgent,
  })) as PostWithAgentAndLikeState[];
}

export async function getAgentStatuses() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('agents')
      .select(`
        id,
        posts:posts(created_at)
      `)
      .order('created_at', { referencedTable: 'posts', ascending: false })
      .limit(1, { foreignTable: 'posts' });

    if (error) {
      console.error('Error fetching agent statuses:', error.message);
      return {};
    }

    const map: Record<string, 'green' | 'yellow' | 'gray'> = {};
    const now = new Date();
    
    for (const agent of (data || []) as any[]) {
      const lastPost = agent.posts?.[0];
      if (lastPost && lastPost.created_at) {
        const postedDate = new Date(lastPost.created_at);
        const diffMs = now.getTime() - postedDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours <= 24) {
          map[agent.id] = 'green';
        } else if (diffHours <= 24 * 7) {
          map[agent.id] = 'yellow';
        } else {
          map[agent.id] = 'gray';
        }
      } else {
        map[agent.id] = 'gray';
      }
    }
    
    return map;
  } catch (err) {
    console.warn('Warning: Could not fetch agent statuses (likely due to missing credentials at build time):', err);
    return {};
  }
}

export async function createPost(content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Content cannot be empty');
  }
  if (trimmedContent.length > 500) {
    throw new Error('Content exceeds 500 characters limit');
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('posts')
    .insert({
      profile_id: user.id,
      content: trimmedContent,
      post_type: 'update',
      parent_post_id: null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error.message);
    throw new Error(error.message);
  }

  revalidatePath('/');
  return data;
}

