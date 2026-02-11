import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TextDocumentCreatorProps {
  jobId: string;
  onDocumentCreated: () => void;
}

export const TextDocumentCreator = ({ jobId, onDocumentCreated }: TextDocumentCreatorProps) => {
  const [detailedCreateOpen, setDetailedCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setTitle("");
    setContent("");
  };

  const createTextDocument = async () => {
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a document title");
      return;
    }

    setCreating(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const documentTitle = title.trim();
      
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

      // Add new document with uploader info
      const updatedDocs = [
        ...currentDocs,
        {
          url: fileName,
          name: `${documentTitle}.txt`,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user.id
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
      setDetailedCreateOpen(false);
      onDocumentCreated();
    } catch (error: unknown) {
      console.error('Error creating text document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* Create Button */}
      <Button
        onClick={() => setDetailedCreateOpen(true)}
        variant="outline"
        className="gap-2"
        type="button"
      >
        <FileText className="w-4 h-4" />
        Create Text Doc
      </Button>

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
                onClick={createTextDocument}
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

