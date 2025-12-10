import { useState, useEffect, memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, ExternalLink, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JobDocuments } from "@/components/partner/JobDocuments";

interface DocumentItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
}

interface InlineDocumentsCardProps {
  jobId: string;
}

export const InlineDocumentsCard = memo(({ jobId }: InlineDocumentsCardProps) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullDialog, setShowFullDialog] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('job_description_url, supporting_documents')
        .eq('id', jobId)
        .single();
      
      if (!error && data) {
        const docs: DocumentItem[] = [];
        
        if (data.job_description_url) {
          docs.push({
            id: 'jd-main',
            file_name: 'Job Description',
            file_url: data.job_description_url,
            file_type: 'application/pdf'
          });
        }
        
        if (data.supporting_documents && Array.isArray(data.supporting_documents)) {
          data.supporting_documents.forEach((doc: any, index: number) => {
            if (doc?.url || doc?.file_url) {
              docs.push({
                id: `supporting-${index}`,
                file_name: doc.name || doc.file_name || `Document ${index + 1}`,
                file_url: doc.url || doc.file_url,
                file_type: doc.type || doc.file_type || 'application/pdf'
              });
            }
          });
        }
        
        setDocuments(docs.slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDialogChange = (open: boolean) => {
    setShowFullDialog(open);
    if (!open) {
      fetchDocuments();
    }
  };

  const handleOpenDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <FolderOpen className="w-3.5 h-3.5" />
            Documents
          </h4>
        <Dialog open={showFullDialog} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                View All
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Job Documents</DialogTitle>
              </DialogHeader>
              <JobDocuments jobId={jobId} onUpdate={fetchDocuments} />
            </DialogContent>
          </Dialog>
        </div>
        
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-4">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">No documents yet</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 h-7 text-xs"
              onClick={() => setShowFullDialog(true)}
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => handleOpenDocument(doc.file_url)}
                className="flex items-center gap-2 p-2 rounded-lg bg-background/40 border border-border/20 hover:bg-background/60 transition-all cursor-pointer group"
              >
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate flex-1">{doc.file_name}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            {documents.length >= 3 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-7 text-xs text-muted-foreground"
                onClick={() => setShowFullDialog(true)}
              >
                View all documents
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

InlineDocumentsCard.displayName = 'InlineDocumentsCard';
