import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, Upload, X, Eye, Loader2 } from "lucide-react";
import { validatePostMediaFile } from "@/lib/fileValidation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface JobDocumentsProps {
  jobId: string;
  onUpdate?: () => void;
}

export const JobDocuments = ({ jobId, onUpdate }: JobDocumentsProps) => {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState<string>('');
  const [supportingDocs, setSupportingDocs] = useState<any[]>([]);
  const [newJobDescFile, setNewJobDescFile] = useState<File | null>(null);
  const [newSupportingFiles, setNewSupportingFiles] = useState<File[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [viewerTitle, setViewerTitle] = useState<string>('');
  const [viewerType, setViewerType] = useState<'pdf' | 'docx' | 'other'>('pdf');

  useEffect(() => {
    fetchDocuments();
  }, [jobId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select('job_description_url, supporting_documents')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      setJobDescriptionUrl(data.job_description_url || '');
      setSupportingDocs(Array.isArray(data.supporting_documents) ? data.supporting_documents : []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleJobDescChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      setNewJobDescFile(file);
    }
  };

  const handleSupportingDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    
    for (const file of files) {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }
      validFiles.push(file);
    }
    
    setNewSupportingFiles(prev => [...prev, ...validFiles]);
  };

  const removeNewSupportingFile = (index: number) => {
    setNewSupportingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingDocument = async (docUrl: string) => {
    try {
      const updatedDocs = supportingDocs.filter(doc => doc.url !== docUrl);
      
      const { error } = await supabase
        .from('jobs')
        .update({ supporting_documents: updatedDocs })
        .eq('id', jobId);

      if (error) throw error;

      // Delete from storage
      await supabase.storage
        .from('job-documents')
        .remove([docUrl]);

      setSupportingDocs(updatedDocs);
      toast.success('Document removed successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Failed to remove document');
    }
  };

  const downloadDocument = async (url: string, name: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('job-documents')
        .download(url);
      
      if (error) throw error;
      
      const blob = new Blob([data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const viewDocument = async (url: string, name: string) => {
    try {
      // Determine file type from extension
      const fileExt = url.split('.').pop()?.toLowerCase();
      
      if (fileExt === 'docx' || fileExt === 'doc') {
        // For Word documents, use Google Docs Viewer
        // First get a signed URL that's publicly accessible for a short time
        const { data: signedData, error: signedError } = await supabase.storage
          .from('job-documents')
          .createSignedUrl(url, 3600); // 1 hour expiry
        
        if (signedError) throw signedError;
        
        if (signedData?.signedUrl) {
          // Use Google Docs Viewer for DOCX files
          const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(signedData.signedUrl)}&embedded=true`;
          setViewerUrl(googleDocsUrl);
          setViewerType('docx');
          setViewerTitle(name);
          setViewerOpen(true);
        }
      } else {
        // For PDFs, download and create blob URL
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('job-documents')
          .download(url);
        
        if (downloadError) throw downloadError;
        
        // Create blob with PDF MIME type
        const blob = new Blob([fileData], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        setViewerUrl(blobUrl);
        setViewerType('pdf');
        setViewerTitle(name);
        setViewerOpen(true);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to open document viewer');
    }
  };

  const uploadDocuments = async () => {
    setUploading(true);
    try {
      let updatedJobDescUrl = jobDescriptionUrl;
      const updatedSupportingDocs = [...supportingDocs];

      // Upload job description if new file
      if (newJobDescFile) {
        const fileExt = newJobDescFile.name.split('.').pop();
        const fileName = `${jobId}/job-description.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(fileName, newJobDescFile, { upsert: true });

        if (uploadError) throw uploadError;
        updatedJobDescUrl = fileName;
      }

      // Upload supporting documents
      for (let i = 0; i < newSupportingFiles.length; i++) {
        const file = newSupportingFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${jobId}/supporting/${Date.now()}-${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        updatedSupportingDocs.push({
          url: fileName,
          name: file.name,
          uploaded_at: new Date().toISOString()
        });
      }

      // Update job in database
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          job_description_url: updatedJobDescUrl,
          supporting_documents: updatedSupportingDocs
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      setJobDescriptionUrl(updatedJobDescUrl);
      setSupportingDocs(updatedSupportingDocs);
      setNewJobDescFile(null);
      setNewSupportingFiles([]);
      toast.success('Documents uploaded successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job Description Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-black uppercase flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Job Description
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobDescriptionUrl && !newJobDescFile && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-accent/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Current Job Description</p>
                  <p className="text-xs text-muted-foreground">Click to view or download</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewDocument(jobDescriptionUrl, 'Job Description')}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadDocument(jobDescriptionUrl, 'job-description.pdf')}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="job-desc-upload">
              {jobDescriptionUrl ? 'Replace Job Description' : 'Upload Job Description'}
            </Label>
            <Input
              id="job-desc-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleJobDescChange}
            />
            {newJobDescFile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md">
                <FileText className="w-4 h-4" />
                <span className="text-sm flex-1">{newJobDescFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewJobDescFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supporting Documents Section */}
      <Card className="border-2 border-accent/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-black uppercase flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Supporting Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Documents */}
          {supportingDocs.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Documents</Label>
              <div className="space-y-2">
                {supportingDocs.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-accent/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <FileText className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDocument(doc.url, doc.name)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(doc.url, doc.name)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeExistingDocument(doc.url)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload New Documents */}
          <div className="space-y-2">
            <Label htmlFor="supporting-docs-upload">Add More Documents</Label>
            <Input
              id="supporting-docs-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              onChange={handleSupportingDocsChange}
            />
            {newSupportingFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">New files to upload:</p>
                {newSupportingFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-md">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNewSupportingFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button */}
          {(newJobDescFile || newSupportingFiles.length > 0) && (
            <Button
              onClick={uploadDocuments}
              disabled={uploading}
              className="w-full gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Documents
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      {/* Document Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={(open) => {
        setViewerOpen(open);
        // Clean up blob URL when dialog closes (only for PDF blobs, not Google Docs URLs)
        if (!open && viewerUrl && viewerType === 'pdf') {
          URL.revokeObjectURL(viewerUrl);
          setViewerUrl('');
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{viewerTitle}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full bg-background/50 rounded-lg overflow-hidden border border-border">
            {viewerUrl && viewerType === 'docx' && (
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0"
                title={viewerTitle}
                style={{ minHeight: '70vh' }}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            )}
            
            {viewerUrl && viewerType === 'pdf' && (
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0"
                title={viewerTitle}
                style={{ minHeight: '70vh' }}
              />
            )}
            
            {!viewerUrl && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">Loading document...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
