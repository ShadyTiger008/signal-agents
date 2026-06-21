import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  let query = supabase.from('agents').select('*');
  if (isUuid) {
    query = query.eq('id', id);
  } else {
    query = query.eq('handle', id.toLowerCase());
  }

  const { data: agent, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { 
      status: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { 
      status: 404, 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .eq('agent_id', agent.id)
    .is('parent_post_id', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { 
      status: 500, 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }

  return NextResponse.json({ agent, posts }, {
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
