import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTrainingRecords, useCreateTrainingRecord } from "@/hooks/usePerformanceReviews";
import { useAllEmployees } from "@/hooks/useEmployeeProfile";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { 
  GraduationCap, 
  Plus, 
  Loader2,
  Award,
  AlertTriangle,
  ExternalLink,
  CheckCircle2
} from "lucide-react";

export function TrainingRecordsPanel() {
  const { data: records, isLoading } = useTrainingRecords();
  const { data: employees } = useAllEmployees();
  const createRecord = useCreateTrainingRecord();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    employee_id: '',
    training_name: '',
    training_type: 'certification',
    provider: '',
    completion_date: '',
    expiry_date: '',
    certificate_url: '',
    status: 'not_started',
  });

  const handleCreate = async () => {
    if (!newRecord.employee_id || !newRecord.training_name) {
      toast.error('Please fill in required fields');
      return;
    }
    try {
      await createRecord.mutateAsync(newRecord);
      setIsOpen(false);
      setNewRecord({
        employee_id: '',
        training_name: '',
        training_type: 'certification',
        provider: '',
        completion_date: '',
        expiry_date: '',
        certificate_url: '',
        status: 'not_started',
      });
      toast.success('Training record added');
    } catch (error) {
      toast.error('Failed to add record');
    }
  };

  const getStatusBadge = (status: string, expiryDate?: string | null) => {
    if (expiryDate && differenceInDays(new Date(expiryDate), new Date()) < 30) {
      return 'bg-amber-500/10 text-amber-500';
    }
    const styles: Record<string, string> = {
      not_started: 'bg-gray-500/10 text-gray-500',
      in_progress: 'bg-blue-500/10 text-blue-500',
      completed: 'bg-green-500/10 text-green-500',
      expired: 'bg-red-500/10 text-red-500',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const getExpiryWarning = (expiryDate?: string | null) => {
    if (!expiryDate) return null;
    const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date());
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry < 30) return `Expires in ${daysUntilExpiry} days`;
    return null;
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Training & Certifications
            </CardTitle>
            <CardDescription>
              Track employee training and certification status
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Training
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Training Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select
                    value={newRecord.employee_id}
                    onValueChange={(v) => setNewRecord(prev => ({ ...prev, employee_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.profile?.full_name || 'Employee'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Training Name *</Label>
                    <Input
                      value={newRecord.training_name}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, training_name: e.target.value }))}
                      placeholder="e.g. GDPR Compliance"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newRecord.training_type}
                      onValueChange={(v) => setNewRecord(prev => ({ ...prev, training_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="certification">Certification</SelectItem>
                        <SelectItem value="course">Course</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Input
                    value={newRecord.provider}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, provider: e.target.value }))}
                    placeholder="e.g. LinkedIn Learning"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Completion Date</Label>
                    <Input
                      type="date"
                      value={newRecord.completion_date}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, completion_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={newRecord.expiry_date}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, expiry_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newRecord.status}
                    onValueChange={(v) => setNewRecord(prev => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Certificate URL</Label>
                  <Input
                    type="url"
                    value={newRecord.certificate_url}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, certificate_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>

                <Button 
                  onClick={handleCreate} 
                  className="w-full"
                  disabled={createRecord.isPending}
                >
                  {createRecord.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Add Record
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !records?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No training records yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {records.map(record => {
              const expiryWarning = getExpiryWarning(record.expiry_date);
              return (
                <div 
                  key={record.id}
                  className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg"
                >
                  <div className={`p-2 rounded-full ${
                    record.status === 'completed' 
                      ? 'bg-green-500/10' 
                      : 'bg-muted'
                  }`}>
                    {record.status === 'completed' ? (
                      <Award className="h-5 w-5 text-green-500" />
                    ) : (
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{record.training_name}</span>
                      <Badge className={getStatusBadge(record.status, record.expiry_date)}>
                        {record.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span>{record.training_type}</span>
                      {record.provider && <span>• {record.provider}</span>}
                      {record.completion_date && (
                        <span>• Completed {format(new Date(record.completion_date), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                    {expiryWarning && (
                      <div className="flex items-center gap-1 text-amber-500 text-sm mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        {expiryWarning}
                      </div>
                    )}
                  </div>
                  {record.certificate_url && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => window.open(record.certificate_url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
