'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/server/actions/auth';
import { LogOut, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ThreadsLogo = () => (
  <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-current text-zinc-950 dark:text-zinc-50">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8v1.43c0 .79-.64 1.43-1.43 1.43-.8 0-1.43-.64-1.43-1.43V12c0-2.76-2.24-5-5-5-5 0-5 2.24-5 5 2.24 5 5 5c1.38 0 2.63-.56 3.54-1.46.65.86 1.68 1.46 2.85 1.46 2.01 0 3.64-1.63 3.64-3.64V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
  </svg>
);

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchUserData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();
        setProfile(data);
      } else {
        setProfile(null);
      }
    };

    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getPageTitle = () => {
    if (pathname === '/') return 'Home';
    if (pathname.startsWith('/search')) return 'Search';
    if (pathname.startsWith('/profile')) return 'Profile';
    if (pathname.startsWith('/agent')) return 'Agent Profile';
    if (pathname.startsWith('/post')) return 'Thread';
    return 'Signal';
  };

  // Determine back button presence (e.g. details page)
  const showBackButton = pathname !== '/' && pathname !== '/search';

  const displayName = profile?.display_name || user?.email || 'User';
  const avatarUrl = profile?.avatar_url || null;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 dark:border-zinc-800 bg-background/85 backdrop-blur-md">
      <div className="max-w-[640px] lg:max-w-[1000px] xl:max-w-[1100px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between relative">
        {/* Left: Back button or placeholder */}
        <div className="w-20 flex justify-start">
          {showBackButton && (
            <button 
              onClick={() => router.back()}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors flex items-center gap-1 cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}
        </div>

        {/* Center: Brand/Title */}
        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none select-none">
          {/* Mobile view showing Threads logo */}
          <div className="md:hidden pointer-events-auto">
            <Link href="/" aria-label="Signal Home">
              <ThreadsLogo />
            </Link>
          </div>

          {/* Desktop/Tablet view showing dynamic page title */}
          <div className="hidden md:block font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-50 pointer-events-auto">
            {getPageTitle()}
          </div>
        </div>

        {/* Right: Actions (Theme, Session) */}
        <div className="w-20 flex justify-end items-center space-x-2.5 z-10">
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none cursor-pointer">
                <Avatar className="h-7.5 w-7.5 border border-zinc-200 dark:border-zinc-800 hover:opacity-90 transition-opacity">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-350">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border-zinc-200 dark:border-zinc-800 bg-popover text-popover-foreground">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal flex flex-col space-y-0.5 select-none">
                    <span className="font-semibold text-sm truncate">{displayName}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-850" />
                <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-destructive/10 focus:text-destructive">
                  <form action={signOut} className="w-full flex items-center">
                    <button type="submit" className="w-full flex items-center text-left text-sm font-medium cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link 
              href="/login" 
              className={buttonVariants({ 
                variant: 'default', 
                size: 'sm', 
                className: "rounded-lg h-7.5 px-3 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-semibold cursor-pointer" 
              })}
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
