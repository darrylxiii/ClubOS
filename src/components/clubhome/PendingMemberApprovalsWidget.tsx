import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, ArrowRight, Clock, Mail, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface PendingMember {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  requested_role: string | null;
}

export const PendingMemberApprovalsWidget = () => {
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPendingMembers = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    
    try {
      // Get pending profiles (where onboarding_completed_at is null)
      const { data, count, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, created_at', { count: 'exact' })
        .is('onboarding_completed_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      if (data) {
        setPendingMembers(data.map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email || '',
          avatar_url: p.avatar_url,
          created_at: p.created_at || new Date().toISOString(),
          requested_role: null
        })));
      }
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending members:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingMembers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('pending-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchPendingMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingMembers]);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">Pending Approvals</span>
            <span className="sm:hidden">Approvals</span>
            {totalCount > 0 && (
              <Badge variant="secondary" className="animate-pulse">{totalCount}</Badge>
            )}
          </CardTitle>
          <CardDescription className="hidden sm:block">New members awaiting review</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fetchPendingMembers(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <Link to="/admin/member-requests" className="flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {pendingMembers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 text-muted-foreground"
          >
            <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No pending approvals</p>
            <p className="text-sm mt-1 hidden sm:block">All member requests have been processed</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {pendingMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all hover:scale-[1.01]"
                >
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{getInitials(member.full_name, member.email)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm sm:text-base">
                      {member.full_name || 'New User'}
                    </p>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Mail className="h-3 w-3 hidden sm:block" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    <span className="hidden sm:inline">
                      {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}
                    </span>
                    <span className="sm:hidden">
                      {formatDistanceToNow(new Date(member.created_at))}
                    </span>
                  </div>
                </motion.div>
              ))}
              {totalCount > 3 && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/admin/member-requests">
                    View {totalCount - 3} more
                  </Link>
                </Button>
              )}
            </div>
          </AnimatePresence>
        )}
        
        {/* Mobile-only View All button */}
        <Button variant="outline" size="sm" asChild className="w-full mt-4 sm:hidden">
          <Link to="/admin/member-requests" className="flex items-center justify-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
