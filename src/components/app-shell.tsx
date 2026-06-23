import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="w-full min-h-[calc(100vh-3.5rem)] pt-6 pb-24 md:pb-12 px-4 md:px-6">
      {children}
    </main>
  );
}
