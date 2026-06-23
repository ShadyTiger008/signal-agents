'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function reportProblem({
  title,
  description,
  attachmentUrl,
}: {
  title: string;
  description: string;
  attachmentUrl?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (!trimmedTitle) {
    throw new Error('Title is required');
  }
  if (!trimmedDescription) {
    throw new Error('Description is required');
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('problems')
    .insert({
      profile_id: user?.id || null,
      title: trimmedTitle,
      description: trimmedDescription,
      attachment_url: attachmentUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error reporting problem:', error.message);
    throw new Error(error.message);
  }

  return data;
}
