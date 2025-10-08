import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Linkedin, Mail, Phone, Calendar, UserPlus, Download } from "lucide-react";

interface CandidateQuickActionsProps {
  candidateId: string;
  candidateEmail: string;
  onRefresh: () => void;
}

export const CandidateQuickActions = ({ 
  candidateId, 
  candidateEmail, 
  onRefresh 
}: CandidateQuickActionsProps) => {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false);

  const handleLinkedInScrape = async () => {
    if (!linkedinUrl.trim()) {
      toast.error("Please enter a LinkedIn URL");
      return;
    }

    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("linkedin-scraper", {
        body: { linkedinUrl },
      });

      if (error) throw error;

      if (data?.candidateData) {
        // Update candidate profile with scraped data
        const { error: updateError } = await supabase
          .from("candidate_profiles")
          .update({
            full_name: data.candidateData.full_name || undefined,
            current_title: data.candidateData.current_title || undefined,
            current_company: data.candidateData.current_company || undefined,
            linkedin_url: linkedinUrl,
            avatar_url: data.candidateData.avatar_url || undefined,
            years_of_experience: data.candidateData.years_of_experience || undefined,
            skills: data.candidateData.skills || undefined,
            work_history: data.candidateData.work_history || undefined,
            education: data.candidateData.education || undefined,
            ai_summary: data.candidateData.ai_summary || undefined,
          })
          .eq("id", candidateId);

        if (updateError) throw updateError;

        toast.success("LinkedIn profile imported successfully!");
        setLinkedinDialogOpen(false);
        setLinkedinUrl("");
        onRefresh();
      }
    } catch (error) {
      console.error("Error scraping LinkedIn:", error);
      toast.error("Failed to import LinkedIn profile");
    } finally {
      setScraping(false);
    }
  };

  const handleSendEmail = () => {
    window.location.href = `mailto:${candidateEmail}`;
  };

  const handleExportProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `candidate-${data.full_name.replace(/\s+/g, "-").toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Profile exported successfully");
    } catch (error) {
      console.error("Error exporting profile:", error);
      toast.error("Failed to export profile");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={linkedinDialogOpen} onOpenChange={setLinkedinDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Linkedin className="w-4 h-4 mr-2" />
            Import LinkedIn
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from LinkedIn</DialogTitle>
            <DialogDescription>
              Enter a LinkedIn profile URL to automatically enrich this candidate's profile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
              <Input
                id="linkedin-url"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              />
            </div>
            <Button
              onClick={handleLinkedInScrape}
              disabled={scraping}
              className="w-full"
            >
              {scraping ? "Importing..." : "Import Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" onClick={handleSendEmail}>
        <Mail className="w-4 h-4 mr-2" />
        Email
      </Button>

      <Button variant="outline" size="sm" onClick={handleExportProfile}>
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
    </div>
  );
};
