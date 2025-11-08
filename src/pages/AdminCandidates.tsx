import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, Filter, Users, Grid3x3, Table as TableIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { adminCandidateService } from "@/services/adminCandidateService";
import { UnifiedCandidateCard } from "@/components/admin/UnifiedCandidateCard";
import { CandidatesTable } from "@/components/admin/CandidatesTable";
import { BulkActionsToolbar } from "@/components/admin/BulkActionsToolbar";
import { MergeStatusDashboard } from "@/components/admin/MergeStatusDashboard";
import { toast } from "sonner";

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [mergeStatusFilter, setMergeStatusFilter] = useState<string>("all");
  const [completenessFilter, setCompletenessFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [strategists, setStrategists] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [experienceRange, setExperienceRange] = useState<number[]>([0, 20]);
  const [salaryRange, setSalaryRange] = useState<number[]>([0, 300000]);

  useEffect(() => {
    loadCandidates();
    loadStrategists();
  }, [mergeStatusFilter, completenessFilter]);

  const loadStrategists = async () => {
    const { data, error } = await adminCandidateService.getStrategists();
    if (!error && data) {
      setStrategists(data);
    }
  };

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

  const filteredCandidates = candidates.filter(c => {
    // Search filter
    if (searchTerm && 
        !c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !c.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Experience filter
    const experience = c.years_of_experience || 0;
    if (experience < experienceRange[0] || experience > experienceRange[1]) {
      return false;
    }

    // Salary filter
    const salary = c.desired_salary_min || 0;
    if (salary < salaryRange[0] || salary > salaryRange[1]) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCandidates.length / perPage);
  const paginatedCandidates = filteredCandidates.slice(
    (page - 1) * perPage,
    page * perPage
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

  const handleSelectionChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedCandidates.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkAssignStrategist = async (strategistId: string) => {
    const { error } = await adminCandidateService.bulkAssignStrategist(selectedIds, strategistId);
    if (error) {
      toast.error('Failed to assign strategist');
    } else {
      toast.success(`Assigned strategist to ${selectedIds.length} candidates`);
      setSelectedIds([]);
      loadCandidates();
    }
  };

  const handleBulkSendInvitations = async () => {
    toast.info(`Sending invitations to ${selectedIds.length} candidates...`);
    // This would call the edge function
    setSelectedIds([]);
  };

  const handleExportSelected = async () => {
    const { data, error } = await adminCandidateService.exportCandidatesCSV(selectedIds);
    if (error) {
      toast.error('Export failed');
      return;
    }
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-candidates-${new Date().toISOString().split('T')[0]}.csv`;
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Search & Filter</CardTitle>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'table')}>
              <TabsList>
                <TabsTrigger value="grid">
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Grid
                </TabsTrigger>
                <TabsTrigger value="table">
                  <TableIcon className="w-4 h-4 mr-2" />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search and main filters */}
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
                Export All
              </Button>
            </div>

            {/* Advanced filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Years of Experience: {experienceRange[0]} - {experienceRange[1]}+
                </label>
                <Slider
                  value={experienceRange}
                  onValueChange={setExperienceRange}
                  min={0}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Salary Range: €{salaryRange[0].toLocaleString()} - €{salaryRange[1].toLocaleString()}
                </label>
                <Slider
                  value={salaryRange}
                  onValueChange={setSalaryRange}
                  min={0}
                  max={300000}
                  step={10000}
                  className="w-full"
                />
              </div>
            </div>

            {/* Results summary */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
              <div>
                Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredCandidates.length)} of {filteredCandidates.length} candidates
              </div>
              <Select value={perPage.toString()} onValueChange={(v) => {setPerPage(parseInt(v)); setPage(1);}}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid gap-4">
                {paginatedCandidates.map((candidate) => (
                  <UnifiedCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                  />
                ))}
              </div>
            ) : (
              <CandidatesTable
                candidates={paginatedCandidates}
                selectedIds={selectedIds}
                onSelectionChange={handleSelectionChange}
                onSelectAll={handleSelectAll}
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}

        <BulkActionsToolbar
          selectedCount={selectedIds.length}
          strategists={strategists}
          onAssignStrategist={handleBulkAssignStrategist}
          onSendInvitations={handleBulkSendInvitations}
          onExportSelected={handleExportSelected}
          onClearSelection={() => setSelectedIds([])}
        />
      </div>
    </AppLayout>
  );
}
