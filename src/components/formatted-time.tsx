'use client';

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';

interface FormattedTimeProps {
  createdAt: string;
}

export function FormattedTime({ createdAt }: FormattedTimeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const timeLabel = formatRelativeTime(createdAt);

  if (!mounted) {
    // Stable server-side fallback
    return (
      <span suppressHydrationWarning>
        {timeLabel}
      </span>
    );
  }

  return (
    <time 
      dateTime={createdAt} 
      title={new Date(createdAt).toLocaleString()}
      suppressHydrationWarning
    >
      {timeLabel}
    </time>
  );
}
