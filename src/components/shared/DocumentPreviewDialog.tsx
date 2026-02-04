import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string | null;
  documentName?: string;
  bucketName?: string;
}

/**
 * Extract the file path from a full Supabase storage URL
 * Handles URLs like:
 * - https://xxx.supabase.co/storage/v1/object/public/resumes/onboarding/file.pdf
 * - https://xxx.supabase.co/storage/v1/object/sign/resumes/onboarding/file.pdf
 */
const extractPathFromUrl = (url: string, bucketName: string): string | null => {
  // Pattern to match storage URLs for the specified bucket
  const pattern = new RegExp(`/storage/v1/object/(?:public|sign)/${bucketName}/(.+?)(?:\\?|$)`);
  const match = url.match(pattern);
  if (match) return decodeURIComponent(match[1]);
  
  // If URL doesn't match pattern, it might already be just a path
  if (!url.startsWith('http')) {
    return url;
  }
  
  return null;
};

/**
 * Check if URL is already a signed URL (contains token parameter)
 */
const isSignedUrl = (url: string): boolean => {
  return url.includes('token=');
};

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  documentUrl,
  documentName = "Document",
  bucketName = "resumes",
}: DocumentPreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !documentUrl) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    const generateSignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        // If already a signed URL, use it directly
        if (isSignedUrl(documentUrl)) {
          setSignedUrl(documentUrl);
          setLoading(false);
          return;
        }

        // Extract path from the URL
        const filePath = extractPathFromUrl(documentUrl, bucketName);
        
        if (!filePath) {
          // If we can't extract a path, try using the URL as-is
          // This handles edge cases where the URL format is unexpected
          console.warn('[DocumentPreview] Could not extract path, trying URL as-is:', documentUrl);
          setSignedUrl(documentUrl);
          setLoading(false);
          return;
        }

        console.log('[DocumentPreview] Generating signed URL for path:', filePath);

        // Generate a signed URL (1 hour expiry)
        const { data, error: signError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 3600);

        if (signError) {
          console.error('[DocumentPreview] Signed URL error:', signError);
          throw signError;
        }

        if (data?.signedUrl) {
          console.log('[DocumentPreview] Signed URL generated successfully');
          setSignedUrl(data.signedUrl);
        } else {
          throw new Error('No signed URL returned');
        }
      } catch (err: any) {
        console.error('[DocumentPreview] Error generating signed URL:', err);
        setError(err.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    generateSignedUrl();
  }, [open, documentUrl, bucketName]);

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const handleOpenExternal = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <DialogTitle className="text-lg font-medium">
                {documentName}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {signedUrl && !loading && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenExternal}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <FileText className="w-12 h-12 text-muted-foreground" />
                <p className="text-sm text-destructive font-medium">Failed to load document</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                {documentUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(documentUrl, '_blank')}
                    className="mt-2 gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Try opening directly
                  </Button>
                )}
              </div>
            </div>
          )}

          {signedUrl && !loading && !error && (
            <iframe
              src={signedUrl}
              className="w-full h-full border-0"
              title={documentName}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
