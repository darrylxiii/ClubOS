import { Grid, MessageSquare, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveHubBottomNavProps {
  activePanel: 'home' | 'servers' | 'messages' | 'notifications' | 'you';
  onPanelChange: (panel: 'home' | 'servers' | 'messages' | 'notifications' | 'you') => void;
}

const LiveHubBottomNav = ({ activePanel, onPanelChange }: LiveHubBottomNavProps) => {
  const navItems = [
    { id: 'servers' as const, icon: Grid, label: 'Servers' },
    { id: 'messages' as const, icon: MessageSquare, label: 'Messages' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'you' as const, icon: User, label: 'You' },
  ];

  return (
    <div className="h-16 border-t border-border bg-card shrink-0 safe-area-bottom">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPanelChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-lg transition-colors min-w-0",
                "active:scale-95 active:bg-muted/50",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 shrink-0",
                isActive && "stroke-[2.5]"
              )} />
              <span className={cn(
                "text-xs truncate",
                isActive && "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LiveHubBottomNav;
