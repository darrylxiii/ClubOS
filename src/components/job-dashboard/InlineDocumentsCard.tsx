import { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, ExternalLink, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JobDocuments } from "@/components/partner/JobDocuments";

interface InlineDocumentsCardProps {
  jobId: string;
}

export const InlineDocumentsCard = memo(({ jobId }: InlineDocumentsCardProps) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullDialog, setShowFullDialog] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('job_documents')
          .select('id, file_name, file_type, created_at')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (!error) {
          setDocuments(data || []);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [jobId]);

  const getFileIcon = (fileType: string) => {
    return FileText;
  };

  return (
    <Card className="border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <FolderOpen className="w-3.5 h-3.5" />
            Documents
          </h4>
          <Dialog open={showFullDialog} onOpenChange={setShowFullDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                View All
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Job Documents</DialogTitle>
              </DialogHeader>
              <JobDocuments jobId={jobId} onUpdate={() => {}} />
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
            {documents.map((doc) => {
              const Icon = getFileIcon(doc.file_type);
              return (
                <div 
                  key={doc.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-background/40 border border-border/20 hover:bg-background/60 transition-all cursor-pointer group"
                >
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{doc.file_name}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
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
