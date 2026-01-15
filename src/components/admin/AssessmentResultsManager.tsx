import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Search, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { notify } from '@/lib/notify';

interface AssessmentResult {
  id: string;
  user_id: string;
  assessment_id: string;
  assessment_name: string;
  assessment_type: string;
  results_data: any;
  score: number | null;
  completed_at: string;
  user_name?: string;
  user_email?: string;
}

export const AssessmentResultsManager = () => {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    filterResults();
  }, [searchTerm, typeFilter, results]);

  const fetchResults = async () => {
    try {
      const { data: resultsData, error: resultsError } = await supabase
        .from('assessment_results')
        .select('*')
        .order('completed_at', { ascending: false });

      if (resultsError) throw resultsError;

      // Fetch user profiles separately
      const userIds = [...new Set(resultsData?.map((r) => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const enrichedResults = resultsData?.map((result) => ({
        ...result,
        user_name: profileMap.get(result.user_id)?.full_name ?? undefined,
        user_email: profileMap.get(result.user_id)?.email ?? undefined,
      })) || [];

      setResults(enrichedResults);
    } catch (error: any) {
      notify.error('Error', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    let filtered = results;

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.assessment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((r) => r.assessment_type === typeFilter);
    }

    setFilteredResults(filtered);
  };

  const exportToCSV = () => {
    const headers = ['User Name', 'Email', 'Assessment', 'Type', 'Score', 'Completed At'];
    const rows = filteredResults.map((r) => [
      r.user_name || 'N/A',
      r.user_email || 'N/A',
      r.assessment_name,
      r.assessment_type,
      r.score?.toString() || 'N/A',
      format(new Date(r.completed_at), 'yyyy-MM-dd HH:mm'),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-results-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const categoryColors: Record<string, string> = {
    personality: 'bg-purple-500',
    skills: 'bg-blue-500',
    culture: 'bg-green-500',
    technical: 'bg-orange-500',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Assessment Results</CardTitle>
          <CardDescription>
            View and analyze all user assessment results ({results.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or assessment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="personality">Personality</SelectItem>
                <SelectItem value="skills">Skills</SelectItem>
                <SelectItem value="culture">Culture</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{result.user_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{result.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{result.assessment_name}</TableCell>
                      <TableCell>
                        <Badge className={categoryColors[result.assessment_type] || 'bg-gray-500'}>
                          {result.assessment_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {result.score ? `${Math.round(result.score)}%` : 'N/A'}
                      </TableCell>
                      <TableCell>{format(new Date(result.completed_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedResult(result)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedResult?.assessment_name} Results</DialogTitle>
            <DialogDescription>
              Completed by {selectedResult?.user_name || 'Unknown'} on{' '}
              {selectedResult && format(new Date(selectedResult.completed_at), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedResult?.score && (
              <div>
                <h4 className="font-semibold mb-2">Overall Score</h4>
                <p className="text-2xl font-bold">{Math.round(selectedResult.score)}%</p>
              </div>
            )}
            <div>
              <h4 className="font-semibold mb-2">Detailed Results</h4>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(selectedResult?.results_data, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
