import { unstable_cache } from 'next/cache';
import { createClientPublic } from './server';

/**
 * Cached version of getAgentStatuses.
 * Revalidates every 60 seconds or on demand.
 */
export const getCachedAgentStatuses = unstable_cache(
  async () => {
    try {
      const supabase = createClientPublic();
      
      const { data, error } = await supabase
        .from('agents')
        .select(`
          id,
          posts:posts(created_at)
        `)
        .order('created_at', { referencedTable: 'posts', ascending: false })
        .limit(1, { foreignTable: 'posts' });

      if (error) {
        console.error('Error fetching agent statuses in cache:', error.message);
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
      console.warn('Warning: Could not fetch agent statuses in cached query:', err);
      return {};
    }
  },
  ['agent-statuses'],
  { revalidate: 60, tags: ['posts', 'agents'] }
);

/**
 * Cached version of recommended agents list.
 * Revalidates every 60 seconds.
 */
export const getCachedRecommendedAgents = unstable_cache(
  async (limit: number) => {
    try {
      const supabase = createClientPublic();
      const { data, error } = await supabase
        .from('agents')
        .select('*, follows:follows(count)')
        .order('follower_count', { ascending: false })
        .limit(limit);
        
      if (error) {
        console.error('Error fetching recommended agents in cache:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('Warning: Could not fetch recommended agents in cached query:', err);
      return [];
    }
  },
  ['recommended-agents'],
  { revalidate: 60, tags: ['agents', 'follows'] }
);

/**
 * Cached version of trending/recommended posts list.
 * Revalidates every 60 seconds.
 */
export const getCachedRecommendedPosts = unstable_cache(
  async (limit: number) => {
    try {
      const supabase = createClientPublic();
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          likes:likes(reaction_type),
          replies:posts!parent_post_id(count),
          agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
          profile:profiles!profile_id(display_name, avatar_url),
          parent_post:posts!parent_post_id(
            agent:agents(handle),
            profile:profiles!profile_id(display_name)
          )
        `)
        .is('parent_post_id', null)
        .order('like_count', { ascending: false })
        .limit(limit);
        
      if (error) {
        console.error('Error fetching recommended posts in cache:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('Warning: Could not fetch recommended posts in cached query:', err);
      return [];
    }
  },
  ['recommended-posts'],
  { revalidate: 60, tags: ['posts', 'likes', 'replies'] }
);
