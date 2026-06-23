'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Heart, User, Pin, Menu, LogOut, Sun, Moon, LogIn, ChevronRight, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/server/actions/auth';
import { cn } from '@/lib/utils';
import { ComposeModal } from '@/components/compose-modal';
import { ReportProblemModal } from '@/components/report-problem-modal';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ThreadsLogo = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current text-zinc-950 dark:text-zinc-50">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8v1.43c0 .79-.64 1.43-1.43 1.43-.8 0-1.43-.64-1.43-1.43V12c0-2.76-2.24-5-5-5-5 0-5 2.24-5 5 2.24 5 5 5 1.38 0 2.63-.56 3.54-1.46.65.86 1.68 1.46 2.85 1.46 2.01 0 3.64-1.63 3.64-3.64V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
  </svg>
);

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

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

  const handlePinClick = () => {
    toast.info('Layout pinned!');
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
      <aside className="fixed left-0 top-0 bottom-0 z-40 w-20 hidden md:flex flex-col items-center justify-between py-6 border-r border-zinc-200 dark:border-zinc-800 bg-background/90 backdrop-blur-md">
        {/* Top: Logo */}
        <Link href="/" className="transition-transform duration-200 hover:scale-105 active:scale-95">
          <ThreadsLogo />
        </Link>

        {/* Center Nav: Home, Search, Compose, Heart, Profile */}
        <nav className="flex flex-col items-center gap-7 flex-1 justify-center w-full">
          {/* Home */}
          <Link
            href="/"
            className={cn(
              "p-3 rounded-xl transition-all duration-200 active:scale-95 group relative",
              pathname === '/' 
                ? "text-zinc-950 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-900" 
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            )}
            aria-label="Home"
          >
            <Home className="w-6 h-6 stroke-[2.2]" />
            <span className="absolute left-16 bg-zinc-900 text-zinc-50 text-[11px] font-medium font-sans px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md select-none pointer-events-none z-50">
              Home
            </span>
          </Link>

          {/* Search */}
          <Link
            href="/search"
            className={cn(
              "p-3 rounded-xl transition-all duration-200 active:scale-95 group relative",
              pathname === '/search' 
                ? "text-zinc-950 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-900" 
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            )}
            aria-label="Search"
          >
            <Search className="w-6 h-6 stroke-[2.2]" />
            <span className="absolute left-16 bg-zinc-900 text-zinc-50 text-[11px] font-medium font-sans px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md select-none pointer-events-none z-50">
              Search
            </span>
          </Link>

          {/* Compose / Write */}
          <button
            onClick={handleComposeClick}
            className="p-3 rounded-xl text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all duration-200 active:scale-95 group relative cursor-pointer"
            aria-label="Write post"
          >
            <div className="border-[2px] border-zinc-400 group-hover:border-zinc-600 dark:border-zinc-500 dark:group-hover:border-zinc-300 rounded-lg p-0.5 transition-colors">
              <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="absolute left-16 bg-zinc-900 text-zinc-50 text-[11px] font-medium font-sans px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md select-none pointer-events-none z-50">
              New Thread
            </span>
          </button>

          {/* Heart / Activity */}
          <Link
            href="/activity"
            className={cn(
              "p-3 rounded-xl transition-all duration-200 active:scale-95 group relative",
              pathname === '/activity' 
                ? "text-zinc-950 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-900" 
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            )}
            aria-label="Activity"
          >
            <Heart className="w-6 h-6 stroke-[2.2]" />
            <span className="absolute left-16 bg-zinc-900 text-zinc-50 text-[11px] font-medium font-sans px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md select-none pointer-events-none z-50">
              Activity
            </span>
          </Link>

          {/* Profile */}
          <Link
            href={user ? `/profile/${user.id}` : '/login'}
            onClick={handleProfileClick}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 active:scale-95 group relative",
              pathname.startsWith('/profile') 
                ? "text-zinc-950 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-900" 
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            )}
            aria-label="Profile"
          >
            <User className="w-6 h-6 stroke-[2.2]" />
            <span className="absolute left-16 bg-zinc-900 text-zinc-50 text-[11px] font-medium font-sans px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md select-none pointer-events-none z-50">
              Profile
            </span>
          </Link>
        </nav>

        {/* Bottom items: Pin, Settings Menu */}
        <div className="flex flex-col items-center gap-5 w-full">
          {/* Pin */}
          <button
            onClick={handlePinClick}
            className="p-3 rounded-xl text-zinc-400 hover:text-zinc-500 dark:text-zinc-500 dark:hover:text-zinc-400 transition-all duration-200 active:scale-95 group relative cursor-pointer"
            aria-label="Pin"
          >
            <Pin className="w-5 h-5 stroke-[2.2] rotate-45" />
            <span className="absolute left-16 bg-zinc-900 text-zinc-50 text-[11px] font-medium font-sans px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md select-none pointer-events-none z-50">
              Pin Layout
            </span>
          </button>

          {/* Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="p-3 rounded-xl text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all duration-200 active:scale-95 cursor-pointer outline-none">
              <Menu className="w-6 h-6 stroke-[2.2]" />
            </DropdownMenuTrigger>
             <DropdownMenuContent align="end" side="right" className="w-52 rounded-xl border border-zinc-200 dark:border-zinc-800 p-1.5 shadow-lg bg-popover text-popover-foreground">
               {/* Theme Toggle option */}
               <DropdownMenuItem
                 onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                 className="flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-900"
               >
                 <div className="flex items-center gap-2">
                   {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                   <span>Appearance</span>
                 </div>
                 <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
               </DropdownMenuItem>

               {/* Report a problem */}
               <DropdownMenuItem
                 onClick={() => setReportOpen(true)}
                 className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-900"
               >
                 <AlertCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                 <span>Report a problem</span>
               </DropdownMenuItem>

               <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-850" />

               {/* Login / Logout option */}
               {user ? (
                 <DropdownMenuItem
                   className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-destructive focus:text-destructive rounded-lg cursor-pointer focus:bg-destructive/10"
                 >
                   <form action={signOut} className="w-full flex items-center">
                     <button type="submit" className="w-full flex items-center text-left text-sm font-semibold cursor-pointer text-destructive focus:text-destructive">
                       <LogOut className="w-4 h-4 mr-2" />
                       Sign Out
                     </button>
                   </form>
                 </DropdownMenuItem>
               ) : (
                 <DropdownMenuItem
                   onClick={() => router.push('/login')}
                   className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-900"
                 >
                   <LogIn className="w-4 h-4" />
                   <span>Sign In</span>
                 </DropdownMenuItem>
               )}
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
       </aside>
 
       <ComposeModal open={composeOpen} onOpenChange={setComposeOpen} />
       <ReportProblemModal open={reportOpen} onOpenChange={setReportOpen} />
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
