import { useTranslation } from 'react-i18next';
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Gift, FileText, Settings, Clock, User, ListTodo,
  Sparkles, Calendar, MessageSquare, Video, Building, Rss,
  Users, Home, Target, Brain, Search, History, ArrowRight, ChevronRight
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────
interface NavCommand {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  category: string;
  roles: string[];
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  path: string;
  category: string;
  badge?: string;
}

// ── Static navigation commands ─────────────────────────────────────
const allCommands: NavCommand[] = [
  { id: "home", label: "Home", icon: Home, path: "/home", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "admin", label: "Admin Panel", icon: Users, path: "/admin", category: "Quick Actions", roles: ["admin"] },
  { id: "feed", label: "Community Feed", icon: Rss, path: "/feed", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "profile", label: "My Profile", icon: User, path: "/profile", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "jobs", label: "Browse Jobs", icon: Briefcase, path: "/jobs", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "applications", label: "My Applications", icon: FileText, path: "/applications", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "companies", label: "Explore Companies", icon: Building, path: "/companies", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "referrals", label: "Referral Program", icon: Gift, path: "/referrals", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "target-companies", label: "Target Companies", icon: Target, path: "/partner/target-companies", category: "Quick Actions", roles: ["partner", "strategist"] },
  { id: "admin-target-companies", label: "Target Companies Overview", icon: Target, path: "/admin/target-companies", category: "Quick Actions", roles: ["admin", "strategist"] },
  { id: "member-requests", label: "Review Member Requests", icon: Users, path: "/admin/member-requests", category: "Quick Actions", roles: ["admin"] },
  { id: "messages", label: "Messages", icon: MessageSquare, path: "/messages", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "meetings", label: "Meetings", icon: Video, path: "/meetings", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "scheduling", label: "Scheduling", icon: Calendar, path: "/scheduling", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "meeting-intelligence", label: "Meeting Intelligence", icon: Video, path: "/meeting-intelligence", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "interview-prep", label: "Interview Prep", icon: Clock, path: "/interview-prep", category: "Quick Actions", roles: ["user", "strategist"] },
  { id: "club-ai", label: "Club AI Assistant", icon: Sparkles, path: "/club-ai", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "communication-hub", label: "Communication Hub", icon: Brain, path: "/admin/communication-hub", category: "Quick Actions", roles: ["admin", "strategist"] },
  { id: "unified-tasks", label: "Tasks", icon: ListTodo, path: "/tasks", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "club-pilot", label: "Club Pilot (AI Tasks)", icon: Sparkles, path: "/club-pilot", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
  { id: "settings", label: "Account Settings", icon: Settings, path: "/settings", category: "Quick Actions", roles: ["user", "partner", "admin", "strategist"] },
];

const RECENT_KEY = "qc-spotlight-recent";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch { return []; }
}

