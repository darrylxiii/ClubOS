import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, X, Eye, Loader2 } from "lucide-react";
import { validatePostMediaFile } from "@/lib/fileValidation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextDocumentCreator } from "./TextDocumentCreator";

interface JobDocumentsProps {
  jobId: string;
  onUpdate?: () => void;
}

interface DocumentWithUploader {
  url: string;
  name: string;
  uploaded_at: string;
  uploaded_by?: string;
  uploader_name?: string;
}

export const JobDocuments = ({ jobId, onUpdate }: JobDocumentsProps) => {
  const [loading, setLoading] = useState(true);
  const [jobDescriptionUrl, setJobDescriptionUrl] = useState<string>('');
  const [supportingDocs, setSupportingDocs] = useState<DocumentWithUploader[]>([]);
  const [uploadingJobDesc, setUploadingJobDesc] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [viewerTitle, setViewerTitle] = useState<string>('');
  const [viewerType, setViewerType] = useState<'pdf' | 'docx' | 'other'>('pdf');
  
  const jobDescInputRef = useRef<HTMLInputElement>(null);
  const supportingInputRef = useRef<HTMLInputElement>(null);

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
      
      const docs = (Array.isArray(data.supporting_documents) ? data.supporting_documents : []) as any[];
      
      // Enrich documents with uploader names
      const enrichedDocs = await Promise.all(docs.map(async (doc: any) => {
        if (doc.uploaded_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', doc.uploaded_by)
            .maybeSingle();
          
          return {
            ...doc,
            uploader_name: profile?.full_name || 'Unknown'
          } as DocumentWithUploader;
        }
        return doc as DocumentWithUploader;
      }));
      
      setSupportingDocs(enrichedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Auto-upload job description immediately on file select
  const handleJobDescChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validation = validatePostMediaFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      if (jobDescInputRef.current) jobDescInputRef.current.value = '';
      return;
    }

    setUploadingJobDesc(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${jobId}/job-description.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('job-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload: ${uploadError.message}`);
      }

      // Fetch user profile for uploader name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      // Update database immediately with uploader tracking
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ 
          job_description_url: fileName,
          jd_uploaded_by: user.id,
          jd_uploaded_at: new Date().toISOString(),
          jd_uploader_name: profile?.full_name || 'Unknown'
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to save: ${updateError.message}`);
      }

      setJobDescriptionUrl(fileName);
      toast.success('Job description uploaded successfully');
      onUpdate?.();
    } catch (error: unknown) {
      console.error('Error uploading job description:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload job description');
    } finally {
      setUploadingJobDesc(false);
      if (jobDescInputRef.current) jobDescInputRef.current.value = '';
    }
  };

  // Auto-upload supporting documents immediately on file select
  const handleSupportingDocsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      if (supportingInputRef.current) supportingInputRef.current.value = '';
      return;
    }

    // Track uploading files
    setUploadingFiles(validFiles.map(f => f.name));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const newDocs: DocumentWithUploader[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${jobId}/supporting/${Date.now()}-${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Storage upload error for supporting doc:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        newDocs.push({
          url: fileName,
          name: file.name,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user.id,
          uploader_name: 'You'
        });
      }

      if (newDocs.length > 0) {
        // Update database with new documents
        const updatedSupportingDocs = [...supportingDocs, ...newDocs];
        
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ supporting_documents: updatedSupportingDocs as any })
          .eq('id', jobId);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw new Error(`Failed to save: ${updateError.message}`);
        }

        setSupportingDocs(updatedSupportingDocs);
        toast.success(`${newDocs.length} document(s) uploaded successfully`);
        onUpdate?.();
      }
    } catch (error: unknown) {
      console.error('Error uploading supporting documents:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload documents');
    } finally {
      setUploadingFiles([]);
      if (supportingInputRef.current) supportingInputRef.current.value = '';
    }
  };

  const removeExistingDocument = async (docUrl: string) => {
    try {
      const updatedDocs = supportingDocs.filter(doc => doc.url !== docUrl);
      
      const { error } = await supabase
        .from('jobs')
        .update({ supporting_documents: updatedDocs as any })
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
      const fileExt = url.split('.').pop()?.toLowerCase();
      
      if (fileExt === 'docx' || fileExt === 'doc') {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('job-documents')
          .createSignedUrl(url, 3600);
        
        if (signedError) throw signedError;
        
        if (signedData?.signedUrl) {
          const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(signedData.signedUrl)}&embedded=true`;
          setViewerUrl(googleDocsUrl);
          setViewerType('docx');
          setViewerTitle(name);
          setViewerOpen(true);
        }
      } else {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('job-documents')
          .download(url);
        
        if (downloadError) throw downloadError;
        
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
          {jobDescriptionUrl && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-2 border-accent/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Current Job Description</p>
                  <p className="text-xs text-muted-foreground">Uploaded document ready to view</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewDocument(jobDescriptionUrl, 'Job Description')}
                  className="gap-2 border-primary/20 hover:bg-primary/10"
                >
                  <Eye className="w-4 h-4" />
                  Preview
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
          
          {!jobDescriptionUrl && (
            <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No job description uploaded yet</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="job-desc-upload">
              {jobDescriptionUrl ? 'Replace Job Description' : 'Upload Job Description'}
            </Label>
            <div className="relative">
              <Input
                ref={jobDescInputRef}
                id="job-desc-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleJobDescChange}
                disabled={uploadingJobDesc}
                className={uploadingJobDesc ? 'opacity-50' : ''}
              />
              {uploadingJobDesc && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md" role="status" aria-live="polite">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                  <span className="sr-only">Upload in progress</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">File will be uploaded automatically when selected</p>
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
          {supportingDocs.length > 0 ? (
            <div className="space-y-2">
              <Label>Existing Documents</Label>
              <div className="space-y-2">
                {supportingDocs.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-2 border-accent/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <FileText className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                          {doc.uploader_name && ` by ${doc.uploader_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDocument(doc.url, doc.name)}
                        className="gap-2 border-primary/20 hover:bg-primary/10"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(doc.url, doc.name)}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeExistingDocument(doc.url)}
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No supporting documents uploaded yet</p>
            </div>
          )}

          {/* Upload New Documents */}
          <div className="space-y-2">
            <Label htmlFor="supporting-docs-upload">Add More Documents</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={supportingInputRef}
                  id="supporting-docs-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  onChange={handleSupportingDocsChange}
                  disabled={uploadingFiles.length > 0}
                  className={uploadingFiles.length > 0 ? 'opacity-50' : ''}
                />
                {uploadingFiles.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                    <span className="text-sm">Uploading {uploadingFiles.length} file(s)...</span>
                  </div>
                )}
              </div>
              <TextDocumentCreator 
                jobId={jobId} 
                onDocumentCreated={fetchDocuments}
              />
            </div>
            <p className="text-xs text-muted-foreground">Files will be uploaded automatically when selected</p>
          </div>
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {viewerTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {viewerType === 'pdf' ? (
              <iframe
                src={viewerUrl}
                className="w-full h-full rounded-lg border"
                title={viewerTitle}
              />
            ) : viewerType === 'docx' ? (
              <div className="w-full h-full flex flex-col">
                <iframe
                  src={viewerUrl}
                  className="w-full flex-1 rounded-lg border"
                  title={viewerTitle}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Powered by Google Docs Viewer
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Preview not available for this file type</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
