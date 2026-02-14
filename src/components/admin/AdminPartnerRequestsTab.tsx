import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AdminPartnerRequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data } = await supabase
        .from('partner_requests')
        .select('*')
        .order('created_at', { ascending: false });

      setRequests(data || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, contactEmail: string) => {
    setProvisioning(requestId);
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('approve-partner-request', {
        body: {
          requestId,
          approvedBy: user?.user?.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success(`Partner ${contactEmail} provisioned successfully`);
      loadRequests();
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to provision partner');
    } finally {
      setProvisioning(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('partner_requests')
        .update({
          status: 'declined',
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request declined');
      loadRequests();
    } catch (error) {
      console.error('Decline error:', error);
      toast.error('Failed to decline request');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-error" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">No partner requests</p>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.contact_name}</TableCell>
                  <TableCell>{request.contact_email}</TableCell>
                  <TableCell>{request.company_name || '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status === 'approved'
                          ? 'default'
                          : request.status === 'declined'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="gap-1"
                    >
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(request.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === 'pending' ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(request.id, request.contact_email)}
                          disabled={provisioning === request.id}
                          className="gap-1"
                        >
                          {provisioning === request.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Provisioning...
                            </>
                          ) : (
                            'Approve'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDecline(request.id)}
                          disabled={provisioning === request.id}
                        >
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {request.status === 'approved' ? 'Provisioned' : 'Declined'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