function addRecentSearch(term: string) {
  const recent = getRecentSearches().filter((r) => r !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

// ── Component ──────────────────────────────────────────────────────
export function GlobalSpotlightSearch() {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const { currentRole, companyId } = useRole();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Voice-to-search bridge: listen for CustomEvent from useVoiceCommands
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) {
        setQuery(detail);
        setOpen(true);
        performSearch(detail);
      }
    };
    window.addEventListener("spotlight-search", handler);
    return () => window.removeEventListener("spotlight-search", handler);
  }, []);

  useEffect(() => {
    if (open) setRecentSearches(getRecentSearches());
  }, [open]);

  // Navigation commands filtered by role
  const filteredCommands = useMemo(
    () => allCommands.filter((cmd) => cmd.roles.includes(currentRole || "user")),
    [currentRole]
  );

  // Search function
  const performSearch = useDebouncedCallback(async (searchTerm: string) => {
    // 1. Immediately terminate any racing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    // Create a fresh controller for the incoming query cycle
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const term = `%${searchTerm}%`;

      // 2. Parallel queries across entities handled gracefully if single components degrade
      const queries: Promise<any>[] = [
        supabase
          .from("profiles")
          .select("id, full_name, current_title, avatar_url")
          .or(`full_name.ilike.${term},current_title.ilike.${term}`)
          .limit(5)
          .abortSignal(signal),
        supabase
          .from("jobs")
          .select("id, title, company_name, status")
          .ilike("title", term)
          .limit(5)
          .abortSignal(signal),
        supabase
          .from("companies")
          .select("id, name, industry")
          .ilike("name", term)
          .limit(5)
          .abortSignal(signal),
        supabase
          .from("meetings")
          .select("id, title, scheduled_start, meeting_code")
          .ilike("title", term)
          .limit(5)
          .abortSignal(signal),
      ];

      // 3. Dynamic Tiering for Candidates Search based on access scopes
      if (currentRole === 'admin' || currentRole === 'strategist') {
        queries.push(
          supabase
            .from("candidate_profiles")
            .select("id, full_name, current_title, current_company, avatar_url")
            .or(`full_name.ilike.${term},current_title.ilike.${term},current_company.ilike.${term}`)
            .limit(5)
            .abortSignal(signal)
        );
      } else if (currentRole === 'partner' && companyId) {
        queries.push(
          supabase
            .from("applications")
            .select(`
              candidate_id,
              candidate_profiles!inner(id, full_name, current_title, current_company, avatar_url),
              jobs!inner(company_id)
            `)
            .eq('jobs.company_id', companyId)
            .or(`full_name.ilike.${term},current_title.ilike.${term}`, { foreignTable: 'candidate_profiles' })
            .limit(5)
            .abortSignal(signal)
        );
      }

      const responses = await Promise.allSettled(queries);

      const searchResults: SearchResult[] = [];

      // Destructure cleanly (ignoring rejected promises to prevent catastrophic layout failure)
      if (responses[0].status === "fulfilled" && responses[0].value.data) {
        responses[0].value.data.forEach((p: any) => {
          searchResults.push({
            id: `profile-${p.id}`,
            title: p.full_name || "Unknown",
            subtitle: p.current_title || undefined,
            icon: User,
            path: `/profile/${p.id}`,
            category: "People",
            badge: "Profile",
          });
        });
      }

      if (responses[1].status === "fulfilled" && responses[1].value.data) {
        responses[1].value.data.forEach((j: any) => {
          searchResults.push({
            id: `job-${j.id}`,
            title: j.title,
            subtitle: j.company_name || undefined,
            icon: Briefcase,
            path: `/jobs/${j.id}`,
            category: "Jobs",
            badge: j.status || "Job",
          });
        });
      }

      if (responses[2].status === "fulfilled" && responses[2].value.data) {
        responses[2].value.data.forEach((c: any) => {
          searchResults.push({
            id: `company-${c.id}`,
            title: c.name,
            subtitle: c.industry || undefined,
            icon: Building,
            path: `/companies/${c.id}`,
            category: "Companies",
            badge: "Company",
          });
        });
      }

      if (responses[3].status === "fulfilled" && responses[3].value.data) {
        responses[3].value.data.forEach((m: any) => {
          searchResults.push({
            id: `meeting-${m.id}`,
            title: m.title,
            subtitle: m.scheduled_start
              ? new Date(m.scheduled_start).toLocaleDateString()
              : undefined,
            icon: Video,
            path: `/meetings/${m.meeting_code}`,
            category: "Meetings",
            badge: "Meeting",
          });
        });
      }

      // 4. Safely map conditional scoped Candidates
      if (responses.length > 4) {
        const cRes = responses[4];
        if (cRes.status === "fulfilled" && cRes.value.data) {
          const seenCandidates = new Set<string>();
          cRes.value.data.forEach((cItem: any) => {
            const profile = cItem.candidate_profiles ? cItem.candidate_profiles : cItem;
            
            if (profile && profile.id && !seenCandidates.has(profile.id)) {
              seenCandidates.add(profile.id);
              searchResults.push({
                id: `candidate-${profile.id}`,
                title: profile.full_name || "Unknown Candidate",
                subtitle: profile.current_title || profile.current_company || undefined,
                icon: User,
                path: `/candidate/${profile.id}`,
                category: "Candidates",
                badge: currentRole === 'partner' ? "Pipeline" : "Talent Pool",
              });
            }
          });
        }
      }

      setResults(searchResults);
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Ignore intentional aborts as they are functionally sound
      toast.error(t("search_failed_please_try", "Search failed. Please try again."));
    } finally {
      setSearching(false);
    }
  }, 300);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    performSearch(value);
  };

  const handleSelect = useCallback(
    (path: string, label?: string) => {
      setOpen(false);
      if (label && query) addRecentSearch(query);
      navigate(path);
      setQuery("");
      setResults([]);
    },
    [navigate, query]
  );

  // Group search results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    });
    return groups;
  }, [results]);

  const hasQuery = query.length >= 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-black/40 backdrop-blur-sm z-[100]" />
        <DialogContent 
          className="fixed left-[50%] top-[20vh] z-[100] w-full max-w-3xl translate-x-[-50%] p-0 border-0 bg-transparent shadow-none [&>button]:hidden sm:[&>button]:hidden focus:outline-none focus:ring-0"
          // Avoid forcing focus outline on open
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col sm:flex-row items-start gap-4 w-full focus:outline-none">
            {/* The Main Dynamic Pill */}
            <div className="flex-1 w-full flex flex-col overflow-hidden rounded-[28px] bg-black/60 backdrop-blur-3xl shadow-[0_16px_64px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] ring-[0.5px] ring-white/10 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
              <Command className="bg-transparent text-white [&_[cmdk-input-wrapper]]:border-none [&_[cmdk-input-wrapper]]:px-6 [&_[cmdk-input-wrapper]_svg]:h-6 [&_[cmdk-input-wrapper]_svg]:w-6 [&_[cmdk-input-wrapper]_svg]:text-white/50" loop>
                <div style={{ borderBottom: hasQuery ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent', transition: 'border-color 0.3s' }}>
                  <CommandInput 
                    placeholder="Spotlight Search..." 
                    value={query}
                    onValueChange={handleQueryChange}
                    className="h-16 text-xl font-medium text-white placeholder:text-white/30 truncate border-0 focus:ring-0" 
                  />
                </div>
                
                <AnimatePresence>
                  {hasQuery && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: "auto", opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <CommandList className="max-h-[400px] p-2">
                      <CommandEmpty>
                        {searching ? (
                          <div className="flex flex-col items-center justify-center gap-4 py-12 text-muted-foreground">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                              <Search className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-lg">Searching...</p>
                          </div>
                        ) : hasQuery ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                            <Search className="h-8 w-8 opacity-20" />
                            <p className="text-lg">No results found.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground/50">
                            <Sparkles className="h-8 w-8 opacity-20" />
                            <p className="text-lg font-light">Type anywhere to search.</p>
                          </div>
                        )}
                      </CommandEmpty>

                      {/* Recent searches — only show when no query */}
                      {!hasQuery && recentSearches.length > 0 && (
                        <CommandGroup heading="Recent Searches" className="[&_[cmdk-group-heading]]:text-white/40">
                          {recentSearches.map((term) => (
                            <CommandItem
                              key={`recent-${term}`}
                              onSelect={() => handleQueryChange(term)}
                              className="cursor-pointer data-[selected='true']:bg-white/10"
                            >
                              <History className="mr-3 shrink-0 text-white/40" />
                              <span className="text-base">{term}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {/* Live search results */}
                      {hasQuery &&
                        Object.entries(groupedResults).map(([category, items]) => (
                          <CommandGroup key={category} heading={category} className="[&_[cmdk-group-heading]]:text-white/40">
                            {items.map((item) => {
                              const Icon = item.icon;
                              return (
                                <CommandItem
                                  key={item.id}
                                  onSelect={() => handleSelect(item.path, item.title)}
                                  className="cursor-pointer py-3 data-[selected='true']:bg-white/10 transition-colors group"
                                >
                                  <Icon className="mr-4 shrink-0 h-5 w-5 text-white/40 group-data-[selected='true']:text-white/80" />
                                  <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
                                    <span className="text-[15px] font-medium text-white/90 truncate leading-none">{item.title}</span>
                                    {item.subtitle && (
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">{item.category}</span>
                                        <ChevronRight className="h-3 w-3 text-white/20" />
                                        <span className="text-[11px] font-medium text-white/50 truncate">
                                          {item.subtitle}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {item.badge && (
                                    <Badge variant="outline" className="ml-3 text-[10px] tracking-widest uppercase bg-white/5 border-white/10 shrink-0 text-white/70">
                                      {item.badge}
                                    </Badge>
                                  )}
                                  <ArrowRight className="ml-3 shrink-0 h-4 w-4 text-white/20 group-hover:text-primary transition-colors" />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        ))}

                      {/* Navigation commands — always rendered, cmdk handles filtering */}
                      <CommandGroup heading="Navigate" className="[&_[cmdk-group-heading]]:text-white/40">
                        {filteredCommands.map((item) => {
                          const Icon = item.icon;
                          return (
                            <CommandItem
                              key={item.id}
                              onSelect={() => handleSelect(item.path)}
                              className="cursor-pointer py-3 data-[selected='true']:bg-white/10 data-[selected='true']:text-white group transition-colors"
                            >
                              <Icon className="mr-4 shrink-0 h-5 w-5 text-white/40 group-data-[selected='true']:text-white/80" />
                              <span className="text-[15px] text-white/90">{item.label}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                    
                    {/* Footer */}
                    <div className="border-t border-white/5 bg-white/[0.02] px-6 py-3 flex items-center justify-between text-[10px] text-white/40">
                      <div className="flex gap-4 hidden sm:flex">
                        <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-sans text-[10px] text-white/50">↑↓</kbd> Navigate</span>
                        <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-sans text-[10px] text-white/50">↵</kbd> Select</span>
                        <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-sans text-[10px] text-white/50">esc</kbd> Close</span>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                         <Sparkles className="h-3 w-3 text-white/50 animate-pulse" />
                         <span className="font-bold tracking-[0.2em] uppercase text-[9px] text-white/30">{t("powered_by_quin", "Powered by QUIN")}</span>
                      </div>
                    </div>
                  </motion.div>
                 )}
                </AnimatePresence>
              </Command>
            </div>

            {/* The Side Icons Dock */}
            <div className="shrink-0 flex items-center sm:flex-col gap-2 rounded-full sm:rounded-[24px] bg-black/60 backdrop-blur-3xl p-2 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] ring-[0.5px] ring-white/10">
               {[
                 { id: 'dock-btn-0', label: "Search People", icon: User, action: () => { setQuery("Profile"); performSearch("Profile"); } },
                 { id: 'dock-btn-1', label: "Search Jobs", icon: Briefcase, action: () => { setQuery("Job"); performSearch("Job"); } },
                 { id: 'dock-btn-2', label: "Search Companies", icon: Building, action: () => { setQuery("Company"); performSearch("Company"); } },
                 { id: 'dock-btn-3', label: "Ask AI", icon: Sparkles, action: () => { setQuery("Club AI"); performSearch("Club AI"); }, isAI: true }
               ].map((btn, index) => {
                 const BtnIcon = btn.icon;
                 return (
                   <button 
                     key={btn.id}
                     id={btn.id}
                     onClick={btn.action}
                     onKeyDown={(e) => {
                       if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                         e.preventDefault();
                         document.getElementById(`dock-btn-${(index + 1) % 4}`)?.focus();
                       } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                         e.preventDefault();
                         document.getElementById(`dock-btn-${(index - 1 + 4) % 4}`)?.focus();
                       } else if (e.key === 'Enter') {
                         e.preventDefault();
                         btn.action();
                       }
                     }}
                     className={cn(
                       "h-12 w-12 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/10 active:scale-95",
                       btn.isAI && "focus:ring-white/20 group hover:text-primary"
                     )} 
                     title={btn.label}
                     tabIndex={0}
                   >
                     <BtnIcon className={cn("h-5 w-5", btn.isAI && "text-primary/70 group-hover:text-primary animate-pulse")} />
                   </button>
                 );
               })}
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
