import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ExternalLink, X, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string | null;
  documentName?: string;
  bucketName?: string;
}

/**
 * Extract the file path from a full Supabase storage URL
 */
const extractPathFromUrl = (url: string, bucketName: string): string | null => {
  const pattern = new RegExp(`/storage/v1/object/(?:public|sign)/${bucketName}/(.+?)(?:\\?|$)`);
  const match = url.match(pattern);
  if (match) return decodeURIComponent(match[1]);
  
  if (!url.startsWith('http')) {
    return url;
  }
  
  return null;
};

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
  const [iframeBlocked, setIframeBlocked] = useState(false);

  useEffect(() => {
    if (!open || !documentUrl) {
      setSignedUrl(null);
      setError(null);
      setIframeBlocked(false);
      return;
    }

    const generateSignedUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        if (isSignedUrl(documentUrl)) {
          setSignedUrl(documentUrl);
          setLoading(false);
          return;
        }

        const filePath = extractPathFromUrl(documentUrl, bucketName);
        
        if (!filePath) {
          console.warn('[DocumentPreview] Could not extract path, trying URL as-is:', documentUrl);
          setSignedUrl(documentUrl);
          setLoading(false);
          return;
        }

        console.log('[DocumentPreview] Generating signed URL for path:', filePath);

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
      } catch (err: unknown) {
        console.error('[DocumentPreview] Error generating signed URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    generateSignedUrl();
  }, [open, documentUrl, bucketName]);

  const handleDownload = () => {
    if (signedUrl) {
      // Force download by opening in new tab
      window.open(signedUrl, '_blank');
    }
  };

  const handleIframeError = () => {
    setIframeBlocked(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <DialogTitle className="text-lg font-medium">
                  {documentName}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Preview of {documentName}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {signedUrl && !loading && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </Button>
                  <Button
                    variant="default"
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

        <div className="flex-1 overflow-hidden relative">
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
                {signedUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
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
            <>
              {iframeBlocked ? (
                <div className="flex items-center justify-center h-full p-6">
                  <div className="flex flex-col items-center gap-4 text-center max-w-md">
                    <AlertTriangle className="w-12 h-12 text-amber-500" />
                    <div>
                      <p className="text-lg font-medium mb-2">Preview blocked by security software</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your browser or security software (like Comet) is blocking the document preview. 
                        You can still view the document by opening it in a new tab.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleDownload} className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Open in New Tab
                      </Button>
                      <Button variant="outline" onClick={handleDownload} className="gap-2">
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Alert className="m-4 mb-0 border-amber-500/50 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-sm">
                      If the preview doesn't load, your security software may be blocking it. 
                      Use the <strong>Open in New Tab</strong> button above.
                    </AlertDescription>
                  </Alert>
                  <iframe
                    src={signedUrl}
                    className="w-full h-[calc(100%-4rem)] border-0"
                    title={documentName}
                    onError={handleIframeError}
                  />
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}