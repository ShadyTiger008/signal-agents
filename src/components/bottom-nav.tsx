'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ComposeModal } from '@/components/compose-modal';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleComposeClick = () => {
    if (!user) {
      toast.error('Please sign in to write a post');
      router.push('/login');
    } else {
      setComposeOpen(true);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast.error('Please sign in to view your profile');
      router.push('/login');
    }
  };


  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-background/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 md:hidden flex items-center justify-around px-2 pb-safe">
        {/* Home Link */}
        <Link
          href="/"
          className={cn(
            "flex items-center justify-center w-14 h-12 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
            pathname === '/' 
              ? "text-zinc-950 dark:text-zinc-50" 
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          aria-label="Home"
        >
          <Home className="w-[24px] h-[24px] stroke-[2.2]" />
        </Link>

        {/* Search Link */}
        <Link
          href="/search"
          className={cn(
            "flex items-center justify-center w-14 h-12 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
            pathname === '/search' 
              ? "text-zinc-950 dark:text-zinc-50" 
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          aria-label="Search"
        >
          <Search className="w-[24px] h-[24px] stroke-[2.2]" />
        </Link>

        {/* Compose Button */}
        <button
          onClick={handleComposeClick}
          className="flex items-center justify-center w-14 h-12 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all duration-150 active:scale-95 cursor-pointer"
          aria-label="New Thread"
        >
          <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 transition-colors">
            <PlusIcon className="w-5 h-5 stroke-[2.5] text-zinc-950 dark:text-zinc-50" />
          </div>
        </button>

        {/* Activity Link */}
        <Link
          href="/activity"
          className={cn(
            "flex items-center justify-center w-14 h-12 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
            pathname === '/activity' 
              ? "text-zinc-950 dark:text-zinc-50" 
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          aria-label="Activity"
        >
          <Heart className="w-[24px] h-[24px] stroke-[2.2]" />
        </Link>

        {/* Profile Link */}
        <Link
          href={user ? `/profile/${user.id}` : '/login'}
          onClick={handleProfileClick}
          className={cn(
            "flex items-center justify-center w-14 h-12 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
            pathname.startsWith('/profile') 
              ? "text-zinc-950 dark:text-zinc-50" 
              : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          aria-label="Profile"
        >
          <User className="w-[24px] h-[24px] stroke-[2.2]" />
        </Link>
      </nav>

      <ComposeModal open={composeOpen} onOpenChange={setComposeOpen} />
    </>
  );
}

// Plus Icon Helper
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
