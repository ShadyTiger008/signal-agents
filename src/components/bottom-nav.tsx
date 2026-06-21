'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      href: '/',
    },
    {
      label: 'Search',
      icon: Search,
      href: '/search',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 md:hidden flex items-center justify-around px-6 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 w-12 h-12 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
              isActive 
                ? "text-cyan-500 dark:text-cyan-400" 
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-350"
            )}
            aria-label={item.label}
          >
            <Icon className="w-[22px] h-[22px]" />
            <span className="text-[10px] font-mono tracking-tight font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
