'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Share2,
  Link2,
  Check,
  ExternalLink,
  X,
  Smartphone,
  Quote,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createPost } from '@/server/actions/posts';
import { useRouter } from 'next/navigation';
import { AgentAvatar } from '@/components/agent-avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ShareButtonProps {
  postId: string;
  postContent?: string;
  postAuthor?: string;
  postAuthorHandle?: string;
  postAuthorAvatar?: string | null;
  postAuthorIsAgent?: boolean;
  postAgentId?: string | null;
  isAuthenticated: boolean;
}

// ── Quote Compose Modal ──────────────────────────────────────
function QuoteComposeModal({
  postId,
  postContent,
  postAuthor,
  postAuthorHandle,
  postAuthorAvatar,
  postAuthorIsAgent,
  postAgentId,
  onClose,
}: {
  postId: string;
  postContent: string;
  postAuthor: string;
  postAuthorHandle?: string;
  postAuthorAvatar?: string | null;
  postAuthorIsAgent?: boolean;
  postAgentId?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [isPending, setIsPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX = 500;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    setComment(el.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    if (isPending) return;

    setIsPending(true);
    const postUrl = `${window.location.origin}/post/${postId}`;
    const fullContent = `${comment.trim()}\n\n↳ ${postUrl}`;

    try {
      await createPost(fullContent);
      toast.success('Quote posted!', { description: 'Your commentary has been shared.' });
      onClose();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to post quote');
    } finally {
      setIsPending(false);
    }
  };

  const remaining = MAX - comment.length;
  const isNearLimit = remaining <= 80;
  const isOverLimit = remaining < 0;
  const initials = postAuthor
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal */}
      <div className="relative w-full sm:max-w-[560px] bg-white dark:bg-zinc-950 rounded-t-3xl sm:rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100 dark:border-zinc-900">
          <h2 className="text-sm font-bold tracking-tight">Quote Repost</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Compose area */}
          <div className="px-5 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={handleInput}
              placeholder="Add your commentary..."
              maxLength={MAX}
              rows={3}
              className="w-full text-sm resize-none bg-transparent outline-none placeholder:text-muted-foreground text-zinc-900 dark:text-zinc-100 leading-relaxed min-h-[80px] max-h-[200px]"
            />
          </div>

          {/* Quoted post preview */}
          <div className="mx-5 mb-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30">
            {/* Quoted post header */}
            <div className="flex items-center gap-2 px-3.5 pt-3 pb-1.5">
              {postAuthorIsAgent && postAgentId ? (
                <AgentAvatar
                  agentId={postAgentId}
                  displayName={postAuthor}
                  avatarUrl={postAuthorAvatar ?? null}
                  size="xs"
                />
              ) : (
                <Avatar className="h-5 w-5 border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                  {postAuthorAvatar && <AvatarImage src={postAuthorAvatar} alt={postAuthor} />}
                  <AvatarFallback className="text-[8px] font-bold bg-zinc-100 dark:bg-zinc-800">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="text-xs font-bold truncate">{postAuthor}</span>
              {postAuthorHandle && (
                <span className="text-xs font-mono text-muted-foreground truncate">
                  @{postAuthorHandle}
                </span>
              )}
            </div>
            {/* Quoted content */}
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed px-3.5 pb-3 line-clamp-3">
              {postContent}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 pb-5 border-t border-zinc-100 dark:border-zinc-900 pt-3">
            {/* Character counter */}
            <div className="flex items-center gap-2">
              {isNearLimit && (
                <span
                  className={cn(
                    'text-xs font-mono tabular-nums',
                    isOverLimit ? 'text-red-500' : 'text-amber-500'
                  )}
                >
                  {remaining}
                </span>
              )}
              {/* Progress ring */}
              <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                <circle
                  cx="10" cy="10" r="8"
                  fill="none"
                  strokeWidth="2"
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                />
                <circle
                  cx="10" cy="10" r="8"
                  fill="none"
                  strokeWidth="2"
                  strokeDasharray={`${2 * Math.PI * 8}`}
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - Math.min(1, comment.length / MAX))}`}
                  strokeLinecap="round"
                  className={cn(
                    'transition-all duration-150',
                    isOverLimit
                      ? 'stroke-red-500'
                      : isNearLimit
                      ? 'stroke-amber-500'
                      : 'stroke-cyan-500'
                  )}
                />
              </svg>
            </div>

            <button
              type="submit"
              disabled={!comment.trim() || isOverLimit || isPending}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200',
                comment.trim() && !isOverLimit && !isPending
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 hover:opacity-90 active:scale-95'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
              )}
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Share Sheet ──────────────────────────────────────────────
function ShareSheet({
  postId,
  postContent,
  postAuthor,
  postAuthorHandle,
  postAuthorAvatar,
  postAuthorIsAgent,
  postAgentId,
  isAuthenticated,
  onClose,
  anchorRef,
}: {
  postId: string;
  postContent: string;
  postAuthor: string;
  postAuthorHandle?: string;
  postAuthorAvatar?: string | null;
  postAuthorIsAgent?: boolean;
  postAgentId?: string | null;
  isAuthenticated: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [copied, setCopied] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const router = useRouter();

  const postUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/post/${postId}`
    : `/post/${postId}`;

  const canWebShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleWebShare = async () => {
    try {
      await navigator.share({
        title: `${postAuthor} on Signal`,
        text: postContent.substring(0, 140),
        url: postUrl,
      });
      onClose();
    } catch {
      // User cancelled — no toast needed
    }
  };

  const handleOpenTab = () => {
    window.open(postUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleQuote = () => {
    if (!isAuthenticated) {
      toast('Sign in to quote', {
        action: { label: 'Sign in', onClick: () => router.push('/login') },
      });
      onClose();
      return;
    }
    setShowQuoteModal(true);
  };

  const options = [
    {
      icon: copied ? Check : Link2,
      label: copied ? 'Copied!' : 'Copy Link',
      desc: 'Copy post URL to clipboard',
      onClick: handleCopy,
      active: copied,
      color: 'emerald' as const,
    },
    ...(canWebShare
      ? [{
          icon: Smartphone,
          label: 'Share via…',
          desc: 'Open system share sheet',
          onClick: handleWebShare,
          active: false,
          color: 'cyan' as const,
        }]
      : []),
    {
      icon: ExternalLink,
      label: 'Open in new tab',
      desc: 'View full post thread',
      onClick: handleOpenTab,
      active: false,
      color: 'violet' as const,
    },
    {
      icon: Quote,
      label: 'Quote Repost',
      desc: 'Add your own commentary',
      onClick: handleQuote,
      active: false,
      color: 'amber' as const,
    },
  ];

  const colorMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30',
    violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
  };

  return (
    <>
      <div
        className="absolute bottom-full right-0 mb-2 z-50 w-[230px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Sheet header */}
        <div className="px-3.5 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
          <p className="text-[10px] font-bold font-mono tracking-widest uppercase text-muted-foreground select-none">
            Share Post
          </p>
        </div>

        {/* Options */}
        <div className="py-1.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.label}
                onClick={opt.onClick}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors text-left group"
              >
                <div className={cn('p-1.5 rounded-lg flex-shrink-0 transition-colors', colorMap[opt.color])}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono truncate">
                    {opt.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quote Compose Modal */}
      {showQuoteModal && (
        <QuoteComposeModal
          postId={postId}
          postContent={postContent}
          postAuthor={postAuthor}
          postAuthorHandle={postAuthorHandle}
          postAuthorAvatar={postAuthorAvatar}
          postAuthorIsAgent={postAuthorIsAgent}
          postAgentId={postAgentId}
          onClose={() => {
            setShowQuoteModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

// ── ShareButton ──────────────────────────────────────────────
export function ShareButton({
  postId,
  postContent = '',
  postAuthor = 'Signal',
  postAuthorHandle,
  postAuthorAvatar,
  postAuthorIsAgent,
  postAgentId,
  isAuthenticated,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative flex items-center select-none">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(v => !v);
        }}
        className={cn(
          'flex items-center justify-center p-1.5 rounded-full border transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-cyan-500',
          isOpen
            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-cyan-500'
            : 'bg-zinc-50/50 border-zinc-200/60 dark:bg-zinc-900/40 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 hover:text-cyan-500'
        )}
        aria-label="Share post"
        title="Share"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <ShareSheet
          postId={postId}
          postContent={postContent}
          postAuthor={postAuthor}
          postAuthorHandle={postAuthorHandle}
          postAuthorAvatar={postAuthorAvatar}
          postAuthorIsAgent={postAuthorIsAgent}
          postAgentId={postAgentId}
          isAuthenticated={isAuthenticated}
          onClose={() => setIsOpen(false)}
          anchorRef={buttonRef}
        />
      )}
    </div>
  );
}
