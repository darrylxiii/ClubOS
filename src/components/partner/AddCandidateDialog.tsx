import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Sparkles, Mail, Phone, Linkedin, FileText, Zap } from "lucide-react";

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  onCandidateAdded: () => void;
}

export const AddCandidateDialog = ({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  onCandidateAdded,
}: AddCandidateDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [scrapingLinkedIn, setScrapingLinkedIn] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "linkedin">("manual");
  const [linkedinUrlForScrape, setLinkedinUrlForScrape] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    phone: "",
    linkedinUrl: "",
    currentCompany: "",
    currentTitle: "",
    notes: "",
    startStageIndex: "0",
  });

  const handleLinkedInScrape = async () => {
    if (!linkedinUrlForScrape) {
      toast.error("Please enter a LinkedIn URL");
      return;
    }

    setScrapingLinkedIn(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-scraper', {
        body: { linkedinUrl: linkedinUrlForScrape }
      });

      if (error) throw error;

      if (data.success) {
        // Auto-fill form with scraped data
        setFormData({
          fullName: data.data.full_name || "",
          email: data.data.email || "",
          phone: "",
          linkedinUrl: data.data.linkedin_url || linkedinUrlForScrape,
          currentCompany: data.data.current_company || "",
          currentTitle: data.data.current_title || "",
          notes: `LinkedIn import: ${data.data.ai_summary || ""}\n\nSkills: ${(data.data.skills || []).join(", ")}`,
          startStageIndex: "0",
        });
        setAddMode("manual");
        toast.success("LinkedIn profile imported successfully!", {
          description: "Review and submit the candidate details"
        });
      }
    } catch (error) {
      console.error("Error scraping LinkedIn:", error);
      toast.error("Failed to import LinkedIn profile");
    } finally {
      setScrapingLinkedIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not authenticated");

      // Create or update candidate profile in new candidate_profiles table
      const { data: candidateProfile, error: profileError } = await supabase
        .from("candidate_profiles")
        .upsert({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          linkedin_url: formData.linkedinUrl,
          current_company: formData.currentCompany,
          current_title: formData.currentTitle,
          source_channel: 'manual',
          created_by: adminUser.id,
          tags: ['manually_added']
        }, {
          onConflict: 'email',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      const candidateId = candidateProfile.id;

      // Try to find matching user profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", formData.email)
        .maybeSingle();

      const userId = existingProfile?.id || adminUser.id;

      // Create application with metadata containing candidate info
      const { error: appError } = await supabase.from("applications").insert({
        user_id: userId,
        job_id: jobId,
        position: jobTitle,
        company_name: formData.currentCompany || "External Candidate",
        current_stage_index: parseInt(formData.startStageIndex),
        status: "active",
        stages: [
          {
            name: "Admin Added",
            status: "in_progress",
            started_at: new Date().toISOString(),
            notes: `Candidate: ${formData.fullName}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nLinkedIn: ${formData.linkedinUrl}\nCurrent: ${formData.currentTitle} at ${formData.currentCompany}\n\n${formData.notes}`,
          },
        ],
      });

      if (appError) throw appError;

      // Add admin comment with full candidate details
      const { data: application } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", userId)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (application) {
        // Log candidate addition as interaction
        await supabase.from("candidate_interactions").insert({
          candidate_id: candidateId,
          application_id: application.id,
          interaction_type: 'status_change',
          interaction_direction: 'internal',
          title: 'Candidate Added to Pipeline',
          content: `🎯 **Admin-Added Candidate**

**Name:** ${formData.fullName}
**Email:** ${formData.email}
**Phone:** ${formData.phone || "N/A"}
**LinkedIn:** ${formData.linkedinUrl || "N/A"}
**Current Position:** ${formData.currentTitle || "N/A"} at ${formData.currentCompany || "N/A"}

**Notes:** ${formData.notes || "No additional notes"}`,
          metadata: {
            job_id: jobId,
            job_title: jobTitle,
            starting_stage: formData.startStageIndex
          },
          created_by: adminUser.id,
          is_internal: true,
          visible_to_candidate: false
        });

        // Also add to legacy candidate_comments for backward compatibility
        await supabase.from("candidate_comments").insert({
          application_id: application.id,
          user_id: adminUser.id,
          comment: `🎯 **Admin-Added Candidate** - See interaction log for details`,
          is_internal: true,
        });
      }

      toast.success("Candidate added successfully", {
        description: `${formData.fullName} has been added to the pipeline`,
      });

      onCandidateAdded();
      onOpenChange(false);
      setFormData({
        email: "",
        fullName: "",
        phone: "",
        linkedinUrl: "",
        currentCompany: "",
        currentTitle: "",
        notes: "",
        startStageIndex: "0",
      });
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast.error("Failed to add candidate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-gradient-to-br from-accent to-purple-500">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black uppercase">
                Add Candidate
              </DialogTitle>
              <DialogDescription className="text-base">
                Manually add a candidate to <strong>{jobTitle}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "manual" | "linkedin")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <UserPlus className="w-4 h-4 mr-2" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="linkedin">
              <Zap className="w-4 h-4 mr-2" />
              LinkedIn Quick Add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="linkedin" className="space-y-4 mt-4">
            <div className="p-6 bg-gradient-to-br from-accent/5 to-purple-500/5 rounded-lg border border-accent/20">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-full bg-accent/10">
                  <Linkedin className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">LinkedIn Profile Importer</h3>
                  <p className="text-sm text-muted-foreground">
                    Paste a LinkedIn profile URL and we'll automatically extract all relevant candidate information.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="linkedinImport">LinkedIn Profile URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="linkedinImport"
                    placeholder="https://www.linkedin.com/in/username"
                    value={linkedinUrlForScrape}
                    onChange={(e) => setLinkedinUrlForScrape(e.target.value)}
                    disabled={scrapingLinkedIn}
                  />
                  <Button
                    type="button"
                    onClick={handleLinkedInScrape}
                    disabled={scrapingLinkedIn || !linkedinUrlForScrape}
                    className="gap-2 bg-gradient-to-r from-accent to-purple-500"
                  >
                    {scrapingLinkedIn ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Import Profile
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI will automatically fill in candidate details from their LinkedIn profile
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Full Name *
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-accent" />
                Phone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-accent" />
                LinkedIn URL
              </Label>
              <Input
                id="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={(e) =>
                  setFormData({ ...formData, linkedinUrl: e.target.value })
                }
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentCompany">Current Company</Label>
              <Input
                id="currentCompany"
                value={formData.currentCompany}
                onChange={(e) =>
                  setFormData({ ...formData, currentCompany: e.target.value })
                }
                placeholder="Tech Corp"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentTitle">Current Title</Label>
              <Input
                id="currentTitle"
                value={formData.currentTitle}
                onChange={(e) =>
                  setFormData({ ...formData, currentTitle: e.target.value })
                }
                placeholder="Senior Developer"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startStageIndex">Starting Pipeline Stage</Label>
            <Select
              value={formData.startStageIndex}
              onValueChange={(value) =>
                setFormData({ ...formData, startStageIndex: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Applied</SelectItem>
                <SelectItem value="1">Screening</SelectItem>
                <SelectItem value="2">Interview</SelectItem>
                <SelectItem value="3">Final Round</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              Admin Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={4}
              placeholder="Why this candidate? Source? Special considerations?"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 bg-gradient-to-r from-accent to-purple-500"
            >
              {loading ? (
                "Adding..."
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add Candidate
                </>
              )}
            </Button>
          </div>
        </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
