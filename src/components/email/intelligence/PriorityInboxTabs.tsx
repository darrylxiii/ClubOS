import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Flame, AlertCircle, Info, Newspaper, Archive } from "lucide-react";

interface PriorityInboxTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    important: number;
    actionRequired: number;
    fyi: number;
    newsletters: number;
    lowPriority: number;
  };
}

export function PriorityInboxTabs({ activeTab, onTabChange, counts }: PriorityInboxTabsProps) {
  const tabs = [
    { value: "important", label: "Important", icon: Flame, count: counts.important, color: "text-destructive" },
    { value: "action", label: "Action Required", icon: AlertCircle, count: counts.actionRequired, color: "text-warning" },
    { value: "fyi", label: "FYI", icon: Info, count: counts.fyi, color: "text-primary" },
    { value: "newsletters", label: "Newsletters", icon: Newspaper, count: counts.newsletters, color: "text-muted-foreground" },
    { value: "low", label: "Low Priority", icon: Archive, count: counts.lowPriority, color: "text-muted-foreground" },
  ];

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="h-12 w-full justify-start rounded-none bg-transparent border-0 px-4 gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary relative gap-2 px-4"
            >
              <tab.icon className={`h-4 w-4 ${tab.color}`} />
              <span className="font-medium">{tab.label}</span>
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {tab.count > 99 ? "99+" : tab.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
