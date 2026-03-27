import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { candidateAuditService } from "@/services/candidateAuditService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function ArchivedCandidatesView() {
  const { t } = useTranslation('common');
  const [archived, setArchived] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadArchived();
  }, []);

  const loadArchived = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select(`
          *,
          deleted_by_profile:profiles!deleted_by(full_name),
          applications(count)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setArchived(data || []);
    } catch (error: unknown) {
      console.error('Error loading archived candidates:', error);
      toast.error(t("failed_to_load_archived", "Failed to load archived candidates"));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (candidateId: string, candidateName: string) => {
    setRestoring(candidateId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get before state for audit
      const { data: before } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidateId)
        .single();

      // Restore candidate
      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null,
          deletion_type: null,
          deletion_metadata: {}
        } as any)
        .eq('id', candidateId);

      if (error) throw error;

      // Log audit entry
      await candidateAuditService.logAudit({
        candidate_id: candidateId,
        action: 'restore',
        before_data: before,
        reason: 'Restored from archive',
        metadata: {
          restored_by: user.id,
          original_deletion_reason: (before as any)?.deletion_reason
        }
      });

      toast.success(`${candidateName} restored successfully`);
      loadArchived();
    } catch (error: unknown) {
      console.error('Error restoring candidate:', error);
      toast.error(t("failed_to_restore_candidate", "Failed to restore candidate:") + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("archived_candidates", "Archived Candidates")}</CardTitle>
        <CardDescription>
          {archived.length} candidate{archived.length !== 1 ? 's' : ''} archived. These profiles are hidden but can be restored.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {archived.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("no_archived_candidates", "No archived candidates")}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name", "Name")}</TableHead>
                  <TableHead>{t("email", "Email")}</TableHead>
                  <TableHead>{t("archived_by", "Archived By")}</TableHead>
                  <TableHead>{t("archived_at", "Archived At")}</TableHead>
                  <TableHead>{t("applications", "Applications")}</TableHead>
                  <TableHead>{t("reason", "Reason")}</TableHead>
                  <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archived.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium">
                      {candidate.full_name || 'Unnamed'}
                    </TableCell>
                    <TableCell>{candidate.email}</TableCell>
                    <TableCell>
                      {candidate.deleted_by_profile?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(candidate.deleted_at))} ago
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(candidate.deleted_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {candidate.applications?.[0]?.count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {candidate.deletion_reason || 'No reason provided'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(candidate.id, candidate.full_name || candidate.email)}
                        disabled={restoring === candidate.id}
                      >
                        {restoring === candidate.id ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="mr-2 h-3 w-3" />
                            Restore
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
