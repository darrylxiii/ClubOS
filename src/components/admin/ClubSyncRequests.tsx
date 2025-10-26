import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Building2, Briefcase, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClubSyncRequest {
  id: string;
  job_id: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'declined';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  admin_notes: string | null;
  job: {
    title: string;
    company: {
      name: string;
      logo_url: string | null;
    };
  };
  requester: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export const ClubSyncRequests = () => {
  const [requests, setRequests] = useState<ClubSyncRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ClubSyncRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'decline' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('club_sync_requests')
        .select(`
          *,
          job:jobs(
            title,
            company:companies(name, logo_url)
          ),
          requester:profiles!club_sync_requests_requested_by_fkey(
            full_name,
            email,
            avatar_url
          )
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data as any);
    } catch (error) {
      console.error('Error fetching Club Sync requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedRequest || !reviewAction) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newStatus = reviewAction === 'approve' ? 'approved' : 'declined';

      // Update club_sync_requests
      const { error: requestError } = await supabase
        .from('club_sync_requests')
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', selectedRequest.id);

      if (requestError) throw requestError;

      // If approved, update the job's club_sync_status
      if (reviewAction === 'approve') {
        const { error: jobError } = await supabase
          .from('jobs')
          .update({
            club_sync_status: 'accepted',
            club_sync_activated_at: new Date().toISOString(),
          })
          .eq('id', selectedRequest.job_id);

        if (jobError) throw jobError;
      } else {
        // If declined, set job status to declined
        const { error: jobError } = await supabase
          .from('jobs')
          .update({
            club_sync_status: 'declined',
          })
          .eq('id', selectedRequest.job_id);

        if (jobError) throw jobError;
      }

      // Send notification
      await supabase.functions.invoke('notify-club-sync-request', {
        body: {
          requestId: selectedRequest.id,
          action: newStatus,
        },
      });

      toast.success(`Request ${newStatus}`);
      setSelectedRequest(null);
      setReviewAction(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast.error('Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Declined</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Pending Requests ({pendingRequests.length})</h2>
        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No pending Club Sync requests
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="border-primary/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        {request.job.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {request.job.company.name}
                      </CardDescription>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Requested by {request.requester.full_name} on {new Date(request.requested_at).toLocaleDateString()}
                  </div>
                  {request.notes && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-1">Partner Notes:</p>
                      <p className="text-sm text-muted-foreground">{request.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setReviewAction('approve');
                      }}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setReviewAction('decline');
                      }}
                      className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Requests */}
      {reviewedRequests.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Reviews ({reviewedRequests.length})</h2>
          <div className="grid gap-4">
            {reviewedRequests.slice(0, 10).map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{request.job.title}</CardTitle>
                      <CardDescription>{request.job.company.name}</CardDescription>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                {request.admin_notes && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequest(null);
          setReviewAction(null);
          setAdminNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Decline'} Club Sync Request
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && `${selectedRequest.job.title} at ${selectedRequest.job.company.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin-notes">Admin Notes {reviewAction === 'decline' && '(Required for decline)'}</Label>
              <Textarea
                id="admin-notes"
                placeholder={reviewAction === 'approve' 
                  ? "Optional: Add notes for internal records"
                  : "Explain why this request is being declined"
                }
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setReviewAction(null);
                setAdminNotes('');
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={submitting || (reviewAction === 'decline' && !adminNotes.trim())}
              variant={reviewAction === 'approve' ? 'default' : 'outline'}
              className={reviewAction === 'decline' ? 'border-red-500 text-red-600 hover:bg-red-50' : ''}
            >
              {submitting ? 'Processing...' : reviewAction === 'approve' ? 'Approve' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
