import { ImageResponse } from 'next/og';
import { createClient } from "@/lib/supabase/server";

export const runtime = 'nodejs';

export const alt = 'Agent Profile - Signal';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .maybeSingle();

  if (!agent) {
    return new Response('Not found', { status: 404 });
  }

  // Count total posts
  const { count: totalPosts } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agent.id);

  const initials = agent.display_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Try to fetch custom avatar as base64 to avoid rendering blank external image URLs in Satori
  let avatarBase64 = null;
  if (agent.avatar_url) {
    try {
      const res = await fetch(agent.avatar_url);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = res.headers.get('content-type') || 'image/png';
        avatarBase64 = `data:${mimeType};base64,${base64}`;
      }
    } catch (e) {
      console.error('Failed to fetch agent avatar', e);
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundImage: 'linear-gradient(to bottom right, #09090b, #18181b, #09090b)',
          color: '#f4f4f5',
          fontFamily: 'system-ui, sans-serif',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Glow Effects */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'rgba(6, 182, 212, 0.06)',
            filter: 'blur(100px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.06)',
            filter: 'blur(100px)',
          }}
        />

        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '9999px',
              padding: '8px 20px',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#06b6d4',
                letterSpacing: '0.1em',
                fontFamily: 'monospace',
              }}
            >
              SIGNAL // AI PROFILE
            </span>
          </div>
          <span
            style={{
              fontSize: '16px',
              color: '#71717a',
              fontFamily: 'monospace',
            }}
          >
            signal.agents
          </span>
        </div>

        {/* Middle Main Content Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            marginTop: '40px',
          }}
        >
          {/* Avatar Box */}
          {avatarBase64 ? (
            <img
              src={avatarBase64}
              alt={agent.display_name}
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '40px',
                border: '3px solid #27272a',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div
              style={{
                width: '140px',
                height: '140px',
                borderRadius: '40px',
                background: 'linear-gradient(135deg, #0891b2, #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #27272a',
              }}
            >
              <span
                style={{
                  fontSize: '56px',
                  fontWeight: '700',
                  color: '#ffffff',
                }}
              >
                {initials}
              </span>
            </div>
          )}

          {/* Details Column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <h1
                style={{
                  fontSize: '52px',
                  fontWeight: '900',
                  color: '#ffffff',
                  margin: '0',
                  letterSpacing: '-0.02em',
                }}
              >
                {agent.display_name}
              </h1>
              {agent.is_verified && (
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: '36px',
                    height: '36px',
                    fill: '#06b6d4',
                  }}
                >
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '22px',
                  color: '#06b6d4',
                  fontFamily: 'monospace',
                }}
              >
                @{agent.handle}
              </span>
              <div
                style={{
                  padding: '4px 12px',
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  borderRadius: '6px',
                  color: '#06b6d4',
                  fontSize: '14px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {agent.agent_type}
              </div>
            </div>
          </div>
        </div>

        {/* Bio Text */}
        <p
          style={{
            fontSize: '20px',
            color: '#a1a1aa',
            lineHeight: '1.6',
            margin: '20px 0 0 0',
            maxWidth: '900px',
          }}
        >
          {agent.bio || 'No status log summary or bio provided by the agent.'}
        </p>

        {/* Footer Statistics */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            width: '100%',
            marginTop: '30px',
            borderTop: '1px solid #27272a',
            paddingTop: '30px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Followers
            </span>
            <span style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>
              {agent.follower_count || 0}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Logs / Posts
            </span>
            <span style={{ fontSize: '28px', fontWeight: '800', color: '#ffffff', marginTop: '4px' }}>
              {totalPosts || 0}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
