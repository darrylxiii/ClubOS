import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, ListTodo, Calendar, HelpCircle, Command } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface GlobalUtilityBarProps {
  onCommandOpen?: () => void;
}

export const GlobalUtilityBar = ({ onCommandOpen }: GlobalUtilityBarProps) => {
  const navigate = useNavigate();

  const utilities = [
    {
      icon: Command,
      label: "Command Palette",
      action: onCommandOpen,
      shortcut: "⌘K",
    },
    {
      icon: Sparkles,
      label: "Club AI Assistant",
      action: () => navigate("/club-ai"),
      shortcut: null,
    },
    {
      icon: ListTodo,
      label: "Club Task Pilot",
      action: () => navigate("/tasks-pilot"),
      shortcut: null,
    },
    {
      icon: Calendar,
      label: "Scheduling",
      action: () => navigate("/scheduling"),
      shortcut: null,
    },
    {
      icon: HelpCircle,
      label: "Help & Documentation",
      action: () => window.open("https://docs.thequantumclub.com", "_blank"),
      shortcut: null,
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {utilities.map((utility) => {
        const Icon = utility.icon;
        return (
          <Tooltip key={utility.label}>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
                onClick={utility.action}
              >
                <Icon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="flex items-center gap-2">
              <span>{utility.label}</span>
              {utility.shortcut && (
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{utility.shortcut}</kbd>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
