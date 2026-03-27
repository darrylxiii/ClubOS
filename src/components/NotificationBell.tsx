import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationsPanel } from './NotificationsPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export const NotificationBell = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const haptics = useHaptics();

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
    <Popover open={open} onOpenChange={(v) => { if (v) haptics.impact('light'); setOpen(v); }}>
      <PopoverTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative group rounded-full w-9 h-9 hover:bg-white/10 dark:hover:bg-white/5 transition-all outline-none"
            aria-label={unreadCount > 0 ? t('notifications.unreadCount', 'Notifications ({{count}} unread)', { count: unreadCount }) : t('notifications.title', 'Notifications')}
          >
            <motion.div
              whileHover={{ rotate: [0, -15, 15, -10, 10, -5, 5, 0] }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="relative z-10 flex items-center justify-center w-full h-full"
            >
              <Bell className={cn(
                "h-4 w-4 transition-all duration-300",
                unreadCount > 0 && "text-primary fill-primary/10"
              )} aria-hidden="true" />
            </motion.div>
            
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center border-2 border-background animate-pulse-glow z-20 pointer-events-none"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
            {/* Subtle hover bloom background */}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md pointer-events-none rounded-full" />
          </Button>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent 
        sideOffset={16} 
        align="end" 
        className="w-[90vw] sm:w-[420px] p-0 border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.4)] rounded-3xl bg-background/60 backdrop-blur-3xl overflow-hidden"
      >
        <NotificationsPanel />
      </PopoverContent>
    </Popover>
  );
};
