import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, Upload, Download, Eye, Trash2, 
  CheckCircle2, FileCheck, User, FileImage, Award, File, FolderOpen, Loader2,
  Calendar, AlertTriangle, Archive, ArchiveRestore
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { useResumeUpload } from "@/hooks/useResumeUpload";
import { useRole } from "@/contexts/RoleContext";

interface Props {
  candidateId: string;
  canUpload: boolean;
}

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size_kb: number;
  uploaded_at: string;
  uploaded_by: string;
  uploaded_by_role: string;
  uploader_name?: string;
  uploader_email?: string;
  expiry_date?: string | null;
  archived?: boolean;
  archived_at?: string | null;
  is_verified?: boolean;
  version_number: number;
}

const DOCUMENT_TYPES = {
  cv: { label: 'Resume/CV', icon: FileText, badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30', gradient: 'from-blue-500/5 to-indigo-500/5', glow: 'hover:shadow-blue-500/20' },
  cover_letter: { label: 'Cover Letter', icon: FileText, badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30', gradient: 'from-purple-500/5 to-pink-500/5', glow: 'hover:shadow-purple-500/20' },
  portfolio: { label: 'Portfolio', icon: FileImage, badge: 'bg-pink-500/10 text-pink-400 border-pink-500/30', gradient: 'from-pink-500/5 to-rose-500/5', glow: 'hover:shadow-pink-500/20' },
  certificate: { label: 'Certificate', icon: Award, badge: 'bg-green-500/10 text-green-400 border-green-500/30', gradient: 'from-green-500/5 to-emerald-500/5', glow: 'hover:shadow-green-500/20' },
  id_document: { label: 'ID Document', icon: User, badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', gradient: 'from-yellow-500/5 to-amber-500/5', glow: 'hover:shadow-yellow-500/20' },
  work_permit: { label: 'Work Permit', icon: FileCheck, badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30', gradient: 'from-orange-500/5 to-red-500/5', glow: 'hover:shadow-orange-500/20' },
  other: { label: 'Other', icon: File, badge: 'bg-gray-500/10 text-gray-400 border-gray-500/30', gradient: 'from-gray-500/5 to-slate-500/5', glow: 'hover:shadow-gray-500/20' },
};

export const CandidateDocumentsViewer = ({ candidateId, canUpload }: Props) => {
  const { currentRole: role } = useRole();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<string>('cv');
  const [dragActive, setDragActive] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  
  const { uploadResume, isUploading: uploading, progress: uploadProgress, validateFile } = useResumeUpload();
  
  const isAdminOrPartner = role === 'admin' || role === 'partner' || role === 'strategist';

  useEffect(() => {
    loadDocuments();
  }, [candidateId, showArchived]);

  const loadDocuments = async () => {
    let query = supabase
      .from('candidate_documents')
      .select('*')
      .eq('candidate_id', candidateId);
    
    // Filter out archived documents unless showArchived is true
    if (!showArchived) {
      query = query.or('archived.is.null,archived.eq.false');
    }
    
    const { data, error } = await query.order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
      setLoading(false);
      return;
    }

    // Fetch uploader info separately
    const uploaderIds = [...new Set((data || []).map(doc => doc.uploaded_by).filter(Boolean))];
    const { data: uploaders } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', uploaderIds);

    const uploaderMap = new Map(uploaders?.map(u => [u.id, u]) || []);

    const documentsWithUrls = await Promise.all(
      (data || []).map(async (doc: any) => {
        try {
          const { data: urlData } = await supabase.storage
            .from('resumes')
            .createSignedUrl(doc.file_url, 3600);
          
          const uploader = uploaderMap.get(doc.uploaded_by);
          
          return {
            ...doc,
            file_url: urlData?.signedUrl || doc.file_url,
            uploader_name: uploader?.full_name,
            uploader_email: uploader?.email,
          };
        } catch (error) {
          console.error('Error creating signed URL:', error);
          const uploader = uploaderMap.get(doc.uploaded_by);
          return {
            ...doc,
            uploader_name: uploader?.full_name,
            uploader_email: uploader?.email,
          };
        }
      })
    );

    setDocuments(documentsWithUrls);
    setLoading(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    if (!validateFile(file)) {
      return;
    }
    setSelectedFile(file);
    setShowTypeSelector(true);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleUploadWithType = async () => {
    if (!selectedFile) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload using the hook (standardized bucket and path generation)
      // Note: The hook generates a path like: candidateId/timestamp_filename
      // CandidateDocumentsViewer previously used: candidateId/timestamp-sanitized_filename
      // The hook uses regex replacement which is similar but simpler.
      const result = await uploadResume(selectedFile, candidateId, 'partner');
      
      if (!result) return; // Hook handles errors

      // Insert into DB
      const { error: insertError } = await supabase
        .from('candidate_documents')
        .insert({
          candidate_id: candidateId,
          document_type: selectedType,
          file_name: selectedFile.name,
          file_url: result.path,
          file_size_kb: Math.round(selectedFile.size / 1024),
          mime_type: selectedFile.type,
          uploaded_by: user.id,
          uploaded_by_role: role,
          expiry_date: expiryDate || null,
        });

      if (insertError) throw insertError;

      toast.success(`${DOCUMENT_TYPES[selectedType as keyof typeof DOCUMENT_TYPES]?.label || 'Document'} uploaded successfully`);
      await loadDocuments();
      
      setShowTypeSelector(false);
      setSelectedFile(null);
      setSelectedType('cv');
      setExpiryDate('');
    } catch (error: any) {
      console.error('Upload error:', error);
      // Toast handled by hook for upload errors, but we catch DB errors here
      if (!error.message?.includes('Upload failed')) { // Primitive check if not already toasted
         toast.error(error.message || 'Failed to save document metadata');
      }
    }
  };

  const handleDownload = async (doc: Document) => {
    window.open(doc.file_url, '_blank');
  };

  const handleArchiveToggle = async (docId: string, currentArchived: boolean) => {
    try {
      const { error } = await supabase
        .from('candidate_documents')
        .update({
          archived: !currentArchived,
          archived_at: !currentArchived ? new Date().toISOString() : null,
        })
        .eq('id', docId);

      if (error) throw error;

      toast.success(currentArchived ? 'Document restored' : 'Document archived');
      await loadDocuments();
    } catch (error) {
      console.error('Archive error:', error);
      toast.error('Failed to update document');
    }
  };

  const getExpiryStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    
    const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date());
    
    if (daysUntilExpiry < 0) {
      return { type: 'expired', label: 'Expired', className: 'bg-red-500/10 text-red-400 border-red-500/30' };
    } else if (daysUntilExpiry <= 30) {
      return { type: 'expiring', label: `${daysUntilExpiry}d left`, className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' };
    }
    return null;
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([doc.file_url.split('resumes/')[1] || doc.file_url]);

      if (storageError) console.error('Storage deletion error:', storageError);

      const { error: dbError } = await supabase
        .from('candidate_documents')
        .delete()
        .eq('id', docId);

      if (dbError) throw dbError;

      toast.success('Document deleted');
      await loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading documents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Archive Toggle */}
      {isAdminOrPartner && documents.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Hide Archived
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Show Archived
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Section - Admin/Strategist Only */}
      {canUpload && role !== 'partner' && (
        <Card className="border-border/40 bg-card/50">
          <CardContent className="pt-6">
            <div
              className={`
                relative overflow-hidden rounded-xl border-2 transition-all duration-200
                ${dragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-dashed border-border/60 hover:border-primary/50'
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="document-upload"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileInputChange}
                disabled={uploading}
              />
              <label htmlFor="document-upload" className="cursor-pointer block p-12 text-center">
                <div className="relative">
                  <Upload className={`
                    w-14 h-14 mx-auto mb-4 transition-all duration-300
                    ${dragActive ? 'text-primary scale-110' : 'text-foreground/60'}
                  `} />
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-foreground">
                      {uploading ? 'Uploading document...' : 'Drop file here or click to browse'}
                    </p>
                    <p className="text-sm text-foreground/70">
                      PDF, DOC, DOCX, JPG, PNG up to 10MB
                    </p>
                    {dragActive && (
                      <p className="text-sm font-medium text-primary animate-pulse">
                        Release to upload
                      </p>
                    )}
                  </div>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => {
          const typeInfo = DOCUMENT_TYPES[doc.document_type as keyof typeof DOCUMENT_TYPES] || DOCUMENT_TYPES.other;
          const Icon = typeInfo.icon;
          const expiryStatus = getExpiryStatus(doc.expiry_date);
          const canManageDocument = isAdminOrPartner && 
            (doc.uploaded_by_role === 'admin' || doc.uploaded_by_role === 'partner' || doc.uploaded_by_role === 'strategist');
          
          return (
            <Card 
              key={doc.id} 
              className={`
                group relative overflow-hidden border-border/40 bg-gradient-to-br ${typeInfo.gradient}
                backdrop-blur-sm transition-all duration-300 ${typeInfo.glow}
                ${doc.archived ? 'opacity-60' : ''}
              `}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`${typeInfo.badge} border font-medium`}>
                      {typeInfo.label}
                    </Badge>
                    {doc.archived && (
                      <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/30">
                        <Archive className="w-3 h-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                    {expiryStatus && (
                      <Badge variant="outline" className={`${expiryStatus.className} border`}>
                        {expiryStatus.type === 'expired' ? (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        ) : (
                          <Calendar className="w-3 h-3 mr-1" />
                        )}
                        {expiryStatus.label}
                      </Badge>
                    )}
                  </div>
                  {doc.is_verified && (
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-medium">Verified</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-foreground mb-1">
                      {doc.file_name}
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {Math.round(doc.file_size_kb)}KB • Version {doc.version_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.uploaded_at), 'MMM d, yyyy • HH:mm')}
                      </p>
                      {doc.uploader_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {doc.uploader_name}
                        </p>
                      )}
                      {doc.expiry_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Expires: {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 group-hover:border-primary/50 transition-colors"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="group-hover:border-primary/50 transition-colors"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  {canManageDocument && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:border-primary/50 transition-colors"
                      onClick={() => handleArchiveToggle(doc.id, doc.archived || false)}
                      title={doc.archived ? 'Restore document' : 'Archive document'}
                    >
                      {doc.archived ? (
                        <ArchiveRestore className="w-3.5 h-3.5" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                  {canUpload && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:border-red-500/50 hover:text-red-500 transition-colors"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {documents.length === 0 && (
        <Card className="border-border/40">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">No documents yet</p>
            <p className="text-sm text-muted-foreground">Upload the first document to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Document Type Selection Dialog */}
      <Dialog open={showTypeSelector} onOpenChange={setShowTypeSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Document Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedFile && (
              <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                <p className="text-sm font-medium text-foreground mb-1">Selected file:</p>
                <p className="text-sm text-muted-foreground truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(selectedFile.size / 1024)}KB
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="document-type" className="text-sm font-medium">
                Document Type
              </Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <value.icon className="w-4 h-4" />
                        {value.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdminOrPartner && (
              <div className="space-y-3">
                <Label htmlFor="expiry-date" className="text-sm font-medium">
                  Expiry Date (Optional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Documents will be automatically archived after this date for GDPR compliance
                </p>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-xs text-center text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowTypeSelector(false);
                  setSelectedFile(null);
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUploadWithType}
                disabled={uploading || !selectedType}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate">{previewDoc?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded-lg border border-border/40">
            {previewDoc && (
              <iframe
                src={previewDoc.file_url}
                className="w-full h-[70vh]"
                title="Document preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
