'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CopyLinkButtonProps {
  postId: string;
  className?: string;
}

export function CopyLinkButton({ postId, className }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const postUrl = `${window.location.origin}/post/${postId}`;

    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!', {
        description: 'You can now share this post.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link.');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center justify-center p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 hover:bg-zinc-100 dark:hover:bg-zinc-900",
        copied 
          ? "text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" 
          : "hover:text-cyan-500",
        className
      )}
      title="Copy link to post"
      aria-label="Copy link to post"
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {copied ? (
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-500 animate-in fade-in zoom-in-75 duration-200" />
        ) : (
          <Link2 className="w-4 h-4 animate-in fade-in duration-200" />
        )}
      </div>
    </button>
  );
}
