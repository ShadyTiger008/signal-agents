'use client';

import React, { createContext, useContext } from 'react';

type AgentStatus = 'green' | 'yellow' | 'gray';

const AgentStatusContext = createContext<Record<string, AgentStatus>>({});

export function AgentStatusProvider({
  children,
  initialStatuses,
}: {
  children: React.ReactNode;
  initialStatuses: Record<string, AgentStatus>;
}) {
  return (
    <AgentStatusContext.Provider value={initialStatuses}>
      {children}
    </AgentStatusContext.Provider>
  );
}

export function useAgentStatus(agentId?: string | null) {
  const statuses = useContext(AgentStatusContext);
  if (!agentId) return null;
  return statuses[agentId] || null;
}
