import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PresenceUser {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  online_at: string;
  status?: 'viewing' | 'editing';
  current_block?: string | null;
}

interface EnhancedPresenceIndicatorProps {
  pageId: string;
  showDetails?: boolean;
}

export function EnhancedPresenceIndicator({ pageId, showDetails = false }: EnhancedPresenceIndicatorProps) {
  const { user } = useAuth();
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!pageId || !user) return;

    const channel = supabase.channel(`presence-${pageId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.user_id !== user.id) {
              users.push(presence as PresenceUser);
            }
          });
        });
        
        setPresenceUsers(users);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [pageId, user]);

  const activeViewers = presenceUsers.filter(u => u.status !== 'editing');
  const activeEditors = presenceUsers.filter(u => u.status === 'editing');

  if (presenceUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Compact avatar stack */}
        <motion.div 
          className="flex items-center cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
        >
          <div className="flex -space-x-2">
            <AnimatePresence mode="popLayout">
              {presenceUsers.slice(0, 3).map((presenceUser, index) => (
                <motion.div
                  key={presenceUser.user_id}
                  initial={{ opacity: 0, scale: 0.5, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.5, x: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar className="h-7 w-7 ring-2 ring-background border-2 border-primary/20">
                          <AvatarImage src={presenceUser.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {presenceUser.user_name?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        {presenceUser.status === 'editing' && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background flex items-center justify-center">
                            <Edit3 className="w-1.5 h-1.5 text-white" />
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <p className="font-medium">{presenceUser.user_name}</p>
                      <p className="text-muted-foreground">
                        {presenceUser.status === 'editing' ? 'Editing' : 'Viewing'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {presenceUsers.length > 3 && (
            <Badge variant="secondary" className="ml-1 h-7 px-2 text-xs">
              +{presenceUsers.length - 3}
            </Badge>
          )}
        </motion.div>

        {/* Expanded details panel */}
        <AnimatePresence>
          {(isExpanded || showDetails) && presenceUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-3 overflow-hidden"
            >
              {activeEditors.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Edit3 className="w-3 h-3 text-green-500" />
                  <span>{activeEditors.length} editing</span>
                </div>
              )}
              {activeViewers.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  <span>{activeViewers.length} viewing</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">Live</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
