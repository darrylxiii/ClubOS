import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  ExternalLink,
  FileCheck,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface DocumentStatus {
  type: 'cv' | 'cover_letter' | 'portfolio' | 'certificates';
  label: string;
  status: 'complete' | 'missing' | 'outdated';
  url?: string | null;
  filename?: string | null;
  updatedAt?: string | null;
}

export function DocumentStatusWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: documentStatus, isLoading } = useQuery({
    queryKey: ['document-status', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch candidate profile for resume info
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('resume_url, resume_filename, updated_at')
        .eq('user_id', user.id)
        .single();

      // Fetch any additional documents from candidate_documents if exists
      const { data: documents } = await supabase
        .from('candidate_documents')
        .select('document_type, file_url, file_name, uploaded_at')
        .eq('candidate_id', user.id)
        .order('uploaded_at', { ascending: false });

      // Build document status list
      const statuses: DocumentStatus[] = [];

      // CV/Resume status
      const cvDoc = documents?.find(d => d.document_type === 'cv' || d.document_type === 'resume');
      if (candidateProfile?.resume_url || cvDoc) {
        const isOld = candidateProfile?.updated_at && 
          new Date(candidateProfile.updated_at) < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 6 months

        statuses.push({
          type: 'cv',
          label: 'CV / Resume',
          status: isOld ? 'outdated' : 'complete',
          url: candidateProfile?.resume_url || cvDoc?.file_url,
          filename: candidateProfile?.resume_filename || cvDoc?.file_name,
          updatedAt: candidateProfile?.updated_at || cvDoc?.uploaded_at,
        });
      } else {
        statuses.push({
          type: 'cv',
          label: 'CV / Resume',
          status: 'missing',
        });
      }

      // Cover Letter
      const coverLetter = documents?.find(d => d.document_type === 'cover_letter');
      statuses.push({
        type: 'cover_letter',
        label: 'Cover Letter',
        status: coverLetter ? 'complete' : 'missing',
        url: coverLetter?.file_url,
        filename: coverLetter?.file_name,
        updatedAt: coverLetter?.uploaded_at,
      });

      // Portfolio
      const portfolio = documents?.find(d => d.document_type === 'portfolio');
      statuses.push({
        type: 'portfolio',
        label: 'Portfolio',
        status: portfolio ? 'complete' : 'missing',
        url: portfolio?.file_url,
        filename: portfolio?.file_name,
        updatedAt: portfolio?.uploaded_at,
      });

      // Certificates
      const certificates = documents?.filter(d => d.document_type === 'certificate');
      statuses.push({
        type: 'certificates',
        label: 'Certificates',
        status: certificates && certificates.length > 0 ? 'complete' : 'missing',
        url: certificates?.[0]?.file_url,
        filename: certificates?.length ? `${certificates.length} uploaded` : null,
        updatedAt: certificates?.[0]?.uploaded_at,
      });

      return statuses;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const completedCount = documentStatus?.filter(d => d.status === 'complete').length || 0;
  const totalCount = documentStatus?.length || 0;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getStatusIcon = (status: DocumentStatus['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'outdated':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'missing':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: DocumentStatus['status']) => {
    switch (status) {
      case 'complete':
        return <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">Uploaded</Badge>;
      case 'outdated':
        return <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">Update Needed</Badge>;
      case 'missing':
        return <Badge variant="outline" className="text-xs">Missing</Badge>;
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Documents
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate('/settings?tab=documents')}
          >
            Manage
          </Button>
        </div>
        
        {/* Completion Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">Profile Documents</span>
            <span className="font-medium">{completedCount}/{totalCount} Complete</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {documentStatus?.map((doc) => (
          <div 
            key={doc.type}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(doc.status)}
              <div>
                <p className="text-sm font-medium">{doc.label}</p>
                {doc.status !== 'missing' && doc.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(doc.status)}
              
              {doc.status === 'missing' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate('/settings?tab=documents')}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              ) : doc.url ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(doc.url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        ))}

        {/* Quick action for CV if missing */}
        {documentStatus?.find(d => d.type === 'cv')?.status === 'missing' && (
          <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-border">
            <div className="flex items-start gap-3">
              <FileCheck className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Upload your CV to get started</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A complete profile gets 3x more recruiter views
                </p>
                <Button 
                  size="sm" 
                  className="mt-3"
                  onClick={() => navigate('/settings?tab=documents')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CV
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
