import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { getInitials } from "@/lib/strings";

interface Application {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  current_title?: string | null;
  desired_salary_min?: number | null;
  desired_salary_max?: number | null;
  application_status: string | null;
  created_at: string;
  remote_preference?: string | null;
  user_id?: string | null;
  email_verified?: boolean | null;
}

interface ApplicationsTableProps {
  applications: Application[];
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onViewDetails: (application: Application) => void;
  onQuickApprove: (application: Application) => void;
  onQuickReject: (application: Application) => void;
}

export function ApplicationsTable({
  applications,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onViewDetails,
  onQuickApprove,
  onQuickReject
}: ApplicationsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: applications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      applied: { 
        label: 'Pending', 
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' 
      },
      approved: { 
        label: 'Approved', 
        className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
      },
      rejected: { 
        label: 'Rejected', 
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
      }
    };
    
    const variant = variants[status] || variants.applied;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Not specified';
    if (min && max) return `€${(min / 1000).toFixed(0)}k - €${(max / 1000).toFixed(0)}k`;
    if (min) return `€${(min / 1000).toFixed(0)}k+`;
    return `Up to €${(max! / 1000).toFixed(0)}k`;
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    if (phone.length < 6) return phone;
    return phone.slice(0, 3) + '***' + phone.slice(-3);
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-lg text-muted-foreground">No applications found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Adjust your filters or wait for new submissions
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedIds.length === applications.length && applications.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Candidate</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Current Role</TableHead>
            <TableHead>Desired Salary</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
      
      {/* Virtualized table body */}
      <div
        ref={parentRef}
        className="max-h-[500px] overflow-y-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const app = applications[virtualRow.index];
            const hasAccount = !!(app.user_id || app.email_verified);
            const accountStatusBadge = hasAccount 
              ? null
              : <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] ml-2">Pending</Badge>;
            
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div 
                  className="flex items-center cursor-pointer hover:bg-muted/50 border-b px-4 py-3"
                  onClick={() => onViewDetails(app)}
                >
                  <div className="w-[50px]" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(app.id)}
                      onCheckedChange={(checked) => onSelectOne(app.id, checked as boolean)}
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(app.full_name || app.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{app.full_name || app.email || 'Unknown'}</span>
                      {accountStatusBadge}
                    </div>
                  </div>
                  <div className="w-[150px]">
                    <div className="text-sm">{app.email}</div>
                    <div className="text-xs text-muted-foreground">{maskPhone(app.phone ?? '')}</div>
                  </div>
                  <div className="w-[150px] truncate text-sm">
                    {app.current_title || 'Not specified'}
                  </div>
                  <div className="w-[120px] text-sm">
                    {formatSalary(app.desired_salary_min ?? undefined, app.desired_salary_max ?? undefined)}
                  </div>
                  <div className="w-[100px] text-sm">
                    {formatDistanceToNow(new Date(app.created_at ?? new Date()), { addSuffix: true })}
                  </div>
                  <div className="w-[100px]">
                    {getStatusBadge(app.application_status ?? 'applied')}
                  </div>
                  <div className="w-[150px] flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => onViewDetails(app)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {app.application_status === 'applied' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => onQuickApprove(app)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => onQuickReject(app)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
