import { motion } from 'framer-motion';
import { 
  LayoutGrid, Users, Target, GitBranch, 
  ClipboardList, BarChart3, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'overview' | 'executive' | 'team' | 'department' | 'okr' | 'lineage' | 'audit' | 'goals' | 'governance';

interface KPIMobileNavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onOpenCommand?: () => void;
  criticalCount?: number;
  className?: string;
}

const navItems: Array<{ view: ViewMode; icon: React.ReactNode; label: string }> = [
  { view: 'overview', icon: <LayoutGrid className="h-5 w-5" />, label: 'Overview' },
  { view: 'executive', icon: <BarChart3 className="h-5 w-5" />, label: 'Executive' },
  { view: 'department', icon: <Users className="h-5 w-5" />, label: 'Team' },
  { view: 'okr', icon: <Target className="h-5 w-5" />, label: 'OKRs' },
  { view: 'audit', icon: <ClipboardList className="h-5 w-5" />, label: 'Audit' },
];

export function KPIMobileNavigation({ 
  currentView, 
  onViewChange,
  className 
}: KPIMobileNavigationProps) {
  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
      "bg-background/95 backdrop-blur-lg border-t border-border",
      "safe-area-pb",
      className
    )}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "w-16 py-1.5 rounded-xl transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 bg-accent/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              <span className="relative z-10">{item.icon}</span>
              <span className={cn(
                "relative z-10 text-[10px] mt-1 font-medium",
                isActive ? "text-accent" : ""
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
