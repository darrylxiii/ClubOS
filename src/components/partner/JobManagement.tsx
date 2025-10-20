import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Briefcase, MapPin, DollarSign, LayoutDashboard, Edit, Trash2 } from "lucide-react";
import { CreateJobDialog } from "./CreateJobDialog";
import { EditJobDialog } from "./EditJobDialog";

interface JobManagementProps {
  companyId: string;
}

export const JobManagement = ({ companyId }: JobManagementProps) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  useEffect(() => {
    fetchJobs();
  }, [companyId]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'published' && !jobs.find(j => j.id === jobId)?.published_at) {
        updateData.published_at = new Date().toISOString();
      } else if (newStatus === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) throw error;
      
      toast.success(`Job ${newStatus}`);
      fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error("Failed to update job status");
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
      
      toast.success("Job deleted");
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error("Failed to delete job");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'default';
      case 'draft': return 'secondary';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded"></div>
      <div className="h-32 bg-muted rounded"></div>
    </div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black uppercase">Job Postings</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold mb-2">No jobs yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first job posting to start receiving applications
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="border-2 border-foreground">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl font-black uppercase">
                        {job.title}
                      </CardTitle>
                      <Badge variant={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </div>
                      )}
                      {(job.salary_min || job.salary_max) && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {job.salary_min && `$${job.salary_min}k`}
                          {job.salary_min && job.salary_max && ' - '}
                          {job.salary_max && `$${job.salary_max}k`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => navigate(`/jobs/${job.id}/dashboard`)}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                    {job.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(job.id, 'published')}
                      >
                        Publish
                      </Button>
                    )}
                    {job.status === 'published' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(job.id, 'closed')}
                      >
                        Close
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(job.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {job.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {job.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <CreateJobDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        companyId={companyId}
        onJobCreated={fetchJobs}
      />
      
      {selectedJobId && (
        <EditJobDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          jobId={selectedJobId}
          onJobUpdated={fetchJobs}
        />
      )}
    </>
  );
};
