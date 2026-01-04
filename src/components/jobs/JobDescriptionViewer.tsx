import { useState } from "react";
import { FileText, Download, Eye, Loader2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

interface JobDescriptionViewerProps {
  documentUrl: string | null;
  jobTitle: string;
  companyName: string;
}

export function JobDescriptionViewer({ 
  documentUrl, 
  jobTitle, 
  companyName 
}: JobDescriptionViewerProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  if (!documentUrl) return null;

  const fileExtension = documentUrl.split('.').pop()?.toLowerCase();
  const isPdf = fileExtension === 'pdf';

  const handleView = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('job-documents')
        .createSignedUrl(documentUrl, 3600); // 1 hour expiry

      if (error) throw error;

      if (isPdf) {
        setViewerUrl(data.signedUrl);
      } else {
        // For DOCX/DOC, use Google Docs Viewer
        setViewerUrl(`https://docs.google.com/viewer?url=${encodeURIComponent(data.signedUrl)}&embedded=true`);
      }
      setIsViewerOpen(true);
    } catch (error) {
      console.error('Error loading document:', error);
      notify.error("Error", {
        description: "Failed to load document. Please try downloading instead.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('job-documents')
        .download(documentUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${companyName}_${jobTitle}_JobDescription.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notify.success("Success", {
        description: "Job description downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      notify.error("Error", {
        description: "Failed to download document. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="border-2 hover:border-primary transition-all hover-scale">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black">Job Description</h3>
              <p className="text-sm text-muted-foreground">
                Complete role details & requirements
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="border-t pt-6">
          <p className="text-foreground/80 mb-6">
            View the complete job description document with detailed requirements, 
            expectations, and role specifications.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleView}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              View Document
            </Button>

            <Button
              onClick={handleDownload}
              disabled={isLoading}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download {fileExtension?.toUpperCase()}
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>{fileExtension?.toUpperCase()} Document</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{jobTitle} - Job Description</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewerUrl && (
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0 rounded-lg"
                title="Job Description Document"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
