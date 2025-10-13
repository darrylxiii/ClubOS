import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/contexts/RoleContext';
import { formatDistanceToNow } from 'date-fns';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  MessageSquare, 
  TrendingDown, 
  TrendingUp,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Feedback {
  id: string;
  user_id: string;
  email: string;
  role: string;
  rating: number;
  comment: string | null;
  page_path: string;
  page_title: string;
  navigation_trail: any;
  is_reviewed: boolean;
  admin_notes: string | null;
  submitted_at: string;
}

const FeedbackDatabase = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [reviewedFilter, setReviewedFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { currentRole } = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentRole !== 'admin') {
      navigate('/home');
      return;
    }
    loadFeedback();
  }, [currentRole, navigate]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_feedback')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
      setFilteredFeedback(data || []);
    } catch (error: any) {
      console.error('Error loading feedback:', error);
      toast({
        title: 'Failed to load feedback',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = feedback;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.page_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.comment?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'low') {
        filtered = filtered.filter((f) => f.rating <= 5);
      } else if (ratingFilter === 'high') {
        filtered = filtered.filter((f) => f.rating > 7);
      }
    }

    // Reviewed filter
    if (reviewedFilter !== 'all') {
      filtered = filtered.filter((f) => f.is_reviewed === (reviewedFilter === 'reviewed'));
    }

    setFilteredFeedback(filtered);
  }, [searchTerm, ratingFilter, reviewedFilter, feedback]);

  const getRatingColor = (rating: number) => {
    if (rating <= 3) return 'destructive';
    if (rating <= 5) return 'secondary';
    if (rating <= 7) return 'secondary';
    return 'default';
  };

  const getRatingBadge = (rating: number) => {
    return (
      <Badge variant={getRatingColor(rating) as any} className="font-bold">
        {rating}/10
      </Badge>
    );
  };

  const handleViewDetails = (item: Feedback) => {
    setSelectedFeedback(item);
    setAdminNotes(item.admin_notes || '');
  };

  const handleMarkReviewed = async (feedbackId: string, isReviewed: boolean) => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ is_reviewed: isReviewed })
        .eq('id', feedbackId);

      if (error) throw error;

      toast({
        title: isReviewed ? 'Marked as reviewed' : 'Marked as unreviewed',
      });
      loadFeedback();
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      toast({
        title: 'Failed to update',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedFeedback) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({
          admin_notes: adminNotes.trim() || null,
          is_reviewed: true,
        })
        .eq('id', selectedFeedback.id);

      if (error) throw error;

      toast({
        title: 'Notes saved',
        description: 'Admin notes have been updated.',
      });
      setSelectedFeedback(null);
      loadFeedback();
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Failed to save notes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const stats = {
    total: feedback.length,
    avgRating: feedback.length > 0
      ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
      : '0',
    lowRatings: feedback.filter((f) => f.rating <= 5).length,
    pending: feedback.filter((f) => !f.is_reviewed).length,
  };

  if (currentRole !== 'admin') return null;

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Feedback Database</h1>
          <p className="text-muted-foreground">View and manage user feedback across all pages</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRating}/10</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Low Ratings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.lowRatings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email, page, or comment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="low">Low (≤5)</SelectItem>
                    <SelectItem value="high">High (&gt;7)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={reviewedFilter} onValueChange={setReviewedFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredFeedback.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No feedback found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedback.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDistanceToNow(new Date(item.submitted_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.email}</div>
                          <Badge variant="outline" className="text-xs">
                            {item.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.page_title}</div>
                        <div className="text-xs text-muted-foreground">{item.page_path}</div>
                      </TableCell>
                      <TableCell>{getRatingBadge(item.rating)}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{item.comment || '—'}</p>
                      </TableCell>
                      <TableCell>
                        {item.is_reviewed ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Reviewed
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewDetails(item)}>
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant={item.is_reviewed ? 'ghost' : 'default'}
                            onClick={() => handleMarkReviewed(item.id, !item.is_reviewed)}
                          >
                            {item.is_reviewed ? 'Unmark' : 'Mark'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              View complete feedback and navigation trail
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User</label>
                  <p className="text-sm">{selectedFeedback.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="text-sm capitalize">{selectedFeedback.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Page</label>
                  <p className="text-sm font-medium">{selectedFeedback.page_title}</p>
                  <p className="text-xs text-muted-foreground">{selectedFeedback.page_path}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(selectedFeedback.submitted_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rating</label>
                <div className="mt-2">{getRatingBadge(selectedFeedback.rating)}</div>
              </div>

              {/* Comment */}
              {selectedFeedback.comment && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Comment</label>
                  <p className="mt-2 text-sm p-4 bg-muted rounded-lg">{selectedFeedback.comment}</p>
                </div>
              )}

              {/* Navigation Trail */}
              {selectedFeedback.navigation_trail && selectedFeedback.navigation_trail.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Journey</label>
                  <div className="mt-2 space-y-2">
                    {selectedFeedback.navigation_trail.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <div className="flex-1 p-2 bg-muted rounded">
                          <div className="font-medium">{entry.title}</div>
                          <div className="text-xs text-muted-foreground">{entry.route}</div>
                        </div>
                        {index < selectedFeedback.navigation_trail.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this feedback..."
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
              Close
            </Button>
            <Button onClick={handleSaveNotes} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Mark Reviewed'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default FeedbackDatabase;
