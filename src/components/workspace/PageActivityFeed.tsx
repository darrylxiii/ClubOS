import React from 'react';
import { usePageActivity, ActivityType } from '@/hooks/usePageActivity';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Eye, 
  Edit3, 
  MessageSquare, 
  Share2, 
  RotateCcw, 
  FilePlus, 
  Trash2, 
  FolderInput,
  Loader2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getInitials } from '@/lib/strings';

interface PageActivityFeedProps {
  pageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ElementType; label: string; color: string }> = {
  view: { icon: Eye, label: 'Viewed', color: 'text-blue-500' },
  edit: { icon: Edit3, label: 'Edited', color: 'text-amber-500' },
  comment: { icon: MessageSquare, label: 'Commented', color: 'text-green-500' },
  share: { icon: Share2, label: 'Shared', color: 'text-purple-500' },
  restore: { icon: RotateCcw, label: 'Restored', color: 'text-orange-500' },
  create: { icon: FilePlus, label: 'Created', color: 'text-emerald-500' },
  delete: { icon: Trash2, label: 'Deleted', color: 'text-red-500' },
  move: { icon: FolderInput, label: 'Moved', color: 'text-indigo-500' },
};

export function PageActivityFeed({ pageId, open, onOpenChange }: PageActivityFeedProps) {
  const { activities, isLoading } = usePageActivity(pageId);

  // WS-5: Using centralized getInitials from @/lib/strings

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Page Activity
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Activity will appear here as users interact with this page
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-150px)]">
              <div className="space-y-1 pr-4">
                {activities.map((activity) => {
                  const config = ACTIVITY_CONFIG[activity.activity_type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={activity.user?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(activity.user?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {activity.user?.full_name || 'Unknown user'}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Icon className={`h-3 w-3 mr-1 ${config.color}`} />
                            {config.label}
                          </Badge>
                        </div>
                        
                        {(activity.activity_data as Record<string, unknown>)?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {String((activity.activity_data as Record<string, unknown>).description)}
                          </p>
                        )}
                        
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
