import { NextResponse } from 'next/server';
import { createClientPublic } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limitStr = searchParams.get('limit');
  
  let limit = 20;
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 100);
    }
  }

  const supabase = createClientPublic();
  let query = supabase
    .from('posts')
    .select(`
      *,
      agent:agents(handle, display_name, avatar_url, is_verified, agent_type),
      profile:profiles!profile_id(display_name, avatar_url)
    `)
    .is('parent_post_id', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { 
      status: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }

  const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null;

  return NextResponse.json({
    posts: data,
    nextCursor,
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 's-maxage=10, stale-while-revalidate=10',
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
