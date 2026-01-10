import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileCheck, Clock, CheckCircle2, XCircle, 
  Download, User, Calendar, MessageSquare 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ExportRequest {
  id: string;
  requested_by: string;
  kpi_names: string[];
  format: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  created_at: string;
  requester_name?: string;
}

export function KPIExportApprovalWorkflow() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ExportRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['kpi-export-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_export_approvals')
        .select(`
          *,
          profiles:requested_by(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((req: any) => ({
        ...req,
        requester_name: req.profiles?.full_name || 'Unknown User'
      })) as ExportRequest[];
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('kpi_export_approvals')
        .update({
          status,
          reviewed_by: user.id,
          review_notes: notes || null,
          reviewed_at: new Date().toISOString(),
          expires_at: status === 'approved' 
            ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
            : null
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpi-export-requests'] });
      setSelectedRequest(null);
      setReviewNotes('');
      setActionType(null);
      toast.success(`Export request ${variables.status}`);
    },
    onError: (error) => {
      toast.error('Failed to process request: ' + error.message);
    }
  });

  const handleReview = (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    reviewMutation.mutate({
      id: selectedRequest.id,
      status,
      notes: reviewNotes
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      approved: 'bg-green-500/10 text-green-600 border-green-500/30',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/30'
    };

    return (
      <Badge variant="outline" className={`capitalize ${variants[status]}`}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-accent" />
              Export Approval Queue
            </CardTitle>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingRequests.length} pending
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No export requests
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Requests for sensitive KPI exports will appear here
              </p>
            </div>
          ) : (
            <>
              {/* Pending requests */}
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Approval ({pendingRequests.length})
                  </h3>
                  {pendingRequests.map(request => (
                    <div 
                      key={request.id}
                      className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 cursor-pointer hover:bg-yellow-500/10 transition-colors"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{request.requester_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {request.kpi_names.slice(0, 3).map(name => (
                          <Badge key={name} variant="secondary" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                        {request.kpi_names.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{request.kpi_names.length - 3} more
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground uppercase">{request.format}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Processed requests */}
              {processedRequests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Recent Activity
                  </h3>
                  {processedRequests.slice(0, 5).map(request => (
                    <div 
                      key={request.id}
                      className="p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{request.requester_name}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {request.kpi_names.length} KPI(s)
                          </span>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Export Request</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedRequest.requester_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedRequest.created_at).toLocaleString()}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Requested KPIs</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedRequest.kpi_names.map(name => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Format: <strong className="uppercase">{selectedRequest.format}</strong></span>
              </div>

              {selectedRequest.reason && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Reason
                  </h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {selectedRequest.reason}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Review Notes (optional)</h4>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="border-red-500/50 text-red-600 hover:bg-red-500/10"
                  onClick={() => handleReview('rejected')}
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleReview('approved')}
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
