import { useState } from 'react';
import { FileText, Download, Trash2, FileImage, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContractDocuments, ContractDocument } from '@/hooks/useContractDocuments';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ContractDocumentsListProps {
  contractId: string;
  canDelete?: boolean;
}

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  contract: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  nda: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  sow: 'bg-green-500/10 text-green-500 border-green-500/20',
  amendment: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  deliverable: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  other: 'bg-muted text-muted-foreground border-border'
};

export function ContractDocumentsList({ contractId, canDelete = true }: ContractDocumentsListProps) {
  const { documents, isLoading, deleteDocument, getDownloadUrl } = useContractDocuments(contractId);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ContractDocument | null>(null);

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-8 w-8" />;
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (mimeType.includes('image')) return <FileImage className="h-8 w-8 text-blue-500" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-8 w-8 text-blue-600" />;
    return <File className="h-8 w-8" />;
  };

  const formatFileSize = (sizeKb: number | null) => {
    if (!sizeKb) return '';
    if (sizeKb < 1024) return sizeKb + ' KB';
    return (sizeKb / 1024).toFixed(1) + ' MB';
  };

  const handleDownload = async (doc: ContractDocument) => {
    try {
      setDownloadingId(doc.id);
      const url = await getDownloadUrl(doc.file_url);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteClick = (doc: ContractDocument) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      await deleteDocument.mutateAsync(documentToDelete.id);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No documents uploaded yet</p>
        <p className="text-xs mt-1">Upload contracts, NDAs, or other documents</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-shrink-0">
              {getFileIcon(doc.mime_type)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{doc.file_name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{formatFileSize(doc.file_size_kb)}</span>
                <span>•</span>
                <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>

            <Badge 
              variant="outline" 
              className={cn('capitalize', DOCUMENT_TYPE_COLORS[doc.document_type] || DOCUMENT_TYPE_COLORS.other)}
            >
              {doc.document_type}
            </Badge>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(doc)}
                disabled={downloadingId === doc.id}
              >
                {downloadingId === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteClick(doc)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
