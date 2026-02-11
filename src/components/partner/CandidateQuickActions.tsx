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
import { Linkedin, Mail, Download, UserPlus } from "lucide-react";
import { CandidateInvitationDialog } from "./CandidateInvitationDialog";

interface CandidateQuickActionsProps {
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  onRefresh: () => void;
}

export const CandidateQuickActions = ({ 
  candidateId, 
  candidateEmail,
  candidateName,
  onRefresh 
}: CandidateQuickActionsProps) => {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [linkedinDialogOpen, setLinkedinDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

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

      if (data?.success && data?.data) {
        const d = data.data;
        const updates: Record<string, unknown> = {};

        if (d.full_name) updates.full_name = d.full_name;
        if (d.current_title) updates.current_title = d.current_title;
        if (d.current_company) updates.current_company = d.current_company;
        if (d.avatar_url) updates.avatar_url = d.avatar_url;
        
        if (d.years_of_experience) updates.years_of_experience = d.years_of_experience;
        if (d.work_history?.length) updates.work_history = d.work_history;
        if (d.education?.length) updates.education = d.education;
        if (d.skills?.length) updates.skills = d.skills;
        if (d.ai_summary) updates.ai_summary = d.ai_summary;
        if (d.linkedin_profile_data) updates.linkedin_profile_data = d.linkedin_profile_data;
        updates.linkedin_url = linkedinUrl;
        updates.enrichment_last_run = new Date().toISOString();

        const { error: updateError } = await supabase
          .from("candidate_profiles")
          .update(updates)
          .eq("id", candidateId);

        if (updateError) throw updateError;

        toast.success("LinkedIn profile imported successfully.");
        setLinkedinDialogOpen(false);
        setLinkedinUrl("");
        onRefresh();
      } else {
        throw new Error(data?.error || "Scraper returned no data");
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

      <Button variant="outline" size="sm" onClick={() => setInviteDialogOpen(true)}>
        <UserPlus className="w-4 h-4 mr-2" />
        Invite to Platform
      </Button>

      <CandidateInvitationDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        candidateId={candidateId}
        candidateEmail={candidateEmail}
        candidateName={candidateName}
        suggestedJobs={[]}
      />
    </div>
  );
};
