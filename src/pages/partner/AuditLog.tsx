import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { format } from "date-fns";
import { Shield, Search, Filter } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export default function AuditLog() {
  const { companyId } = useRole();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['partner-audit-log', companyId, actionFilter],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from('partner_audit_log')
        .select(`
          *,
          actor:profiles!actor_id(full_name, email)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  const filteredLogs = auditLogs?.filter(log =>
    log.actor?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.action_type?.toLowerCase().includes(search.toLowerCase())
  );

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      candidate_moved: "default",
      job_created: "secondary",
      team_invited: "default",
      application_rejected: "destructive",
    };
    return variants[action] || "default";
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8" />
              Audit Trail
            </h1>
            <p className="text-muted-foreground mt-2">Complete history of all actions taken</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user or action..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="candidate_moved">Candidate Moved</SelectItem>
                  <SelectItem value="job_created">Job Created</SelectItem>
                  <SelectItem value="team_invited">Team Invited</SelectItem>
                  <SelectItem value="application_rejected">Application Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getActionBadge(log.action_type)}>
                            {log.action_type.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            by {log.actor?.full_name || 'Unknown'}
                          </span>
                        </div>
                        <p className="text-sm">
                          {log.resource_type && `Resource: ${log.resource_type}`}
                        </p>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{format(new Date(log.created_at), 'MMM d, yyyy')}</div>
                        <div>{format(new Date(log.created_at), 'h:mm a')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No audit log entries found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
