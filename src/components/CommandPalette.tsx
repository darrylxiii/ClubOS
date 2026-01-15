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
import { useCommand, CommandItem as ICommandItem } from "@/contexts/CommandContext";
import { useRole } from "@/contexts/RoleContext";
import { useMemo, useCallback } from "react";
import {
  Home, Users, Rss, User, Briefcase, FileText, Building, Gift,
  Target, MessageSquare, Video, Calendar, Clock, Sparkles, Brain,
  ListTodo, Settings
} from "lucide-react";
import { useRegisterCommands } from "@/contexts/CommandContext";

// Define Global Commands (Static)
const globalCommands: ICommandItem[] = [
  // Overview
  { id: "home", label: "Home", icon: Home, path: "/home", category: "Overview", roles: ["user", "partner", "admin", "strategist"] },
  { id: "admin", label: "Admin Panel", icon: Users, path: "/admin", category: "Overview", roles: ["admin"] },
  { id: "feed", label: "Community Feed", icon: Rss, path: "/feed", category: "Overview", roles: ["user", "partner", "admin", "strategist"] },

  // Career
  { id: "profile", label: "My Profile", icon: User, path: "/profile", category: "Career", roles: ["user", "partner", "admin", "strategist"] },
  { id: "jobs", label: "Browse Jobs", icon: Briefcase, path: "/jobs", category: "Career", roles: ["user", "partner", "admin", "strategist"] },
  { id: "applications", label: "My Applications", icon: FileText, path: "/applications", category: "Career", roles: ["user", "partner", "admin", "strategist"] },
  { id: "companies", label: "Explore Companies", icon: Building, path: "/companies", category: "Career", roles: ["user", "partner", "admin", "strategist"] },
  { id: "referrals", label: "Referral Program", icon: Gift, path: "/referrals", category: "Career", roles: ["user", "partner", "admin", "strategist"] },

  // Hiring
  { id: "target-companies", label: "Target Companies", icon: Target, path: "/partner/target-companies", category: "Hiring", roles: ["partner", "strategist"] },
  { id: "admin-target-companies", label: "Target Companies Overview", icon: Target, path: "/admin/target-companies", category: "Hiring", roles: ["admin", "strategist"] },
  { id: "member-requests", label: "Review Member Requests", icon: Users, path: "/admin/member-requests", category: "Hiring", roles: ["admin"] },

  // Communication
  { id: "messages", label: "Messages", icon: MessageSquare, path: "/messages", category: "Communication", roles: ["user", "partner", "admin", "strategist"] },
  { id: "meetings", label: "Meetings", icon: Video, path: "/meetings", category: "Communication", roles: ["user", "partner", "admin", "strategist"] },
  { id: "scheduling", label: "Scheduling", icon: Calendar, path: "/scheduling", category: "Communication", roles: ["user", "partner", "admin", "strategist"] },
  { id: "meeting-intelligence", label: "Meeting Intelligence", icon: Video, path: "/meeting-intelligence", category: "Communication", roles: ["user", "partner", "admin", "strategist"] },
  { id: "interview-prep", label: "Interview Prep", icon: Clock, path: "/interview-prep", category: "Communication", roles: ["user", "strategist"] },

  // AI & Tools
  { id: "club-ai", label: "Club AI Assistant", icon: Sparkles, path: "/club-ai", category: "AI & Tools", roles: ["user", "partner", "admin", "strategist"] },
  { id: "communication-intelligence", label: "Communication Intelligence", icon: Brain, path: "/communication-intelligence", category: "AI & Tools", roles: ["admin", "strategist"] },
  { id: "unified-tasks", label: "Tasks", icon: ListTodo, path: "/unified-tasks", category: "AI & Tools", roles: ["user", "partner", "admin", "strategist"] },
  { id: "club-pilot", label: "Club Pilot (AI Tasks)", icon: Sparkles, path: "/club-pilot", category: "AI & Tools", roles: ["user", "partner", "admin", "strategist"] },

  // Settings
  { id: "settings", label: "Account Settings", icon: Settings, path: "/settings", category: "Settings", roles: ["user", "partner", "admin", "strategist"] },
];

export function CommandPalette() {
  const { isOpen, setIsOpen, commands } = useCommand();
  const navigate = useNavigate();
  const { currentRole } = useRole();

  // Register global navigation commands permanently
  useRegisterCommands(globalCommands);

  // Filter commands by role
  const filteredCommands = useMemo(() =>
    commands.filter((cmd) => !cmd.roles || cmd.roles.includes(currentRole || "user")),
    [commands, currentRole]
  );

  // Group commands
  const groupedCommands = useMemo(() => {
    // We want specific order: Context first, then Actions, then Navigation categories
    const groups: Record<string, ICommandItem[]> = {};

    // Sort logic: High priority first
    const sorted = [...filteredCommands].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    sorted.forEach(cmd => {
      const cat = cmd.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  const handleSelect = useCallback((item: ICommandItem) => {
    setIsOpen(false);
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  }, [navigate, setIsOpen]);

  // Order of categories to display
  const categoryOrder = [
    'Context',
    'Actions',
    'AI & Tools',
    'Overview',
    'Communication',
    'Career',
    'Hiring',
    'Settings'
  ];

  // Get any other categories not in the list
  const otherCategories = Object.keys(groupedCommands).filter(c => !categoryOrder.includes(c));
  const finalOrder = [...categoryOrder, ...otherCategories];

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {finalOrder.map((category, index) => {
          const items = groupedCommands[category];
          if (!items || items.length === 0) return null;

          return (
            <div key={category}>
              <CommandGroup heading={category}>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(item)}
                      className="cursor-pointer"
                      value={`${item.label} ${item.keywords?.join(' ') || ''}`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="ml-auto text-xs text-muted-foreground">{item.shortcut}</span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
