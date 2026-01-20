import { useState } from "react";
import { Linkedin, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LinkedInJobImportProps {
  companyId: string;
}

export function LinkedInJobImport({ companyId }: LinkedInJobImportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkedInAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call edge function to initiate LinkedIn OAuth
      const { data, error: functionError } = await supabase.functions.invoke(
        'linkedin-job-import',
        {
          body: { action: 'initiate', companyId }
        }
      );

      if (functionError) throw functionError;

      if (data?.authUrl) {
        // Open LinkedIn OAuth in a new window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const authWindow = window.open(
          data.authUrl,
          'LinkedIn Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Listen for OAuth callback
        const checkWindow = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkWindow);
            checkImportStatus();
          }
        }, 500);
      }
    } catch (err: any) {
      console.error('LinkedIn auth error:', err);
      setError(err.message || 'Failed to initiate LinkedIn authorization');
    } finally {
      setLoading(false);
    }
  };

  const checkImportStatus = async () => {
    try {
      const { data, error: statusError } = await supabase.functions.invoke(
        'linkedin-job-import',
        {
          body: { action: 'status', companyId }
        }
      );

      if (statusError) throw statusError;

      if (data?.status === 'completed') {
        toast.success(`Successfully imported ${data.jobsImported} jobs`);
        setOpen(false);
      } else if (data?.status === 'failed') {
        setError(data.errorMessage || 'Import failed');
      }
    } catch (err: any) {
      console.error('Status check error:', err);
      setError(err.message || 'Failed to check import status');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Linkedin className="h-4 w-4" />
          Import from LinkedIn
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Jobs from LinkedIn</DialogTitle>
          <DialogDescription>
            Connect your LinkedIn account to automatically import your company's job postings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will import all active job postings from your LinkedIn company page. 
              Make sure you have admin access to your company's LinkedIn page.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleLinkedInAuth}
              disabled={loading}
              className="w-full gap-2"
            >
              <Linkedin className="h-4 w-4" />
              {loading ? 'Connecting...' : 'Connect LinkedIn'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              By connecting, you authorize The Quantum Club to access your company's 
              job postings on LinkedIn.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
