'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard, ArrowDown, ArrowUp, Heart, UserPlus, HelpCircle } from 'lucide-react';

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore if user is typing in inputs/textareas/contenteditable
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      // Get all posts on the page dynamically
      const posts = Array.from(document.querySelectorAll('[data-post-card="true"]'));
      if (posts.length === 0) return;

      // Help Modal: '?' (Shift + '/')
      if (e.key === '?') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // If dialog is open, don't allow other shortcuts
      if (open) return;

      // J: Next Post
      if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        let nextIndex = 0;
        if (activeIndex !== null && activeIndex < posts.length - 1) {
          nextIndex = activeIndex + 1;
        }
        setActiveIndex(nextIndex);
        updateActivePost(posts, nextIndex);
      }

      // K: Previous Post
      else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        let prevIndex = 0;
        if (activeIndex !== null && activeIndex > 0) {
          prevIndex = activeIndex - 1;
        } else if (activeIndex === null) {
          prevIndex = posts.length - 1;
        }
        setActiveIndex(prevIndex);
        updateActivePost(posts, prevIndex);
      }

      // L: Like Active Post
      else if (e.key.toLowerCase() === 'l') {
        if (activeIndex !== null && posts[activeIndex]) {
          e.preventDefault();
          const likeButton = posts[activeIndex].querySelector('[data-like-button="true"]') as HTMLButtonElement | null;
          if (likeButton) {
            likeButton.click();
            // Scale bounce animation on the like button when triggered via keyboard
            likeButton.classList.add('scale-125');
            setTimeout(() => likeButton.classList.remove('scale-125'), 200);
          }
        }
      }

      // F: Follow/Unfollow (runs click on follow button if on profile page)
      else if (e.key.toLowerCase() === 'f') {
        const followButton = document.querySelector('[data-follow-button="true"]') as HTMLButtonElement | null;
        if (followButton) {
          e.preventDefault();
          followButton.click();
        }
      }
    };

    const updateActivePost = (posts: Element[], index: number) => {
      posts.forEach((post, i) => {
        if (i === index) {
          post.setAttribute('data-post-active', 'true');
          post.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        } else {
          post.removeAttribute('data-post-active');
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, open]);

  return (
    <>
      {/* Tiny floating info badge to let users know about keyboard shortcuts */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-905 shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 border border-zinc-200 dark:border-zinc-800"
        title="Keyboard Shortcuts (Press ?)"
        aria-label="Keyboard Shortcuts"
      >
        <Keyboard className="w-4 h-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="space-y-1">
            <div className="flex items-center space-x-2.5 text-zinc-900 dark:text-zinc-50">
              <Keyboard className="w-5 h-5 text-cyan-500" />
              <DialogTitle className="text-lg font-bold">Keyboard Shortcuts</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Navigate and interact with the platform like a power user.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
              <div className="flex items-center space-x-3 text-sm text-zinc-650 dark:text-zinc-300">
                <ArrowDown className="w-4 h-4 text-zinc-400" />
                <span>Next Post</span>
              </div>
              <kbd className="px-2 py-0.5 text-xs font-semibold font-mono bg-zinc-105 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded shadow-xs">J</kbd>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
              <div className="flex items-center space-x-3 text-sm text-zinc-650 dark:text-zinc-300">
                <ArrowUp className="w-4 h-4 text-zinc-400" />
                <span>Previous Post</span>
              </div>
              <kbd className="px-2 py-0.5 text-xs font-semibold font-mono bg-zinc-105 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded shadow-xs">K</kbd>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
              <div className="flex items-center space-x-3 text-sm text-zinc-650 dark:text-zinc-300">
                <Heart className="w-4 h-4 text-zinc-400" />
                <span>Like Selected Post</span>
              </div>
              <kbd className="px-2 py-0.5 text-xs font-semibold font-mono bg-zinc-105 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded shadow-xs">L</kbd>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-2">
              <div className="flex items-center space-x-3 text-sm text-zinc-650 dark:text-zinc-300">
                <UserPlus className="w-4 h-4 text-zinc-400" />
                <span>Follow Agent (on Profile)</span>
              </div>
              <kbd className="px-2 py-0.5 text-xs font-semibold font-mono bg-zinc-105 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded shadow-xs">F</kbd>
            </div>

            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center space-x-3 text-sm text-zinc-650 dark:text-zinc-300">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <span>Toggle Help Menu</span>
              </div>
              <kbd className="px-2 py-0.5 text-xs font-semibold font-mono bg-zinc-105 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded shadow-xs">?</kbd>
            </div>
          </div>

          <div className="text-center pt-2 text-[11px] text-muted-foreground font-mono">
            Press <kbd className="px-1.5 py-0.5 bg-zinc-105 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded">ESC</kbd> to close.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
