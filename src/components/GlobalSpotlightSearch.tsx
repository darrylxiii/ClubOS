import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, Gift, FileText, Settings, Clock, User, ListTodo,
  Sparkles, Calendar, MessageSquare, Video, Building, Rss,
  Users, Home, Target, Brain, Search, History, ArrowRight,
} from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

// ── Types ──────────────────────────────────────────────────────────
interface NavCommand {
  id: string;
  label: string;
  icon: any;
  path: string;
  category: string;
  roles: string[];
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const { user } = useAuth();
  const abortRef = useRef<AbortController | null>(null);

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
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);

    try {
      const term = `%${searchTerm}%`;

      // Parallel queries across entities
      const [profilesRes, jobsRes, companiesRes, meetingsRes] = await Promise.all([
        // Candidates / Profiles
        supabase
          .from("profiles")
          .select("id, full_name, current_title, avatar_url")
          .or(`full_name.ilike.${term},current_title.ilike.${term}`)
          .limit(5),
        // Jobs
        supabase
          .from("jobs")
          .select("id, title, company_name, status")
          .ilike("title", term)
          .limit(5),
        // Companies
        supabase
          .from("companies")
          .select("id, name, industry")
          .ilike("name", term)
          .limit(5),
        // Meetings
        supabase
          .from("meetings")
          .select("id, title, scheduled_start, meeting_code")
          .ilike("title", term)
          .limit(5),
      ]);

      if (controller.signal.aborted) return;

      const searchResults: SearchResult[] = [];

      // Map profiles
      profilesRes.data?.forEach((p) => {
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

      // Map jobs
      jobsRes.data?.forEach((j) => {
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

      // Map companies
      companiesRes.data?.forEach((c) => {
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

      // Map meetings
      meetingsRes.data?.forEach((m) => {
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

      setResults(searchResults);
    } catch (err) {
      console.error("Spotlight search error:", err);
    } finally {
      if (!controller.signal.aborted) setSearching(false);
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
  const hasResults = results.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search people, jobs, companies, meetings or navigate..."
        value={query}
        onValueChange={handleQueryChange}
      />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          {searching ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4 animate-pulse" />
              Searching...
            </div>
          ) : hasQuery ? (
            "No results found."
          ) : (
            "Type to search across your workspace."
          )}
        </CommandEmpty>

        {/* Recent searches — only show when no query */}
        {!hasQuery && recentSearches.length > 0 && (
          <CommandGroup heading="Recent Searches">
            {recentSearches.map((term) => (
              <CommandItem
                key={`recent-${term}`}
                onSelect={() => handleQueryChange(term)}
                className="cursor-pointer"
              >
                <History className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{term}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Live search results */}
        {hasQuery &&
          Object.entries(groupedResults).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleSelect(item.path, item.title)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{item.title}</span>
                      {item.subtitle && (
                        <span className="ml-2 text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 text-[10px] shrink-0">
                        {item.badge}
                      </Badge>
                    )}
                    <ArrowRight className="ml-1 h-3 w-3 text-muted-foreground shrink-0" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}

        {/* Navigation commands — show when no query or filtered by query */}
        {(!hasQuery || !hasResults) && (
          <>
            {hasQuery && hasResults && <CommandSeparator />}
            <CommandGroup heading="Navigate">
              {filteredCommands.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleSelect(item.path)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t border-border/30 px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex gap-3">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
        <span>Powered by QUIN</span>
      </div>
    </CommandDialog>
  );
}