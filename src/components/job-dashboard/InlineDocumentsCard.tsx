import { useState, useEffect, memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, FolderOpen, Eye, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JobDocuments } from "@/components/partner/JobDocuments";
import { format } from "date-fns";
import { toast } from "sonner";

interface DocumentItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_at?: string;
  uploaded_by?: string;
  uploader_name?: string;
}

interface InlineDocumentsCardProps {
  jobId: string;
}

export const InlineDocumentsCard = memo(({ jobId }: InlineDocumentsCardProps) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullDialog, setShowFullDialog] = useState(false);
  
  // Viewer dialog state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [viewerTitle, setViewerTitle] = useState<string>('');
  const [viewerType, setViewerType] = useState<'pdf' | 'docx' | 'other'>('pdf');

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('job_description_url, supporting_documents, updated_at, created_by, jd_uploaded_at, jd_uploaded_by, jd_uploader_name')
        .eq('id', jobId)
        .single();
      
      if (!error && data) {
        const docs: DocumentItem[] = [];
        
        // Use dedicated JD uploader fields if available, fall back to job creator
        let jdUploaderName = data.jd_uploader_name || 'Unknown';
        let jdUploadedAt = data.jd_uploaded_at || data.updated_at;
        
        // If no dedicated JD uploader, fetch job creator name as fallback
        if (!data.jd_uploader_name && data.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.created_by)
            .maybeSingle();
          if (profile?.full_name) {
            jdUploaderName = profile.full_name;
          }
        }
        
        if (data.job_description_url) {
          docs.push({
            id: 'jd-main',
            file_name: 'Job Description',
            file_url: data.job_description_url,
            file_type: 'application/pdf',
            uploaded_at: jdUploadedAt,
            uploaded_by: data.jd_uploaded_by || data.created_by,
            uploader_name: jdUploaderName
          });
        }
        
        if (data.supporting_documents && Array.isArray(data.supporting_documents)) {
          data.supporting_documents.forEach((doc: any, index: number) => {
            if (doc?.url || doc?.file_url) {
              docs.push({
                id: `supporting-${index}`,
                file_name: doc.name || doc.file_name || `Document ${index + 1}`,
                file_url: doc.url || doc.file_url,
                file_type: doc.type || doc.file_type || 'application/pdf',
                uploaded_at: doc.uploaded_at,
                uploaded_by: doc.uploaded_by,
                uploader_name: doc.uploader_name || 'Unknown'
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

  const handleViewDocument = async (doc: DocumentItem) => {
    try {
      const fileExt = doc.file_url.split('.').pop()?.toLowerCase();
      
      // For external URLs, open directly
      if (doc.file_url.startsWith('http')) {
        window.open(doc.file_url, '_blank', 'noopener,noreferrer');
        return;
      }

      // For DOCX files, use Google Docs Viewer
      if (fileExt === 'docx' || fileExt === 'doc') {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('job-documents')
          .createSignedUrl(doc.file_url, 3600);
        
        if (signedError) throw signedError;
        
        if (signedData?.signedUrl) {
          const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(signedData.signedUrl)}&embedded=true`;
          setViewerUrl(googleDocsUrl);
          setViewerType('docx');
          setViewerTitle(doc.file_name);
          setViewerOpen(true);
        }
      } else {
        // For PDFs and other files, download blob and create URL
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('job-documents')
          .download(doc.file_url);
        
        if (downloadError) throw downloadError;
        
        const blob = new Blob([fileData], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        setViewerUrl(blobUrl);
        setViewerType('pdf');
        setViewerTitle(doc.file_name);
        setViewerOpen(true);
      }
    } catch (err) {
      console.error('Error viewing document:', err);
      toast.error('Failed to open document viewer');
    }
  };

  const handleDownloadDocument = async (doc: DocumentItem) => {
    try {
      // For external URLs
      if (doc.file_url.startsWith('http')) {
        const link = document.createElement('a');
        link.href = doc.file_url;
        link.download = doc.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // For storage paths, download blob
      const { data, error } = await supabase.storage
        .from('job-documents')
        .download(doc.file_url);

      if (error) throw error;
      
      if (data) {
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Document downloaded');
      }
    } catch (err) {
      console.error('Error downloading document:', err);
      toast.error('Failed to download document');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return null;
    }
  };

  return (
    <>
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
                <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
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
                const dateStr = formatDate(doc.uploaded_at);
                const subtitle = [dateStr, doc.uploader_name !== 'Unknown' && `by ${doc.uploader_name}`]
                  .filter(Boolean)
                  .join(' • ');
                
                return (
                  <div 
                    key={doc.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/40 border border-border/20 hover:bg-background/60 transition-all group"
                  >
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{doc.file_name}</span>
                      {subtitle && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {subtitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleViewDocument(doc)}
                        title="View"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDownloadDocument(doc)}
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
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

      {/* Document Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-0">
          <DialogHeader className="p-4 pb-2 border-b border-border/40">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {viewerTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden h-full">
            {viewerType === 'docx' ? (
              <iframe
                src={viewerUrl}
                className="w-full h-[calc(85vh-60px)] border-0"
                title={viewerTitle}
              />
            ) : (
              <iframe
                src={viewerUrl}
                className="w-full h-[calc(85vh-60px)] border-0"
                title={viewerTitle}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

InlineDocumentsCard.displayName = 'InlineDocumentsCard';
