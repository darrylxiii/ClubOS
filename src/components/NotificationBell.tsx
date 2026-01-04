import { useState, useEffect } from 'react';
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsPanel } from './NotificationsPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const NotificationBell = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadUnreadCount();
    
    const channel = supabase
      .channel('unread-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .eq('is_archived', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative group min-h-[44px] min-w-[44px]"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
          >
            <Bell className={cn(
              "h-5 w-5 transition-all duration-300",
              unreadCount > 0 && "text-primary"
            )} aria-hidden="true" />
            
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-background animate-pulse"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </Button>
        </motion.div>
      </SheetTrigger>
      <SheetContent className="w-[90vw] sm:w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">
        <NotificationsPanel />
      </SheetContent>
    </Sheet>
  );
};
