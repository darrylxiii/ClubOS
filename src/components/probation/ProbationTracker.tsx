import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Bell,
  Calendar,
  Building2,
  Loader2,
} from 'lucide-react';
import { useProbationAlerts, useAcknowledgeProbationAlert, useUpdateProbationStatus, useProbationStats } from '@/hooks/useProbationAlerts';
import { format, differenceInDays } from 'date-fns';

interface ProbationTrackerProps {
  companyId?: string;
}

export function ProbationTracker({ companyId }: ProbationTrackerProps) {
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'passed' | 'failed' | 'extended'>('passed');

  const { data: alerts, isLoading } = useProbationAlerts({ companyId, acknowledged: false });
  const { data: stats } = useProbationStats();
  const acknowledgeAlert = useAcknowledgeProbationAlert();
  const updateProbationStatus = useUpdateProbationStatus();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case '30_days':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case '14_days':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case '7_days':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'ending_today':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case '30_days':
        return 'secondary';
      case '14_days':
        return 'outline';
      case '7_days':
        return 'default';
      case 'ending_today':
      case 'expired':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeAlert.mutateAsync({ alertId, notes });
    setSelectedAlert(null);
    setNotes('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedAlert) return;
    await updateProbationStatus.mutateAsync({
      applicationId: selectedAlert.application_id,
      status: selectedStatus,
    });
    await acknowledgeAlert.mutateAsync({ alertId: selectedAlert.id, notes });
    setActionDialogOpen(false);
    setSelectedAlert(null);
    setNotes('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.active || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.endingSoon || 0}</p>
                <p className="text-xs text-muted-foreground">Ending Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.passed || 0}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.failed || 0}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <RefreshCw className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.extended || 0}</p>
                <p className="text-xs text-muted-foreground">Extended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Probation Alerts
          </CardTitle>
          <CardDescription>
            Monitor guarantee periods and take action before they expire
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!alerts?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No active probation alerts</p>
              <p className="text-sm">All guarantee periods are on track</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const daysRemaining = alert.probation_end_date
                  ? differenceInDays(new Date(alert.probation_end_date), new Date())
                  : 0;
                const progress = Math.max(0, Math.min(100, ((90 - daysRemaining) / 90) * 100));

                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {alert.candidate_name?.substring(0, 2).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium">{alert.candidate_name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {alert.company_name}
                            <span className="text-muted-foreground/50">•</span>
                            {alert.job_title}
                          </div>
                        </div>
                        <Badge variant={getAlertBadgeColor(alert.alert_type) as any}>
                          {getAlertIcon(alert.alert_type)}
                          <span className="ml-1">
                            {alert.alert_type.replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Ends: {alert.probation_end_date && format(new Date(alert.probation_end_date), 'MMM d, yyyy')}
                          </span>
                          <span className={daysRemaining <= 7 ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                            {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAlert(alert);
                            handleAcknowledge(alert.id);
                          }}
                          disabled={acknowledgeAlert.isPending}
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setActionDialogOpen(true);
                          }}
                        >
                          Take Action
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Probation Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Status</label>
              <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Passed - Guarantee cleared
                    </div>
                  </SelectItem>
                  <SelectItem value="failed">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Failed - Initiate replacement
                    </div>
                  </SelectItem>
                  <SelectItem value="extended">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-purple-500" />
                      Extended - More time needed
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateProbationStatus.isPending}
            >
              {updateProbationStatus.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
