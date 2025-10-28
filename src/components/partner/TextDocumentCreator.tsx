import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TextDocumentCreatorProps {
  jobId: string;
  onDocumentCreated: () => void;
}

export const TextDocumentCreator = ({ jobId, onDocumentCreated }: TextDocumentCreatorProps) => {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [detailedCreateOpen, setDetailedCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContent("");
  };

  const createTextDocument = async (isQuick: boolean) => {
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    if (!isQuick && !title.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    setCreating(true);
    try {
      // Create a text file with the content
      const documentTitle = isQuick 
        ? `Quick Doc ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
        : title.trim();
      
      const fileName = `${jobId}/supporting/${Date.now()}-${documentTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
      const textBlob = new Blob([content], { type: 'text/plain' });
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('job-documents')
        .upload(fileName, textBlob);

      if (uploadError) throw uploadError;

      // Get current supporting documents
      const { data: jobData, error: fetchError } = await supabase
        .from('jobs')
        .select('supporting_documents')
        .eq('id', jobId)
        .single();

      if (fetchError) throw fetchError;

      const currentDocs = Array.isArray(jobData.supporting_documents) 
        ? jobData.supporting_documents 
        : [];

      // Add new document
      const updatedDocs = [
        ...currentDocs,
        {
          url: fileName,
          name: `${documentTitle}.txt`,
          uploaded_at: new Date().toISOString()
        }
      ];

      // Update job with new document
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ supporting_documents: updatedDocs })
        .eq('id', jobId);

      if (updateError) throw updateError;

      toast.success(`Text document "${documentTitle}" created successfully!`);
      resetForm();
      setQuickCreateOpen(false);
      setDetailedCreateOpen(false);
      onDocumentCreated();
    } catch (error: any) {
      console.error('Error creating text document:', error);
      toast.error(error.message || 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => setQuickCreateOpen(true)}
          variant="outline"
          className="gap-2 border-primary/20 hover:bg-primary/10"
        >
          <Zap className="w-4 h-4" />
          Quick Text Doc
        </Button>
        <Button
          onClick={() => setDetailedCreateOpen(true)}
          variant="default"
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Create Text Doc
        </Button>
      </div>

      {/* Quick Create Dialog */}
      <Dialog open={quickCreateOpen} onOpenChange={(open) => {
        setQuickCreateOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Text Document
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-content">Document Content</Label>
              <Textarea
                id="quick-content"
                placeholder="Type or paste your content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="font-mono text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Auto-titled with date and time. Perfect for quick notes.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setQuickCreateOpen(false);
                  resetForm();
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createTextDocument(true)}
                disabled={creating || !content.trim()}
                className="gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detailed Create Dialog */}
      <Dialog open={detailedCreateOpen} onOpenChange={(open) => {
        setDetailedCreateOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Create Text Document
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Document Title *</Label>
              <Input
                id="doc-title"
                placeholder="e.g., Interview Questions, Company Overview, Benefits Summary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                Give your document a descriptive name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-content">Document Content *</Label>
              <Textarea
                id="doc-content"
                placeholder="Type or paste your content here...&#10;&#10;You can include:&#10;• Interview questions&#10;• Company information&#10;• Benefits details&#10;• Technical requirements&#10;• Any other relevant text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="font-mono text-sm resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Plain text format - perfect for quick reference documents</span>
                <span>{content.length} characters</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setDetailedCreateOpen(false);
                  resetForm();
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createTextDocument(false)}
                disabled={creating || !content.trim() || !title.trim()}
                className="gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Create Document
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
