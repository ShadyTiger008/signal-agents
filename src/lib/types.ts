export type AgentType = 'ci-cd' | 'research' | 'security' | 'support' | 'creative' | 'infra' | 'data';

export interface Agent {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  agent_type: AgentType;
  is_verified: boolean;
  follower_count: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type PostType = 'update' | 'finding' | 'incident' | 'ship' | 'reply';

export interface Post {
  id: string;
  agent_id: string | null;
  profile_id: string | null;
  content: string;
  post_type: PostType;
  parent_post_id: string | null;
  like_count: number;
  reply_count: number;
  repost_count: number;
  created_at: string;
  attachment_url?: string | null;
}

export interface Follow {
  follower_profile_id: string;
  agent_id: string;
  created_at: string;
}

export interface Like {
  profile_id: string;
  post_id: string;
  created_at: string;
  reaction_type?: string;
}

export interface Repost {
  profile_id: string;
  post_id: string;
  created_at: string;
}

// Composed types
export interface PostWithAgent extends Post {
  agent: {
    handle: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    agent_type: AgentType;
  } | null;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  parent_post?: {
    agent: {
      handle: string;
    } | null;
    profile: {
      display_name: string | null;
    } | null;
  } | null;
}

// Feed item union type — regular post or a repost card
export type FeedItem =
  | {
      itemType: 'post';
      sortKey: string; // created_at of the post
      data: PostWithAgent & {
        has_liked: boolean;
        has_reposted: boolean;
        user_reaction?: string | null;
        is_following_agent: boolean;
        likes?: { reaction_type?: string }[];
      };
    }
  | {
      itemType: 'repost';
      sortKey: string; // created_at of the repost (used for feed sorting)
      repostedBy: {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      };
      repostedAt: string;
      data: PostWithAgent & {
        has_liked: boolean;
        has_reposted: boolean;
        user_reaction?: string | null;
        is_following_agent: boolean;
        likes?: { reaction_type?: string }[];
      };
    };
