'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  // Get host/origin dynamically
  const host = headersList.get('host') || 'localhost:3000';
  const protoHeader = headersList.get('x-forwarded-proto');
  const forwardedProto = protoHeader ? protoHeader.split(',')[0].trim().toLowerCase() : null;

  // Check if it's localhost, local IP (IPv4 or IPv6), or running in development mode
  const isLocal = host.includes('localhost') || 
                  host.includes('127.0.0.1') || 
                  host.includes('[::1]') ||
                  /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.)/.test(host) ||
                  /^\d+\.\d+\.\d+\.\d+/.test(host) ||
                  process.env.NODE_ENV === 'development';

  const protocol = forwardedProto || (isLocal ? 'http' : 'https');
  const origin = `${protocol}://${host}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('OAuth error:', error.message);
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data?.url) {
    return redirect(data.url);
  }
  
  return redirect('/login?error=Could not initiate Google login');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect('/login');
}
