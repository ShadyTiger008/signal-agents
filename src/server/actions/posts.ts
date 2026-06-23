'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PostWithAgent, FeedItem } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { checkReactionTypeColumn, checkRepostsTable } from '@/lib/supabase/db-helpers';

export interface PostWithAgentAndLikeState extends PostWithAgent {
  has_liked: boolean;
  has_reposted: boolean;
  user_reaction?: string | null;
  is_following_agent: boolean;
  likes?: { reaction_type?: string }[];
}

// ─────────────────────────────────────────────────────
// getFeedPosts — raw posts only (used for "load more")
// ─────────────────────────────────────────────────────
export async function getFeedPosts({
  cursor,
  limit = 20,
  followingOnly = false,
}: {
  cursor?: string;
  limit?: number;
  followingOnly?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hasReactions = await checkReactionTypeColumn();
  const likesSelect = hasReactions ? 'likes:likes(reaction_type)' : 'likes:likes(count)';
  
  let query = supabase
    .from('posts')
    .select(`
      *,
      ${likesSelect},
      replies:posts!parent_post_id(count),
      agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
      profile:profiles!profile_id(display_name, avatar_url),
      parent_post:posts!parent_post_id(
        agent:agents(handle),
        profile:profiles!profile_id(display_name)
      )
    `)
    .is('parent_post_id', null);

  if (followingOnly) {
    if (!user) return [];
    const { data: followsData } = await supabase
      .from('follows')
      .select('agent_id')
      .eq('follower_profile_id', user.id);
    const followedAgentIds = followsData ? followsData.map(f => f.agent_id) : [];
    if (followedAgentIds.length === 0) return [];
    query = query.in('agent_id', followedAgentIds);
  }

  query = query.order('created_at', { ascending: false }).limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching feed posts:', error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  let userReactions: Record<string, string> = {};
  let followedAgentIds: string[] = [];
  let userRepostIds = new Set<string>();

  if (user) {
    const postIds = data.map(p => p.id);
    const agentIds = data.map(p => p.agent_id).filter(Boolean) as string[];
    const hasRepostsT = await checkRepostsTable();

    const [likesResult, followsResult, repostsResult] = await Promise.all([
      supabase.from('likes').select(hasReactions ? 'post_id, reaction_type' : 'post_id').eq('profile_id', user.id).in('post_id', postIds),
      agentIds.length > 0
        ? supabase.from('follows').select('agent_id').eq('follower_profile_id', user.id).in('agent_id', agentIds)
        : Promise.resolve({ data: [] }),
      hasRepostsT && postIds.length > 0
        ? createAdminClient().from('reposts').select('post_id').eq('profile_id', user.id).in('post_id', postIds)
        : Promise.resolve({ data: [] }),
    ]);

    if (likesResult.data) {
      likesResult.data.forEach((l: any) => { userReactions[l.post_id] = l.reaction_type ?? 'like'; });
    }
    if (followsResult.data) {
      followedAgentIds = followsResult.data.map(f => f.agent_id);
    }
    if (repostsResult.data) {
      userRepostIds = new Set(repostsResult.data.map((r: any) => r.post_id));
    }
  }

  return data.map((post: any) => {
    const likeCount = hasReactions ? (post.likes?.length ?? 0) : (post.likes?.[0]?.count ?? 0);
    return {
      ...post,
      like_count: likeCount,
      repost_count: post.repost_count ?? 0,
      reply_count: post.replies?.[0]?.count ?? 0,
      has_liked: user ? !!userReactions[post.id] : false,
      has_reposted: user ? userRepostIds.has(post.id) : false,
      user_reaction: user ? (userReactions[post.id] ?? null) : null,
      is_following_agent: post.agent_id ? followedAgentIds.includes(post.agent_id) : false,
      likes: hasReactions ? post.likes : undefined,
    };
  }) as PostWithAgentAndLikeState[];
}

// ─────────────────────────────────────────────────────
// getFeedItems — merges posts + repost cards for home feed
// ─────────────────────────────────────────────────────
export async function getFeedItems({
  cursor,
  limit = 20,
  followingOnly = false,
}: {
  cursor?: string;
  limit?: number;
  followingOnly?: boolean;
}): Promise<FeedItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const hasReactions = await checkReactionTypeColumn();
  const hasRepostsT = await checkRepostsTable();
  const likesSelect = hasReactions ? 'likes:likes(reaction_type)' : 'likes:likes(count)';

  let followedAgentIds: string[] = [];
  if (followingOnly && user) {
    const { data: followsData } = await supabase
      .from('follows')
      .select('agent_id')
      .eq('follower_profile_id', user.id);
    followedAgentIds = followsData ? followsData.map(f => f.agent_id) : [];
    if (followedAgentIds.length === 0) return [];
  }

  // Fetch original posts
  let postQuery = supabase
    .from('posts')
    .select(`
      *,
      ${likesSelect},
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

  if (followingOnly) {
    postQuery = postQuery.in('agent_id', followedAgentIds);
  }
  if (cursor) {
    postQuery = postQuery.lt('created_at', cursor);
  }

  // Fetch reposts by followed users or all reposts for "For You"
  let repostQuery = hasRepostsT
    ? supabase
        .from('reposts')
        .select(`
          profile_id,
          post_id,
          created_at,
          profile:profiles!profile_id(id, display_name, avatar_url),
          post:posts!post_id(
            *,
            ${likesSelect},
            replies:posts!parent_post_id(count),
            agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
            profile:profiles!profile_id(display_name, avatar_url),
            parent_post:posts!parent_post_id(
              agent:agents(handle),
              profile:profiles!profile_id(display_name)
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)
    : null;

  if (repostQuery && cursor) {
    repostQuery = repostQuery.lt('created_at', cursor);
  }

  const [postsResult, repostsResult] = await Promise.all([
    postQuery,
    repostQuery ?? Promise.resolve({ data: [] }),
  ]);

  const postsData = postsResult.data || [];
  const repostsData = (repostsResult.data || []) as any[];

  // Batch enrich with user data
  let userReactions: Record<string, string> = {};
  let userFollowedAgentIds: string[] = [];
  let userRepostIds = new Set<string>();

  if (user) {
    const allPostIds = [
      ...postsData.map(p => p.id),
      ...repostsData.map(r => r.post_id),
    ];
    const uniquePostIds = [...new Set(allPostIds)];
    const agentIds = postsData.map(p => p.agent_id).filter(Boolean) as string[];

    const [likesResult, followsResult, repostsCheckResult] = await Promise.all([
      uniquePostIds.length > 0
        ? supabase.from('likes').select(hasReactions ? 'post_id, reaction_type' : 'post_id').eq('profile_id', user.id).in('post_id', uniquePostIds)
        : Promise.resolve({ data: [] }),
      agentIds.length > 0
        ? supabase.from('follows').select('agent_id').eq('follower_profile_id', user.id).in('agent_id', agentIds)
        : Promise.resolve({ data: [] }),
      hasRepostsT && uniquePostIds.length > 0
        ? createAdminClient().from('reposts').select('post_id').eq('profile_id', user.id).in('post_id', uniquePostIds)
        : Promise.resolve({ data: [] }),
    ]);

    if (likesResult.data) {
      likesResult.data.forEach((l: any) => { userReactions[l.post_id] = l.reaction_type ?? 'like'; });
    }
    if (followsResult.data) {
      userFollowedAgentIds = followsResult.data.map(f => f.agent_id);
    }
    if (repostsCheckResult.data) {
      userRepostIds = new Set(repostsCheckResult.data.map((r: any) => r.post_id));
    }
  }

  function mapPost(post: any): PostWithAgentAndLikeState {
    const likeCount = hasReactions ? (post.likes?.length ?? 0) : (post.likes?.[0]?.count ?? 0);
    return {
      ...post,
      like_count: likeCount,
      repost_count: post.repost_count ?? 0,
      reply_count: post.replies?.[0]?.count ?? 0,
      has_liked: user ? !!userReactions[post.id] : false,
      has_reposted: user ? userRepostIds.has(post.id) : false,
      user_reaction: user ? (userReactions[post.id] ?? null) : null,
      is_following_agent: post.agent_id ? userFollowedAgentIds.includes(post.agent_id) : false,
      likes: hasReactions ? post.likes : undefined,
    };
  }

  // Build feed items list
  const postItems: FeedItem[] = postsData.map(post => ({
    itemType: 'post' as const,
    sortKey: post.created_at,
    data: mapPost(post),
  }));

  const repostItems: FeedItem[] = repostsData
    .filter(r => r.post) // guard against null post (deleted)
    .map(r => ({
      itemType: 'repost' as const,
      sortKey: r.created_at,
      repostedBy: {
        id: r.profile_id,
        display_name: r.profile?.display_name ?? null,
        avatar_url: r.profile?.avatar_url ?? null,
      },
      repostedAt: r.created_at,
      data: mapPost({ ...r.post, parent_post_id: null }), // reposts show top-level
    }));

  // Merge and sort by sortKey descending, deduplicate (prefer post over repost for same post id)
  const seen = new Set<string>();
  const merged = [...postItems, ...repostItems]
    .sort((a, b) => new Date(b.sortKey).getTime() - new Date(a.sortKey).getTime())
    .filter(item => {
      const key = `${item.itemType}-${item.data.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);

  return merged;
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
  const hasReactions = await checkReactionTypeColumn();
  const likesSelect = hasReactions ? 'likes:likes(reaction_type)' : 'likes:likes(count)';
  
  let query = supabase
    .from('posts')
    .select(`
      *,
      ${likesSelect},
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
  let userReactions: Record<string, string> = {};
  let isFollowingAgent = false;
  let userRepostIds = new Set<string>();

  if (user) {
    const postIds = data.map(p => p.id);
    const hasRepostsT = await checkRepostsTable();

    const [likesResult, followsResult, repostsResult] = await Promise.all([
      supabase.from('likes').select(hasReactions ? 'post_id, reaction_type' : 'post_id').eq('profile_id', user.id).in('post_id', postIds),
      supabase.from('follows').select('*').eq('follower_profile_id', user.id).eq('agent_id', agentId).maybeSingle(),
      hasRepostsT && postIds.length > 0
        ? createAdminClient().from('reposts').select('post_id').eq('profile_id', user.id).in('post_id', postIds)
        : Promise.resolve({ data: [] }),
    ]);

    if (likesResult.data) {
      likesResult.data.forEach((l: any) => { userReactions[l.post_id] = l.reaction_type ?? 'like'; });
    }
    isFollowingAgent = !!followsResult.data;
    if (repostsResult.data) {
      userRepostIds = new Set(repostsResult.data.map((r: any) => r.post_id));
    }
  }

  return data.map((post: any) => {
    const likeCount = hasReactions ? (post.likes?.length ?? 0) : (post.likes?.[0]?.count ?? 0);
    return {
      ...post,
      like_count: likeCount,
      repost_count: post.repost_count ?? 0,
      reply_count: post.replies?.[0]?.count ?? 0,
      has_liked: user ? !!userReactions[post.id] : false,
      has_reposted: user ? userRepostIds.has(post.id) : false,
      user_reaction: user ? (userReactions[post.id] ?? null) : null,
      is_following_agent: isFollowingAgent,
      likes: hasReactions ? post.likes : undefined,
    };
  }) as PostWithAgentAndLikeState[];
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
