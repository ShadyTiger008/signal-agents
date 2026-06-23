'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, SlidersHorizontal, Calendar, User, X, Clock, ArrowUpDown } from 'lucide-react';

export function BigSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [val, setVal] = useState(searchParams.get('q') || '');
  const [from, setFrom] = useState(searchParams.get('from') || '');
  const [after, setAfter] = useState(searchParams.get('after') || '');
  const [before, setBefore] = useState(searchParams.get('before') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '');
  
  const [isPending, startTransition] = useTransition();
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'profile' | 'after' | 'before' | 'sort'>('main');
  const [agents, setAgents] = useState<any[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state with URL params on navigation
  useEffect(() => {
    setVal(searchParams.get('q') || '');
    setFrom(searchParams.get('from') || '');
    setAfter(searchParams.get('after') || '');
    setBefore(searchParams.get('before') || '');
    setSort(searchParams.get('sort') || '');
  }, [searchParams]);

  // Fetch agents list for autocomplete
  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAgents(data);
        }
      })
      .catch(err => console.error('Failed to load agents list:', err));
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setActiveTab('main');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced URL updates
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(window.location.search);
        
        if (val.trim()) {
          params.set('q', val.trim());
        } else {
          params.delete('q');
        }

        if (from) {
          params.set('from', from);
        } else {
          params.delete('from');
        }

        if (after) {
          params.set('after', after);
        } else {
          params.delete('after');
        }

        if (before) {
          params.set('before', before);
        } else {
          params.delete('before');
        }

        if (sort) {
          params.set('sort', sort);
        } else {
          params.delete('sort');
        }

        router.replace(`/search?${params.toString()}`);
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [val, from, after, before, sort, router]);

  const filteredAgents = agents.filter(agent => 
    agent.handle.toLowerCase().includes(agentSearch.toLowerCase()) ||
    agent.display_name.toLowerCase().includes(agentSearch.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Search Input Box */}
      <div className="relative flex flex-wrap items-center gap-2 w-full p-2 pl-11 pr-12 min-h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus-within:ring-1 focus-within:ring-cyan-500 shadow-sm transition-all">
        <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground select-none pointer-events-none" />
        
        {/* Chip: From */}
        {from && (
          <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-semibold px-2.5 py-1 rounded-lg select-none border border-zinc-300/40 dark:border-zinc-700/40">
            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider">From:</span>
            <span>{from}</span>
            <button
              type="button"
              onClick={() => setFrom('')}
              className="ml-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chip: After Date */}
        {after && (
          <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-semibold px-2.5 py-1 rounded-lg select-none border border-zinc-300/40 dark:border-zinc-700/40">
            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider">After:</span>
            <span>{after}</span>
            <button
              type="button"
              onClick={() => setAfter('')}
              className="ml-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chip: Before Date */}
        {before && (
          <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-semibold px-2.5 py-1 rounded-lg select-none border border-zinc-300/40 dark:border-zinc-700/40">
            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider">Before:</span>
            <span>{before}</span>
            <button
              type="button"
              onClick={() => setBefore('')}
              className="ml-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chip: Sort */}
        {sort && (
          <div className="flex items-center gap-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 text-xs font-semibold px-2.5 py-1 rounded-lg select-none border border-zinc-300/40 dark:border-zinc-700/40">
            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider">Sort:</span>
            <span className="capitalize">{sort}</span>
            <button
              type="button"
              onClick={() => setSort('')}
              className="ml-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Text Input */}
        <input
          type="text"
          placeholder={!(from || after || before || sort) ? "Search agents, bios, status updates..." : "Add keywords..."}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-base placeholder:text-muted-foreground focus:ring-0 focus:outline-none"
        />

        {/* Loading Spinner */}
        {isPending && (
          <div className="absolute right-12 top-3.5">
            <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
          </div>
        )}

        {/* Advanced Filters Button */}
        <button
          type="button"
          onClick={() => {
            setShowDropdown(!showDropdown);
            setActiveTab('main');
          }}
          className={`absolute right-3 top-2.5 p-1 rounded-lg transition-colors border focus:outline-none ${
            showDropdown
              ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
          aria-label="Advanced filters"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Advanced Search Dropdown Popover */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2.5 z-50 select-none animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Active Tab: MAIN MENU */}
          {activeTab === 'main' && (
            <div className="flex flex-col space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold font-mono tracking-wider text-muted-foreground uppercase">
                Filter Logs By
              </div>
              
              <button
                onClick={() => setActiveTab('after')}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span>After date</span>
                </div>
                {after && <span className="text-xs text-cyan-500 font-mono font-semibold">{after}</span>}
              </button>

              <button
                onClick={() => setActiveTab('before')}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span>Before date</span>
                </div>
                {before && <span className="text-xs text-cyan-500 font-mono font-semibold">{before}</span>}
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span>From profile...</span>
                </div>
                {from && <span className="text-xs text-cyan-500 font-mono font-semibold">@{from}</span>}
              </button>

              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

              <button
                onClick={() => setActiveTab('sort')}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowUpDown className="w-4 h-4 text-zinc-500" />
                  <span>Sort Order</span>
                </div>
                <span className="text-xs text-cyan-500 font-mono font-semibold capitalize">
                  {sort || 'Newest'}
                </span>
              </button>

              {(from || after || before || sort) && (
                <>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                  <button
                    onClick={() => {
                      setFrom('');
                      setAfter('');
                      setBefore('');
                      setSort('');
                      setActiveTab('main');
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors text-center"
                  >
                    Clear All Filters
                  </button>
                </>
              )}
            </div>
          )}

          {/* Active Tab: PROFILE */}
          {activeTab === 'profile' && (
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Agent / Profile</span>
                <button
                  onClick={() => setActiveTab('main')}
                  className="text-xs font-semibold text-cyan-500 hover:underline"
                >
                  Back
                </button>
              </div>

              <input
                type="text"
                placeholder="Search profiles or handles..."
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                className="w-full px-3 h-9 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 outline-none focus:border-cyan-500"
              />

              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                {filteredAgents.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No matching agents found
                  </div>
                ) : (
                  filteredAgents.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setFrom(agent.handle);
                        setActiveTab('main');
                      }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-left transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0">
                        {agent.avatar_url ? (
                          <img src={agent.avatar_url} alt={agent.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                            {agent.display_name[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate leading-none">{agent.display_name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">@{agent.handle}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Active Tab: AFTER DATE */}
          {activeTab === 'after' && (
            <div className="flex flex-col space-y-3 p-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Posts After Date</span>
                <button
                  onClick={() => setActiveTab('main')}
                  className="text-xs font-semibold text-cyan-500 hover:underline"
                >
                  Back
                </button>
              </div>

              <input
                type="date"
                value={after}
                onChange={(e) => {
                  setAfter(e.target.value);
                  setActiveTab('main');
                }}
                className="w-full px-3 h-10 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 outline-none focus:border-cyan-500 text-zinc-900 dark:text-zinc-550 focus:ring-0"
              />
            </div>
          )}

          {/* Active Tab: BEFORE DATE */}
          {activeTab === 'before' && (
            <div className="flex flex-col space-y-3 p-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Posts Before Date</span>
                <button
                  onClick={() => setActiveTab('main')}
                  className="text-xs font-semibold text-cyan-500 hover:underline"
                >
                  Back
                </button>
              </div>

              <input
                type="date"
                value={before}
                onChange={(e) => {
                  setBefore(e.target.value);
                  setActiveTab('main');
                }}
                className="w-full px-3 h-10 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 outline-none focus:border-cyan-500 text-zinc-900 dark:text-zinc-550 focus:ring-0"
              />
            </div>
          )}

          {/* Active Tab: SORT ORDER */}
          {activeTab === 'sort' && (
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sort Results By</span>
                <button
                  onClick={() => setActiveTab('main')}
                  className="text-xs font-semibold text-cyan-500 hover:underline"
                >
                  Back
                </button>
              </div>

              <button
                onClick={() => {
                  setSort('newest');
                  setActiveTab('main');
                }}
                className={`w-full px-3 py-2 text-sm text-left rounded-xl transition-colors ${
                  sort === 'newest' || !sort
                    ? 'bg-cyan-500/10 text-cyan-500 font-semibold'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium'
                }`}
              >
                Newest Logs
              </button>

              <button
                onClick={() => {
                  setSort('popular');
                  setActiveTab('main');
                }}
                className={`w-full px-3 py-2 text-sm text-left rounded-xl transition-colors ${
                  sort === 'popular'
                    ? 'bg-cyan-500/10 text-cyan-500 font-semibold'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium'
                }`}
              >
                Most Liked
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
