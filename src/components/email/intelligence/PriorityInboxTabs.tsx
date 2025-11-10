import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, AlertCircle, Info, Newspaper, Archive, Inbox } from "lucide-react";

interface PriorityInboxTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    all: number;
    important: number;
    actionRequired: number;
    fyi: number;
    newsletters: number;
    lowPriority: number;
  };
}

export function PriorityInboxTabs({ activeTab, onTabChange, counts }: PriorityInboxTabsProps) {
  const tabs = [
    { 
      value: "all", 
      label: "All Emails", 
      shortLabel: "All",
      icon: Inbox, 
      count: counts.all, 
      color: "text-foreground" 
    },
    { 
      value: "important", 
      label: "Important", 
      shortLabel: "Important",
      icon: Flame, 
      count: counts.important, 
      color: "text-destructive" 
    },
    { 
      value: "action", 
      label: "Action Required", 
      shortLabel: "Action",
      icon: AlertCircle, 
      count: counts.actionRequired, 
      color: "text-warning" 
    },
    { 
      value: "fyi", 
      label: "FYI", 
      shortLabel: "FYI",
      icon: Info, 
      count: counts.fyi, 
      color: "text-primary" 
    },
    { 
      value: "newsletters", 
      label: "Newsletters", 
      shortLabel: "News",
      icon: Newspaper, 
      count: counts.newsletters, 
      color: "text-muted-foreground" 
    },
    { 
      value: "low", 
      label: "Low Priority", 
      shortLabel: "Low",
      icon: Archive, 
      count: counts.lowPriority, 
      color: "text-muted-foreground" 
    },
  ];

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="h-12 md:h-14 w-max md:w-full justify-start rounded-none bg-transparent border-0 px-2 sm:px-4 gap-1 flex-nowrap">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary relative gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 min-h-[44px] flex-shrink-0"
              >
                <tab.icon className={`h-4 w-4 flex-shrink-0 ${tab.color}`} />
                <span className="hidden sm:inline font-medium whitespace-nowrap">{tab.label}</span>
                <span className="sm:hidden font-medium whitespace-nowrap">{tab.shortLabel}</span>
                {tab.count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs flex-shrink-0">
                    {tab.count > 99 ? "99+" : tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
