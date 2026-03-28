import { memo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAssessmentAssignments } from '@/hooks/useAssessmentAssignments';
import { AssessmentAssignment } from '@/types/assessment';
import { Search, Bell, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from 'react-i18next';

export const AssignmentTrackingTab = memo(() => {
  const { getAssignments, sendReminder } = useAssessmentAssignments();
  const [assignments, setAssignments] = useState<AssessmentAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { t } = useTranslation('admin');

  useEffect(() => {
    loadAssignments();
  }, [statusFilter]);

  const loadAssignments = async () => {
    const filters: any = {};
    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }
    const { data } = await getAssignments(filters);
    if (data) {
      setAssignments(data);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const isOverdue = (assignment: AssessmentAssignment) => {
    if (!assignment.due_date) return false;
    return new Date(assignment.due_date) < new Date() && assignment.status === 'pending';
  };

  const filteredAssignments = assignments.filter(assignment =>
    searchQuery === '' || 
    assignment.assessment_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('assignmentTracking.searchPlaceholder', 'Search by assessment name...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'in_progress', 'completed', 'expired'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status === 'all' ? t('assignmentTracking.all', 'All') : status.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('assignmentTracking.title', 'Assignment Tracking')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('assignmentTracking.assessment', 'Assessment')}</TableHead>
                <TableHead>{t('assignmentTracking.assignedDate', 'Assigned Date')}</TableHead>
                <TableHead>{t('assignmentTracking.dueDate', 'Due Date')}</TableHead>
                <TableHead>{t('assignmentTracking.status', 'Status')}</TableHead>
                <TableHead>{t('assignmentTracking.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('assignmentTracking.noAssignments', 'No assignments found')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id} className={isOverdue(assignment) ? 'bg-destructive/10' : ''}>
                    <TableCell className="font-medium">
                      {assignment.assessment_id}
                      {assignment.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{assignment.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {assignment.due_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                          {isOverdue(assignment) && (
                            <Badge variant="destructive">{t('assignmentTracking.overdue', 'Overdue')}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t('assignmentTracking.noDeadline', 'No deadline')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(assignment.status)} className="capitalize">
                        {assignment.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {assignment.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminder(assignment.id)}
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                        )}
                        {assignment.status === 'completed' && assignment.result_id && (
                          <Button
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
});

AssignmentTrackingTab.displayName = 'AssignmentTrackingTab';
