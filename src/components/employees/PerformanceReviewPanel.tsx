import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  usePerformanceReviews, 
  useCreatePerformanceReview, 
  useUpdatePerformanceReview 
} from "@/hooks/usePerformanceReviews";
import { useAllEmployees } from "@/hooks/useEmployeeProfile";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  ClipboardCheck, 
  Plus, 
  Star,
  Loader2,
  CheckCircle2,
  Clock,
  FileEdit
} from "lucide-react";

export function PerformanceReviewPanel() {
  const { data: reviews, isLoading } = usePerformanceReviews();
  const { data: employees } = useAllEmployees();
  const createReview = useCreatePerformanceReview();
  const updateReview = useUpdatePerformanceReview();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newReview, setNewReview] = useState({
    employee_id: '',
    review_period: 'Q4 2024',
    overall_rating: 0,
    strengths: '',
    areas_for_improvement: '',
    goals: '',
    comments: '',
  });

  const handleCreate = async () => {
    if (!newReview.employee_id) {
      toast.error('Please select an employee');
      return;
    }
    try {
      await createReview.mutateAsync(newReview);
      setIsOpen(false);
      setNewReview({
        employee_id: '',
        review_period: 'Q4 2024',
        overall_rating: 0,
        strengths: '',
        areas_for_improvement: '',
        goals: '',
        comments: '',
      });
      toast.success('Performance review created');
    } catch (error) {
      toast.error('Failed to create review');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await updateReview.mutateAsync({
        id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      toast.success('Review marked as completed');
    } catch (error) {
      toast.error('Failed to update review');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-500/10 text-gray-500',
      pending: 'bg-amber-500/10 text-amber-500',
      completed: 'bg-green-500/10 text-green-500',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <FileEdit className="h-4 w-4" />;
    }
  };

  const renderStars = (rating: number | null) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              rating && star <= rating 
                ? 'fill-amber-500 text-amber-500' 
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Performance Reviews
            </CardTitle>
            <CardDescription>
              Manage employee performance review cycles
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Performance Review</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select
                    value={newReview.employee_id}
                    onValueChange={(v) => setNewReview(prev => ({ ...prev, employee_id: v }))}
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
                    <Label>Review Period</Label>
                    <Input
                      value={newReview.review_period}
                      onChange={(e) => setNewReview(prev => ({ ...prev, review_period: e.target.value }))}
                      placeholder="e.g. Q4 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overall Rating (1-5)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={newReview.overall_rating || ''}
                      onChange={(e) => setNewReview(prev => ({ ...prev, overall_rating: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Strengths</Label>
                  <Textarea
                    value={newReview.strengths}
                    onChange={(e) => setNewReview(prev => ({ ...prev, strengths: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Areas for Improvement</Label>
                  <Textarea
                    value={newReview.areas_for_improvement}
                    onChange={(e) => setNewReview(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Goals for Next Period</Label>
                  <Textarea
                    value={newReview.goals}
                    onChange={(e) => setNewReview(prev => ({ ...prev, goals: e.target.value }))}
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleCreate} 
                  className="w-full"
                  disabled={createReview.isPending}
                >
                  {createReview.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Review
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
        ) : !reviews?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No performance reviews yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <div 
                key={review.id}
                className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg"
              >
                <div className={`p-2 rounded-full ${getStatusBadge(review.status)}`}>
                  {getStatusIcon(review.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{review.review_period}</span>
                    <Badge className={getStatusBadge(review.status)}>
                      {review.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {renderStars(review.overall_rating)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(review.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                {review.status !== 'completed' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleComplete(review.id)}
                  >
                    Complete
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
