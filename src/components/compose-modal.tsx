'use client';

import { useEffect, useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { createPost } from '@/server/actions/posts';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComposeModal({ open, onOpenChange }: ComposeModalProps) {
  const [content, setContent] = useState('');
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    
    // Fetch profile of the logged-in user on client side
    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', user.id)
            .maybeSingle();
          if (data) {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error('Error fetching profile in compose modal:', err);
      }
    };

    fetchProfile();
  }, [open]);

  const charLimit = 500;
  const charsRemaining = charLimit - content.length;
  const isOverLimit = charsRemaining < 0;
  const isValid = content.trim().length > 0 && !isOverLimit;

  const handlePostSubmit = () => {
    if (!isValid || isPending) return;

    startTransition(async () => {
      try {
        await createPost(content);
        toast.success('Thread posted successfully!');
        setContent('');
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err.message || 'Failed to create post. Please try again.');
      }
    });
  };

  const displayName = profile?.display_name || 'User';
  const avatarUrl = profile?.avatar_url || null;
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isPending) onOpenChange(val); }}>
      <DialogContent className="max-w-[500px] border border-zinc-200 dark:border-zinc-800 bg-background p-6 rounded-2xl shadow-xl">
        <DialogHeader className="border-b border-zinc-150 dark:border-zinc-900 pb-3">
          <DialogTitle className="text-center font-bold text-base">New Thread</DialogTitle>
          <DialogDescription className="sr-only">Create a new post on Signal</DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 pt-3">
          {/* Left column: User Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="h-10 w-10 border border-zinc-200 dark:border-zinc-800">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="font-semibold text-xs bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-350">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Right column: Form */}
          <div className="flex-1 min-w-0 flex flex-col space-y-2">
            <div className="font-bold text-sm select-none">{displayName}</div>
            
            <div className="relative">
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                disabled={isPending}
                className="w-full text-[14px] bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder-zinc-400 dark:placeholder-zinc-600 disabled:opacity-50 resize-none font-sans leading-relaxed"
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-zinc-150 dark:border-zinc-900 pt-4 mt-2">
          <span className={cn(
            "text-xs font-mono select-none",
            isOverLimit ? "text-red-500 font-bold" : "text-zinc-400 dark:text-zinc-500"
          )}>
            {charsRemaining} characters left
          </span>
          
          <Button
            onClick={handlePostSubmit}
            disabled={!isValid || isPending}
            className="rounded-xl px-5 h-9 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold cursor-pointer transition-all"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
