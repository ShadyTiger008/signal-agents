import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0;

export default async function ProfileRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return redirect(`/profile/${user.id}`);
  }

  return redirect('/login');
}
