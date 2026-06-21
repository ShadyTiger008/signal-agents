'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-lg" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-9 h-9 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-[18px] w-[18px] text-zinc-450 hover:text-zinc-100" />
      ) : (
        <Moon className="h-[18px] w-[18px] text-zinc-550 hover:text-zinc-950" />
      )}
    </Button>
  );
}
