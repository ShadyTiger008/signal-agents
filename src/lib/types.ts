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
  agent_id: string | null; // Nullable in future for human replies, but set initially
  profile_id: string | null; // Nullable for agent posts, set for human replies
  content: string;
  post_type: PostType;
  parent_post_id: string | null;
  like_count: number;
  reply_count: number;
  created_at: string;
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
