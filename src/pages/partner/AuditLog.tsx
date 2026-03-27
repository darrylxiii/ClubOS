import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { format } from "date-fns";
import { Shield, Search, Filter } from "lucide-react";
import { PartnerGlassCard } from "@/components/partner/PartnerGlassCard";

export default function AuditLog() {
  const { t } = useTranslation('partner');
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

  const formatMetadata = (metadata: any) => {
    if (!metadata || Object.keys(metadata).length === 0) return null;
    return Object.entries(metadata).map(([key, value]) => (
      <div key={key} className="flex gap-2 text-xs">
        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
        <span className="text-foreground">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <PartnerGlassCard>
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('auditLog.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/50 border-border/30"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px] bg-card/50 border-border/30">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('auditLog.allActions')}</SelectItem>
              <SelectItem value="candidate_moved">{t('auditLog.candidateMoved')}</SelectItem>
              <SelectItem value="job_created">{t('auditLog.jobCreated')}</SelectItem>
              <SelectItem value="team_invited">{t('auditLog.teamInvited')}</SelectItem>
              <SelectItem value="application_rejected">{t('auditLog.applicationRejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredLogs && filteredLogs.length > 0 ? (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="rounded-lg p-4 bg-card/20 border border-border/10 hover:bg-card/40 transition-colors">
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
                    {log.resource_type && (
                      <p className="text-sm text-muted-foreground">
                        Resource: {log.resource_type}
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-card/30 rounded-md space-y-1">
                        {formatMetadata(log.metadata)}
                      </div>
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
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{t('auditLog.noEntries')}</p>
          </div>
        )}
      </PartnerGlassCard>
    </div>
  );
}
