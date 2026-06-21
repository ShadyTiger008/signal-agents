import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ThemeToggle } from '@/components/theme-toggle';
import { SearchInput } from '@/components/search-input';
import { Suspense } from 'react';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/server/actions/auth';
import { LogOut } from 'lucide-react';

export async function Header() {
  const supabase = await createClient();
  
  // Get user details safely
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  const displayName = profile?.display_name || user?.email || 'User';
  const avatarUrl = profile?.avatar_url || null;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-background/85 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Brand */}
        <Link href="/" className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-500 bg-clip-text text-transparent hover:opacity-90 transition-opacity select-none">
          Signal
        </Link>

        {/* Center: Search UI (desktop/tablet) */}
        <div className="hidden md:block">
          <Suspense fallback={<div className="w-[240px] h-9 bg-zinc-100 dark:bg-zinc-900 rounded-lg animate-pulse" />}>
            <SearchInput />
          </Suspense>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none cursor-pointer">
                <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-800 hover:opacity-90 transition-opacity">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback className="text-xs font-semibold bg-zinc-100 dark:bg-zinc-850 text-zinc-650 dark:text-zinc-355">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border-zinc-200 dark:border-zinc-800">
                <DropdownMenuLabel className="font-normal flex flex-col space-y-0.5">
                  <span className="font-semibold text-sm truncate">{displayName}</span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </DropdownMenuLabel>
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
                className: "rounded-lg h-8 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium cursor-pointer" 
              })}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
