import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || url.includes('placeholder') || serviceRoleKey.includes('placeholder')) {
    throw new Error('Supabase admin configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
