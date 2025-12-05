import { useEffect, useState } from "react";
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
import {
  Briefcase,
  Gift,
  FileText,
  Settings,
  Clock,
  User,
  ListTodo,
  Sparkles,
  Calendar,
  MessageSquare,
  Video,
  Building,
  Rss,
  Users,
  Home,
  Target,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface CommandItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  category: string;
  roles: string[];
}

const allCommands: CommandItem[] = [
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
  { id: "unified-tasks", label: "Tasks", icon: ListTodo, path: "/unified-tasks", category: "AI & Tools", roles: ["user", "partner", "admin", "strategist"] },
  { id: "club-pilot", label: "Club Pilot (AI Tasks)", icon: Sparkles, path: "/club-pilot", category: "AI & Tools", roles: ["user", "partner", "admin", "strategist"] },
  
  // Settings
  { id: "settings", label: "Account Settings", icon: Settings, path: "/settings", category: "Settings", roles: ["user", "partner", "admin", "strategist"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { role } = useUserRole();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredCommands = allCommands.filter((cmd) =>
    cmd.roles.includes(role || "user")
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {Object.entries(groupedCommands).map(([category, items], index) => (
          <div key={category}>
            <CommandGroup heading={category}>
              {items.map((item) => {
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
            {index < Object.entries(groupedCommands).length - 1 && (
              <CommandSeparator />
            )}
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
