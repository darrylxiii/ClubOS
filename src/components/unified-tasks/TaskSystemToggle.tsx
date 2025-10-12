import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Check } from "lucide-react";

interface TaskSystemToggleProps {
  activeSystem: string;
  onSystemChange: (system: string) => void;
}

export const TaskSystemToggle = ({ activeSystem, onSystemChange }: TaskSystemToggleProps) => {
  const systems = [
    { 
      value: 'unified', 
      label: 'Unified (Beta)',
      description: 'New merged system with all features',
      badge: 'Recommended'
    },
    { 
      value: 'legacy_club', 
      label: 'Club Tasks (Legacy)',
      description: 'Original club task board'
    },
    { 
      value: 'legacy_pilot', 
      label: 'Task Pilot (Legacy)',
      description: 'AI scheduling system'
    },
    { 
      value: 'side_by_side', 
      label: 'Side-by-Side',
      description: 'Compare legacy and unified'
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          <Settings className="h-4 w-4" />
          Task System
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          Select Task System
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {systems.map((system) => (
          <DropdownMenuItem
            key={system.value}
            onClick={() => onSystemChange(system.value)}
            className="flex flex-col items-start py-3 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="font-medium">{system.label}</span>
                {system.badge && (
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                    {system.badge}
                  </span>
                )}
              </div>
              {activeSystem === system.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-1">
              {system.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
