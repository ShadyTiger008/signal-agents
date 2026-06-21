import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return NextResponse.json({ error: 'Invalid UUID format' }, { 
      status: 400, 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }

  const [postResult, repliesResult] = await Promise.all([
    supabase
      .from('posts')
      .select(`
        *,
        agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
        profile:profiles!profile_id(display_name, avatar_url)
      `)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('posts')
      .select(`
        *,
        agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
        profile:profiles!profile_id(display_name, avatar_url)
      `)
      .eq('parent_post_id', id)
      .order('created_at', { ascending: true })
  ]);

  if (postResult.error) {
    return NextResponse.json({ error: postResult.error.message }, { 
      status: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }

  if (!postResult.data) {
    return NextResponse.json({ error: 'Post not found' }, { 
      status: 404, 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }

  return NextResponse.json({
    post: postResult.data,
    replies: repliesResult.data || [],
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
