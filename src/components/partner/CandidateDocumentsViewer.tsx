import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FileText, Upload, Download, Eye, Trash2, 
  CheckCircle2, FileCheck 
} from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size_kb: number;
  uploaded_at: string;
  uploaded_by: string;
  is_verified: boolean;
  version_number: number;
  parsing_results?: any;
}

interface Props {
  candidateId: string;
  canUpload: boolean;
}

export const CandidateDocumentsViewer = ({ candidateId, canUpload }: Props) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [candidateId]);

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from('candidate_documents')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading documents:', error);
      return;
    }
    setDocuments(data || []);
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const filePath = `${candidateId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Insert document record
      const { error: insertError } = await supabase
        .from('candidate_documents')
        .insert({
          candidate_id: candidateId,
          document_type: file.type.includes('pdf') ? 'cv' : 'other',
          file_name: file.name,
          file_url: publicUrl,
          file_size_kb: Math.round(file.size / 1024),
          mime_type: file.type,
        });

      if (insertError) throw insertError;

      toast.success('Document uploaded successfully');
      loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    window.open(doc.file_url, '_blank');
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const { error } = await supabase
      .from('candidate_documents')
      .delete()
      .eq('id', docId);

    if (error) {
      toast.error('Failed to delete document');
      return;
    }

    toast.success('Document deleted');
    loadDocuments();
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'cv': return FileText;
      case 'certificate': return FileCheck;
      default: return FileText;
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'cv': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'certificate': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'cover_letter': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default: return 'bg-muted/50 text-foreground border-border';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {canUpload && (
        <Card>
          <CardContent className="pt-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-muted-foreground transition-colors">
              <input
                type="file"
                id="document-upload"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <label htmlFor="document-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  {uploading ? 'Uploading...' : 'Click to upload document'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX up to 10MB
                </p>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => {
          const Icon = getDocumentIcon(doc.document_type);
          return (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge variant="outline" className={getDocumentTypeColor(doc.document_type)}>
                    {doc.document_type.toUpperCase()}
                  </Badge>
                  {doc.is_verified && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Icon className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(doc.file_size_kb)}KB • v{doc.version_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  {canUpload && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {/* Parsing Results Preview */}
                {doc.parsing_results && (
                  <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                    <p className="font-medium mb-1">AI Parsed:</p>
                    <p className="line-clamp-2">
                      {JSON.stringify(doc.parsing_results).substring(0, 80)}...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {documents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            {previewDoc && (
              <iframe
                src={previewDoc.file_url}
                className="w-full h-[70vh] border rounded"
                title="Document preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
