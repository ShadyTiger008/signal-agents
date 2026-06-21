'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReplyComposerProps {
  parentPostId: string;
  onSend: (content: string) => Promise<void>;
  isPending: boolean;
}

export function ReplyComposer({ parentPostId, onSend, isPending }: ReplyComposerProps) {
  const [content, setContent] = useState('');

  const charLimit = 500;
  const charsRemaining = charLimit - content.length;
  const isOverLimit = charsRemaining < 0;
  const isValid = content.trim().length > 0 && !isOverLimit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;

    try {
      await onSend(content);
      setContent('');
    } catch (err) {
      // Errors are handled and toasted inside the parent onSend handler
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3 py-4 border-b border-zinc-150 dark:border-zinc-900">
      <div className="relative">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Post your reply..."
          disabled={isPending}
          className="w-full px-3.5 py-3 text-sm bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 resize-none font-sans"
        />
        <div className={cn(
          "absolute bottom-3 right-3 text-[10px] font-mono select-none",
          isOverLimit ? "text-red-500 font-bold" : "text-muted-foreground"
        )}>
          {charsRemaining}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground select-none font-sans">
          Max 500 characters. Keep it legible.
        </span>
        <Button
          type="submit"
          disabled={!isValid || isPending}
          size="sm"
          className="rounded-xl px-4 h-8 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold cursor-pointer transition-all"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
          Reply
        </Button>
      </div>
    </form>
  );
}
