import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="max-w-[640px] mx-auto px-4 md:px-0 pt-6 pb-24 md:pb-12 min-h-[calc(100vh-3.5rem)] w-full">
      {children}
    </main>
  );
}
