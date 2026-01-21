import { AppLayout } from "@/components/AppLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, Download, Trash2, Star, Eye,
  CheckCircle, XCircle, File, AlertTriangle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineLoader, SectionLoader } from "@/components/ui/unified-loader";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  file_name: string;
  display_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  is_primary: boolean;
  uploaded_at: string;
  updated_at: string;
}

const DocumentManagement = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [user?.id]);

  const loadDocuments = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('user_resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      toast.error('Failed to load documents');
      return;
    }

    setDocuments(data || []);
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, DOC, DOCX, or TXT files.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Insert record into database
      const { error: dbError } = await supabase
        .from('user_resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          display_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          is_primary: documents.length === 0 // First document is primary
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetPrimary = async (documentId: string) => {
    if (!user?.id) return;

    try {
      // Remove primary from all documents
      await supabase
        .from('user_resumes')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Set new primary
      const { error } = await supabase
        .from('user_resumes')
        .update({ is_primary: true })
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Primary document updated');
      loadDocuments();
    } catch (error) {
      logger.error('Set primary error:', error);
      toast.error('Failed to set primary document');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('resumes')
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const openDeleteDialog = (doc: Document) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([documentToDelete.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_resumes')
        .delete()
        .eq('id', documentToDelete.id);

      if (dbError) throw dbError;

      toast.success('Document deleted');
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      loadDocuments();
    } catch (error) {
      logger.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (mimeType.includes('word')) return <FileText className="h-8 w-8 text-blue-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Breadcrumb
          items={[
            { label: 'Home', path: '/home' },
            { label: 'Profile', path: '/profile' },
            { label: 'Documents' }
          ]}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Document Management</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage your resumes, CVs, and certificates
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <InlineLoader />
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

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Accepted formats: PDF, DOC, DOCX, TXT • Maximum file size: 10MB •
            Your primary document will be used for job applications.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents uploaded</h3>
              <p className="text-muted-foreground mb-4">
                Upload your resume or CV to get started with job applications
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Upload First Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="relative">
                {doc.is_primary && (
                  <div className="absolute top-3 right-3">
                    <Badge className="gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Primary
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getFileIcon(doc.mime_type)}</div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {doc.display_name}
                      </CardTitle>
                      <CardDescription className="space-y-1 mt-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>Uploaded {formatDistanceToNow(new Date(doc.uploaded_at), { addSuffix: true })}</span>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {!doc.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(doc.id)}
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Set as Primary
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(doc)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{documentToDelete?.display_name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default DocumentManagement;
