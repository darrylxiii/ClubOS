import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAssessmentAssignments } from '@/hooks/useAssessmentAssignments';
import { supabase } from '@/integrations/supabase/client';
import { ASSESSMENTS } from '@/data/assessments';
import { Search, Send, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const SendAssessmentsTab = memo(() => {
  const { createAssignment, loading } = useAssessmentAssignments();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadCandidates();
  }, [searchQuery]);

  const loadCandidates = async () => {
    try {
      let query = supabase
        .from('candidate_profiles')
        .select('user_id, full_name, current_title, avatar_url')
        .order('full_name');

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,current_title.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const toggleCandidate = (userId: string) => {
    setSelectedCandidates(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleAssessment = (assessmentId: string) => {
    setSelectedAssessments(prev =>
      prev.includes(assessmentId) ? prev.filter(id => id !== assessmentId) : [...prev, assessmentId]
    );
  };

  const handleSend = async () => {
    if (selectedCandidates.length === 0) {
      toast({
        title: 'No candidates selected',
        description: 'Please select at least one candidate',
        variant: 'destructive',
      });
      return;
    }

    if (selectedAssessments.length === 0) {
      toast({
        title: 'No assessments selected',
        description: 'Please select at least one assessment',
        variant: 'destructive',
      });
      return;
    }

    const promises = selectedAssessments.map(assessmentId =>
      createAssignment({
        assessment_id: assessmentId,
        assessment_type: 'built-in',
        assigned_to: selectedCandidates,
        due_date: dueDate || undefined,
        notes: notes || undefined,
      })
    );

    await Promise.all(promises);

    // Reset form
    setSelectedCandidates([]);
    setSelectedAssessments([]);
    setDueDate('');
    setNotes('');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Select Candidates</CardTitle>
          <CardDescription>Choose who should receive the assessments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {candidates.map((candidate) => (
              <div
                key={candidate.user_id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                onClick={() => toggleCandidate(candidate.user_id)}
              >
                <Checkbox
                  checked={selectedCandidates.includes(candidate.user_id)}
                  onCheckedChange={() => toggleCandidate(candidate.user_id)}
                />
                <div className="flex-1">
                  <p className="font-medium">{candidate.full_name}</p>
                  <p className="text-sm text-muted-foreground">{candidate.current_title}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {selectedCandidates.length} candidate(s) selected
          </p>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Assessments</CardTitle>
            <CardDescription>Choose which assessments to assign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ASSESSMENTS.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                  onClick={() => toggleAssessment(assessment.id)}
                >
                  <Checkbox
                    checked={selectedAssessments.includes(assessment.id)}
                    onCheckedChange={() => toggleAssessment(assessment.id)}
                  />
                  <div className="text-2xl">{assessment.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium">{assessment.name}</p>
                    <p className="text-sm text-muted-foreground">{assessment.estimatedTime} min</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {selectedAssessments.length} assessment(s) selected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="due-date">Due Date (Optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes for Candidates (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="E.g., 'Complete this for the Product Manager role'"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={loading || selectedCandidates.length === 0 || selectedAssessments.length === 0}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              Send {selectedAssessments.length} Assessment(s) to {selectedCandidates.length} Candidate(s)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

SendAssessmentsTab.displayName = 'SendAssessmentsTab';
