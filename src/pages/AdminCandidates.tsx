import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Filter, Users } from "lucide-react";
import { adminCandidateService } from "@/services/adminCandidateService";
import { UnifiedCandidateCard } from "@/components/admin/UnifiedCandidateCard";
import { MergeStatusDashboard } from "@/components/admin/MergeStatusDashboard";
import { toast } from "sonner";

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [mergeStatusFilter, setMergeStatusFilter] = useState<string>("all");
  const [completenessFilter, setCompletenessFilter] = useState<string>("all");

  useEffect(() => {
    loadCandidates();
  }, [mergeStatusFilter, completenessFilter]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (mergeStatusFilter !== "all") filters.mergeStatus = mergeStatusFilter;
      if (completenessFilter !== "all") filters.minCompleteness = parseInt(completenessFilter);

      const { data, error } = await adminCandidateService.getAllCandidates(filters);
      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(c =>
    !searchTerm || 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = async () => {
    const ids = filteredCandidates.map(c => c.id);
    const { data, error } = await adminCandidateService.exportCandidatesCSV(ids);
    if (error) {
      toast.error('Export failed');
      return;
    }
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exported successfully');
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">All Candidates</h1>
            <p className="text-muted-foreground mt-2">
              Unified view of all candidate profiles and user data
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            {filteredCandidates.length} candidates
          </Badge>
        </div>

        <MergeStatusDashboard />

        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={mergeStatusFilter} onValueChange={setMergeStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Merge Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="merged">Merged</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="unlinked">Unlinked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={completenessFilter} onValueChange={setCompletenessFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Completeness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="80">80%+</SelectItem>
                  <SelectItem value="50">50%+</SelectItem>
                  <SelectItem value="0">0%+</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCandidates.map((candidate) => (
              <UnifiedCandidateCard
                key={candidate.id}
                candidate={candidate}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
