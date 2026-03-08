import { useMemo, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useReviewQueue } from '@/hooks/useReviewQueue';

interface InternalReviewPanelProps {
  jobId: string;
}

export const InternalReviewPanel = ({ jobId }: InternalReviewPanelProps) => {
  const {
    internalPending,
    isLoading,
    approveInternalMutation,
    rejectInternalMutation,
  } = useReviewQueue(jobId);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkNotes, setBulkNotes] = useState('');

  const selectedApplications = useMemo(
    () => internalPending.filter((application) => selectedIds.includes(application.id)),
    [internalPending, selectedIds],
  );

  const isSubmitting = approveInternalMutation.isPending || rejectInternalMutation.isPending;

  const allSelected = internalPending.length > 0 && selectedIds.length === internalPending.length;

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? internalPending.map((application) => application.id) : []);
  };

  const toggleOne = (applicationId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, applicationId] : prev.filter((id) => id !== applicationId),
    );
  };

  const runBulkApprove = async () => {
    if (selectedApplications.length === 0) {
      toast.error('Select at least one candidate first.');
      return;
    }

    await Promise.all(
      selectedApplications.map((application) =>
        approveInternalMutation.mutateAsync({
          application,
          notes: bulkNotes.trim() || undefined,
        }),
      ),
    );

    setSelectedIds([]);
    setBulkNotes('');
  };

  const runBulkReject = async () => {
    if (selectedApplications.length === 0) {
      toast.error('Select at least one candidate first.');
      return;
    }

    if (!bulkNotes.trim()) {
      toast.error('Add a rejection note before bulk reject.');
      return;
    }

    await Promise.all(
      selectedApplications.map((application) =>
        rejectInternalMutation.mutateAsync({
          application,
          notes: bulkNotes.trim(),
        }),
      ),
    );

    setSelectedIds([]);
    setBulkNotes('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (internalPending.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Internal Review</CardTitle>
          <CardDescription>All candidates have been reviewed.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Internal Review Queue
          <Badge variant="secondary">{internalPending.length} pending</Badge>
        </CardTitle>
        <CardDescription>Pre-screen candidates before partner visibility.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border p-3 space-y-3">
          <Textarea
            value={bulkNotes}
            onChange={(event) => setBulkNotes(event.target.value)}
            placeholder="Review notes (required for reject, optional for approve)"
            className="min-h-20"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={runBulkApprove} disabled={isSubmitting}>
              <Check className="h-4 w-4 mr-1" />
              Approve Selected
            </Button>
            <Button variant="outline" onClick={runBulkReject} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-1" />
              Reject Selected
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                    aria-label="Select all candidates"
                  />
                </TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {internalPending.map((application) => {
                const checked = selectedIds.includes(application.id);

                return (
                  <TableRow key={application.id}>
                    <TableCell>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleOne(application.id, Boolean(value))}
                        aria-label={`Select ${application.candidateName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{application.candidateName}</div>
                      <div className="text-xs text-muted-foreground">{application.companyName}</div>
                    </TableCell>
                    <TableCell>{application.candidateTitle || '—'}</TableCell>
                    <TableCell>
                      {application.matchScore !== null ? `${application.matchScore}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            approveInternalMutation.mutate({
                              application,
                              notes: bulkNotes.trim() || undefined,
                            })
                          }
                          disabled={isSubmitting}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const note = window.prompt('Rejection note');
                            if (!note?.trim()) {
                              toast.error('Rejection note is required.');
                              return;
                            }

                            rejectInternalMutation.mutate({
                              application,
                              notes: note.trim(),
                            });
                          }}
                          disabled={isSubmitting}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
