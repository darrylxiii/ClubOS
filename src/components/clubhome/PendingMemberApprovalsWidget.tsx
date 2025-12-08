import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, ArrowRight, Clock, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

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

  useEffect(() => {
    fetchPendingMembers();
  }, []);

  const fetchPendingMembers = async () => {
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
    }
  };

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
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Pending Approvals
            {totalCount > 0 && (
              <Badge variant="secondary" className="ml-2">{totalCount}</Badge>
            )}
          </CardTitle>
          <CardDescription>New members awaiting review</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/member-requests" className="flex items-center gap-1">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {pendingMembers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No pending approvals</p>
            <p className="text-sm mt-1">All member requests have been processed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingMembers.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(member.full_name, member.email)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {member.full_name || 'New User'}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}
                </div>
              </div>
            ))}
            {totalCount > 3 && (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/admin/member-requests">
                  View {totalCount - 3} more pending
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
