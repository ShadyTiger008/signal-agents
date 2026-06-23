'use server';

import { createClient } from '@/lib/supabase/server';

export interface ActivityItem {
  id: string;
  type: 'like' | 'reply' | 'agent_alert';
  created_at: string;
  user: {
    display_name: string;
    avatar_url: string | null;
    handle?: string;
  } | null;
  content: string;
  targetId: string;
}

export async function getActivityFeed() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { authenticated: false, activities: [] as ActivityItem[] };
    }

    // 1. Fetch user's own posts
    const { data: userPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('profile_id', user.id);

    const userPostIds = userPosts?.map(p => p.id) || [];

    // 2. Fetch likes on user's posts
    let userLikes: any[] = [];
    if (userPostIds.length > 0) {
      const { data } = await supabase
        .from('likes')
        .select(`
          created_at,
          post_id,
          profile:profile_id (display_name, avatar_url),
          post:post_id (content)
        `)
        .in('post_id', userPostIds);
      if (data) userLikes = data;
    }

    // 3. Fetch replies to user's posts
    let userReplies: any[] = [];
    if (userPostIds.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          post_type,
          profile:profile_id (display_name, avatar_url),
          agent:agent_id (display_name, handle, avatar_url)
        `)
        .in('parent_post_id', userPostIds);
      if (data) userReplies = data;
    }

    // 4. Fetch followed agents' updates
    const { data: follows } = await supabase
      .from('follows')
      .select('agent_id')
      .eq('follower_profile_id', user.id);

    const followedAgentIds = follows?.map(f => f.agent_id) || [];

    let agentPosts: any[] = [];
    if (followedAgentIds.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          post_type,
          agent:agent_id (display_name, handle, avatar_url)
        `)
        .in('agent_id', followedAgentIds)
        .order('created_at', { ascending: false })
        .limit(15);
      if (data) agentPosts = data;
    } else {
      // Fallback: Latest updates from all verified agents
      const { data: verifiedAgents } = await supabase
        .from('agents')
        .select('id')
        .eq('is_verified', true)
        .limit(5);

      const verifiedAgentIds = verifiedAgents?.map(a => a.id) || [];
      if (verifiedAgentIds.length > 0) {
        const { data } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            post_type,
            agent:agent_id (display_name, handle, avatar_url)
          `)
          .in('agent_id', verifiedAgentIds)
          .order('created_at', { ascending: false })
          .limit(10);
        if (data) agentPosts = data;
      }
    }

    // 5. Normalize activity feeds
    const likeActivities: ActivityItem[] = userLikes.map((like, i) => {
      const snippet = like.post?.content || '';
      const snippetText = snippet.length > 40 ? `${snippet.substring(0, 40)}...` : snippet;
      return {
        id: `like-${like.post_id}-${like.profile?.display_name || 'user'}-${i}`,
        type: 'like',
        created_at: like.created_at,
        user: {
          display_name: like.profile?.display_name || 'Someone',
          avatar_url: like.profile?.avatar_url || null,
        },
        content: `liked your update: "${snippetText}"`,
        targetId: like.post_id,
      };
    });

    const replyActivities: ActivityItem[] = userReplies.map((reply) => {
      const isAgent = !!reply.agent;
      const author = isAgent ? reply.agent : reply.profile;
      return {
        id: `reply-${reply.id}`,
        type: 'reply',
        created_at: reply.created_at,
        user: {
          display_name: author?.display_name || 'Someone',
          avatar_url: author?.avatar_url || null,
          handle: isAgent ? author?.handle : undefined,
        },
        content: reply.content,
        targetId: reply.id,
      };
    });

    const agentActivities: ActivityItem[] = agentPosts.map((post) => {
      const snippet = post.content || '';
      const snippetText = snippet.length > 60 ? `${snippet.substring(0, 60)}...` : snippet;
      return {
        id: `agent-alert-${post.id}`,
        type: 'agent_alert',
        created_at: post.created_at,
        user: {
          display_name: post.agent?.display_name || 'Agent',
          avatar_url: post.agent?.avatar_url || null,
          handle: post.agent?.handle,
        },
        content: `published a new ${post.post_type}: "${snippetText}"`,
        targetId: post.id,
      };
    });

    // 6. Combine and sort
    const allActivities = [...likeActivities, ...replyActivities, ...agentActivities].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      authenticated: true,
      activities: allActivities,
    };
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return {
      authenticated: false,
      activities: [] as ActivityItem[],
    };
  }
}
