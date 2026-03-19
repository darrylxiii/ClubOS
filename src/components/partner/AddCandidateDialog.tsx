import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Sparkles, Mail, Phone, Linkedin, FileText, Zap, Check, ChevronsUpDown, Award, Info, Search, Users, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { DuplicateCandidateDialog } from "./DuplicateCandidateDialog";
import { useRole } from "@/contexts/RoleContext";

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  onCandidateAdded: () => void;
}

interface ExistingCandidateResult {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  current_title: string | null;
  current_company: string | null;
  linkedin_url: string | null;
  tags: string[] | null;
}

interface PipelineStage {
  name: string;
  [key: string]: unknown;
}

const DEFAULT_STAGES: PipelineStage[] = [
  { name: "Applied" },
  { name: "Screening" },
  { name: "Interview" },
  { name: "Final Round" },
];

export const AddCandidateDialog = ({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  onCandidateAdded,
}: AddCandidateDialogProps) => {
  const { currentRole } = useRole();
  const isAdmin = currentRole === 'admin' || currentRole === 'strategist';

  const [loading, setLoading] = useState(false);
  const [scrapingLinkedIn, setScrapingLinkedIn] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "linkedin" | "existing">("manual");
  const [existingSearch, setExistingSearch] = useState("");
  const [existingResults, setExistingResults] = useState<ExistingCandidateResult[]>([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [selectedExistingCandidate, setSelectedExistingCandidate] = useState<ExistingCandidateResult | null>(null);
  const [existingJobCandidateIds, setExistingJobCandidateIds] = useState<Set<string>>(new Set());
  const [linkedinUrlForScrape, setLinkedinUrlForScrape] = useState("");
  const [linkedinImported, setLinkedinImported] = useState(false);
  const [creditTo, setCreditTo] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [creditPopoverOpen, setCreditPopoverOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches DuplicateCandidateDialog's expected shape from join queries
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateMatchType, setDuplicateMatchType] = useState<"name" | "linkedin" | "both">("name");
  const [proceedWithDuplicate, setProceedWithDuplicate] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scrapedAvatarUrl, setScrapedAvatarUrl] = useState<string | null>(null);
  const [jobPipelineStages, setJobPipelineStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
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

  // Reset all state on dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAddMode("manual");
      setExistingSearch("");
      setExistingResults([]);
      setSelectedExistingCandidate(null);
      setExistingJobCandidateIds(new Set());
      setSubmitError(null);
      setLoading(false);
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
      setLinkedinImported(false);
      setScrapedAvatarUrl(null);
      setCreditTo([]);
      setResumeFile(null);
      setLinkedinUrlForScrape("");
      setProceedWithDuplicate(false);
      setDuplicateCandidates([]);
      setShowDuplicateDialog(false);
    }
    onOpenChange(newOpen);
  };

  // Fetch job's real pipeline stages
  useEffect(() => {
    if (!open || !jobId) return;
    const fetchStages = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("pipeline_stages")
        .eq("id", jobId)
        .maybeSingle();

      if (data?.pipeline_stages && Array.isArray(data.pipeline_stages) && data.pipeline_stages.length > 0) {
        setJobPipelineStages(data.pipeline_stages as PipelineStage[]);
      } else {
        setJobPipelineStages(DEFAULT_STAGES);
      }
    };
    fetchStages();
  }, [open, jobId]);

  // Load current user and team members
  useEffect(() => {
    const loadTeamMembers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Auto-assign to current user
      setCreditTo([user.id]);

      // Load team members (admin and partner roles)
      const { data: members } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .neq("id", user.id)
        .order("full_name");

      if (members) {
        setTeamMembers([
          { id: user.id, name: "Me", email: user.email || "" },
          ...members.map(m => ({ id: m.id, name: m.full_name || m.email || "Unknown", email: m.email || "" }))
        ]);
      }
    };

    if (open) {
      loadTeamMembers();
      setSubmitError(null);
    }
  }, [open]);

  // Search existing candidates when in "existing" mode
  useEffect(() => {
    if (addMode !== "existing" || !existingSearch.trim()) {
      setExistingResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setExistingLoading(true);
      try {
        const q = `%${existingSearch.trim()}%`;
        const { data } = await supabase
          .from("candidate_profiles")
          .select("id, full_name, email, avatar_url, current_title, current_company, linkedin_url, tags")
          .or(`full_name.ilike.${q},email.ilike.${q},linkedin_url.ilike.${q}`)
          .order("full_name")
          .limit(20);

        // Check which are already in this job
        if (data && data.length > 0) {
          const ids = data.map((c) => c.id);
          const { data: existing } = await supabase
            .from("applications")
            .select("candidate_id")
            .eq("job_id", jobId)
            .in("candidate_id", ids)
            .not("status", "in", "(rejected,withdrawn)");

          const existingSet = new Set((existing || []).map((a) => a.candidate_id).filter(Boolean) as string[]);
          setExistingJobCandidateIds(existingSet);
        }

        setExistingResults((data || []) as ExistingCandidateResult[]);
      } finally {
        setExistingLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [existingSearch, addMode, jobId]);

  // Client-side URL name extraction as fallback
  const extractNameFromLinkedInUrl = (url: string): string => {
    const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (match && match[1]) {
      let namePart = match[1].replace(/\/\d+$/, '').split('/')[0];
      namePart = namePart.replace(/-[a-z0-9]{6,}$/i, '');
      const parts = namePart.split('-').filter(word => {
        const digitCount = (word.match(/\d/g) || []).length;
        return digitCount < word.length / 2;
      });
      return parts
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return '';
  };

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
        setScrapedAvatarUrl(data.data.avatar_url || null);
        
        setFormData({
          fullName: data.data.full_name || "",
          email: data.data.email || "",
          phone: "",
          linkedinUrl: data.data.linkedin_url || linkedinUrlForScrape,
          currentCompany: data.data.current_company || "",
          currentTitle: data.data.current_title || "",
          notes: data.data.ai_summary || `LinkedIn import\n\nSkills: ${(data.data.skills || []).join(", ")}`,
          startStageIndex: "0",
        });
        setLinkedinImported(true);
        setAddMode("manual");
        toast.success("Profile imported from LinkedIn", {
          description: data.data.avatar_url 
            ? "Name and photo extracted successfully" 
            : "Name extracted - please verify details"
        });
      }
    } catch (error: unknown) {
      console.error("Error scraping LinkedIn:", error);
      const err = error as { message?: string; name?: string };
      
      const isTimeoutError = err.message?.includes('Failed to fetch') || 
                              err.message?.includes('FunctionsFetchError') ||
                              err.message?.includes('timeout') ||
                              err.name === 'FunctionsFetchError';
      
      if (isTimeoutError) {
        const extractedName = extractNameFromLinkedInUrl(linkedinUrlForScrape);
        
        if (extractedName) {
          setFormData(prev => ({
            ...prev,
            fullName: extractedName,
            linkedinUrl: linkedinUrlForScrape,
          }));
          setLinkedinImported(true);
          setAddMode("manual");
          toast.warning("LinkedIn import timed out", {
            description: `Name extracted as "${extractedName}" - please verify and complete details manually`
          });
        } else {
          setFormData(prev => ({
            ...prev,
            linkedinUrl: linkedinUrlForScrape,
          }));
          setAddMode("manual");
          toast.error("LinkedIn import timed out", {
            description: "Please enter candidate details manually"
          });
        }
      } else {
        toast.error("Failed to import LinkedIn profile", {
          description: "Please try again or enter details manually"
        });
      }
    } finally {
      setScrapingLinkedIn(false);
    }
  };

  const checkForDuplicates = async () => {
    if (!formData.fullName && !formData.linkedinUrl && !formData.email) return [];

    try {
      let duplicates: any[] = [];
      
      if (formData.email) {
        const { data: emailMatches } = await supabase
          .from('applications')
          .select(`
            id,
            candidate_id,
            current_stage_index,
            candidate_profiles!applications_candidate_id_fkey(
              id,
              full_name,
              email,
              linkedin_url,
              current_title,
              current_company
            )
          `)
          .eq('job_id', jobId)
          .ilike('candidate_profiles.email', formData.email.trim())
          .neq('status', 'rejected')
          .limit(3);
        
        if (emailMatches && emailMatches.length > 0) {
          duplicates = emailMatches.filter(d => d.candidate_profiles);
          if (duplicates.length > 0) {
            setDuplicateMatchType('name'); // closest available
            return duplicates;
          }
        }
      }
      
      if (formData.linkedinUrl) {
        const normalizedUrl = formData.linkedinUrl.trim().split('?')[0].replace(/\/$/, '');
        const { data: linkedinMatches } = await supabase
          .from('applications')
          .select(`
            id,
            candidate_id,
            current_stage_index,
            candidate_profiles!applications_candidate_id_fkey(
              id,
              full_name,
              email,
              linkedin_url,
              current_title,
              current_company
            )
          `)
          .eq('job_id', jobId)
          .ilike('candidate_profiles.linkedin_url', `%${normalizedUrl}%`)
          .limit(3);
        
        if (linkedinMatches && linkedinMatches.length > 0) {
          duplicates = linkedinMatches.filter(d => d.candidate_profiles);
          if (duplicates.length > 0) {
            setDuplicateMatchType('linkedin');
            return duplicates;
          }
        }
      }
      
      if (formData.fullName) {
        const { data: nameMatches } = await supabase
          .from('applications')
          .select(`
            id,
            candidate_id,
            current_stage_index,
            candidate_profiles!applications_candidate_id_fkey(
              id,
              full_name,
              email,
              linkedin_url,
              current_title,
              current_company
            )
          `)
          .eq('job_id', jobId)
          .ilike('candidate_profiles.full_name', `%${formData.fullName.trim()}%`)
          .limit(3);
        
        if (nameMatches && nameMatches.length > 0) {
          duplicates = nameMatches.filter(d => d.candidate_profiles);
          if (duplicates.length > 0) {
            setDuplicateMatchType('name');
            return duplicates;
          }
        }
      }
      
      return [];
    } catch (error) {
      console.error('Duplicate check error:', error);
      toast.warning("Could not check for duplicates", {
        description: "Please verify manually that this candidate doesn't already exist"
      });
      return [];
    }
  };

  const proceedWithSubmission = async () => {
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not authenticated");

      let candidateId: string;
      let candidateName: string;

      // BRANCH: If existing candidate selected, skip profile creation
      if (selectedExistingCandidate) {
        candidateId = selectedExistingCandidate.id;
        candidateName = selectedExistingCandidate.full_name || 'Unknown';
      } else {
        // STEP 1: Create STANDALONE candidate profile (NO USER LINKING)
        const { data: candidateProfile, error: profileError } = await supabase
          .from("candidate_profiles")
          .insert({
            user_id: null,
            full_name: formData.fullName,
            email: formData.email || null,
            phone: formData.phone || null,
            linkedin_url: formData.linkedinUrl || null,
            current_company: formData.currentCompany || null,
            current_title: formData.currentTitle || null,
            avatar_url: scrapedAvatarUrl,
            source_channel: linkedinImported ? 'linkedin_import' : 'manual_admin',
            created_by: adminUser.id,
            tags: linkedinImported 
              ? ['linkedin_imported', 'standalone_profile'] 
              : ['manually_added', 'standalone_profile']
          })
          .select()
          .single();

        if (profileError) {
          console.error('❌ [Add Candidate] Profile creation failed:', profileError);
          if (profileError.code === '23505') {
            const identifier = formData.email || formData.linkedinUrl || formData.fullName;
            throw new Error(`A candidate matching "${identifier}" already exists. Please check for duplicates or update the existing candidate.`);
          }
          if (profileError.message?.includes('RLS') || profileError.code === '42501') {
            throw new Error('You do not have permission to add candidates. Please contact an admin.');
          }
          throw new Error(profileError.message || 'Failed to create candidate profile');
        }

        candidateId = candidateProfile.id;
        candidateName = formData.fullName;
      }

      // STEP 2: Fetch candidate's user_id if they already have an account
      let linkedUserId: string | null = null;
      if (selectedExistingCandidate) {
        const { data: cpData } = await supabase
          .from('candidate_profiles')
          .select('user_id')
          .eq('id', candidateId)
          .maybeSingle();
        linkedUserId = cpData?.user_id || null;
      }

      // STEP 3: Create application
      const primarySourcer = creditTo.length > 0 ? creditTo[0] : adminUser.id;
      
      const { data: newApplication, error: appError } = await supabase
        .from("applications")
        .insert({
          user_id: linkedUserId,
          candidate_id: candidateId,
          job_id: jobId,
          position: jobTitle,
          sourced_by: primarySourcer,
          company_name: selectedExistingCandidate
            ? (selectedExistingCandidate.current_company || "External Candidate")
            : (formData.currentCompany || "External Candidate"),
          current_stage_index: parseInt(formData.startStageIndex),
          status: "active",
          stages: [
            {
              name: linkedinImported ? "LinkedIn Import" : "Admin Added",
              status: "in_progress",
              started_at: new Date().toISOString(),
              notes: formData.notes || null,
            },
          ],
        })
        .select('id, job_id, candidate_id, current_stage_index, created_at, sourced_by')
        .single();

      if (appError) {
        console.error('❌ [Add Candidate] Application INSERT failed:', appError);

        // Delete orphaned candidate profile only if we just created it
        if (!selectedExistingCandidate) {
          await supabase
            .from('candidate_profiles')
            .delete()
            .eq('id', candidateId);
        }

        if (appError.code === '23505' && appError.message?.includes('idx_unique_active_application_per_job')) {
          throw new Error(`DUPLICATE_IN_JOB: This candidate is already in the "${jobTitle}" pipeline. To add them again, first reject or withdraw their existing application.`);
        } else if (appError.code === '42501' || appError.message?.toLowerCase().includes('rls') || appError.message?.toLowerCase().includes('permission')) {
          throw new Error('PERMISSION_ERROR: You do not have permission to add applications. Your user role may not be properly configured. Please contact an administrator.');
        } else if (appError.code === '23503') {
          const { data: jobExists } = await supabase
            .from('jobs')
            .select('id')
            .eq('id', jobId)
            .maybeSingle();
            
          const { data: candidateExists } = await supabase
            .from('candidate_profiles')
            .select('id')
            .eq('id', candidateId)
            .maybeSingle();
            
          if (!jobExists) {
            throw new Error('FK_ERROR: The selected job no longer exists. Please refresh and select a different job.');
          } else if (!candidateExists) {
            throw new Error('FK_ERROR: Candidate profile creation was interrupted. Please try again.');
          }
          
          throw new Error('FK_ERROR: Database constraint error. Please refresh and try again.');
        } else {
          throw new Error(`DB_ERROR: Failed to create application - ${appError.message} (code: ${appError.code || 'unknown'})`);
        }
      }

      if (!newApplication) {
        if (!selectedExistingCandidate) {
          await supabase.from('candidate_profiles').delete().eq('id', candidateId);
        }
        throw new Error('Application was not created. Please try again or contact support.');
      }

      const application = newApplication;

      // STEP 3: Store sourcing credits
      if (creditTo.length > 0 && application) {
        const sourcingCredits = creditTo.map((userId, idx) => ({
          application_id: application.id,
          user_id: userId,
          credit_type: idx === 0 ? 'sourcer' : 'assist',
          credit_percentage: 100 / creditTo.length,
          created_by: adminUser.id
        }));
        
        await supabase.from('sourcing_credits').insert(sourcingCredits);
      }

      // STEP 4: Log candidate addition as interaction
      // Use existing candidate data or formData depending on flow
      const logName = selectedExistingCandidate ? (selectedExistingCandidate.full_name || 'Unknown') : candidateName;
      const logEmail = selectedExistingCandidate ? (selectedExistingCandidate.email || 'N/A') : (formData.email || 'N/A');
      const logLinkedin = selectedExistingCandidate ? (selectedExistingCandidate.linkedin_url || 'N/A') : (formData.linkedinUrl || 'N/A');
      const logTitle = selectedExistingCandidate ? (selectedExistingCandidate.current_title || 'N/A') : (formData.currentTitle || 'N/A');
      const logCompany = selectedExistingCandidate ? (selectedExistingCandidate.current_company || 'N/A') : (formData.currentCompany || 'N/A');
      const startingStageName = jobPipelineStages[parseInt(formData.startStageIndex)]?.name || 'Applied';

      if (application) {
        try {
          await supabase.from("candidate_interactions").insert({
            candidate_id: candidateId,
            application_id: application.id,
            interaction_type: 'status_change',
            interaction_direction: 'internal',
            title: selectedExistingCandidate ? 'Existing Candidate Added to Pipeline' : 'Candidate Added to Pipeline',
            content: `🎯 **${selectedExistingCandidate ? 'Existing Candidate Linked' : 'Admin-Added Candidate'}**${linkedinImported ? ' 📎 **LinkedIn Import**' : ''}

**Name:** ${logName}
**Email:** ${logEmail}
**LinkedIn:** ${logLinkedin}
**Current Position:** ${logTitle} at ${logCompany}
${linkedinImported ? '\n**Source:** LinkedIn profile imported' : ''}
${creditTo.length > 0 ? `\n**Credit:** ${creditTo.length} team member${creditTo.length > 1 ? 's' : ''}` : ''}

**Notes:** ${formData.notes || "No additional notes"}`,
            metadata: {
              job_id: jobId,
              job_title: jobTitle,
              starting_stage: formData.startStageIndex,
              starting_stage_name: startingStageName,
              linked_existing: !!selectedExistingCandidate,
              credit_to: creditTo,
              duplicate_override: proceedWithDuplicate,
              duplicate_matched_by: proceedWithDuplicate ? duplicateMatchType : null
            },
            created_by: adminUser.id,
            is_internal: true,
            visible_to_candidate: false
          });
        } catch (interactionError) {
          console.error('[Add Candidate] Failed to log interaction:', interactionError);
          toast.error("Candidate added but interaction log failed");
        }

        try {
          await supabase.from("candidate_comments").insert({
            application_id: application.id,
            user_id: adminUser.id,
            comment: `🎯 **Admin-Added Candidate** - See interaction log for details`,
            is_internal: true,
          });
        } catch {
          // Non-critical
        }

        try {
          await supabase.from('pipeline_audit_logs').insert({
            job_id: jobId,
            user_id: adminUser.id,
            action: 'candidate_added',
            stage_data: {
              candidate_name: logName,
              candidate_email: logEmail,
              starting_stage: formData.startStageIndex,
              starting_stage_name: startingStageName,
              linkedin_imported: linkedinImported,
              user_linked: false,
              source: selectedExistingCandidate ? 'existing_candidate_linked' : 'manual_add'
            },
            metadata: {
              candidate_id: candidateId,
              application_id: application.id,
              duplicate_override: proceedWithDuplicate,
              credit_to: creditTo
            }
          });
        } catch (auditError) {
          console.error('[Add Candidate] Failed to log audit:', auditError);
          toast.error("Candidate added but audit log failed");
        }
      }

      toast.success("Candidate added successfully", {
        description: `${logName} has been added to the pipeline${selectedExistingCandidate ? ' (existing profile linked)' : ''}`,
      });

      // Auto-enrich from LinkedIn + calculate skill match (fire-and-forget)
      const linkedinPresent = selectedExistingCandidate
        ? !!selectedExistingCandidate.linkedin_url
        : !!formData.linkedinUrl;
      if (linkedinPresent) {
        import('@/utils/triggerAutoEnrich').then(({ triggerAutoEnrich }) => {
          triggerAutoEnrich([candidateId], jobId);
        });
      }

      onCandidateAdded();
      handleOpenChange(false);
    } catch (error: unknown) {
      console.error("Error adding candidate:", error);
      const err = error as { message?: string; code?: string };
      
      let errorMsg = "An unexpected error occurred. Please try again.";
      
      if (err.message?.startsWith('DUPLICATE_IN_JOB:')) {
        errorMsg = err.message.replace('DUPLICATE_IN_JOB: ', '');
      } else if (err.message?.startsWith('PERMISSION_ERROR:')) {
        errorMsg = err.message.replace('PERMISSION_ERROR: ', '');
      } else if (err.message?.startsWith('FK_ERROR:')) {
        errorMsg = err.message.replace('FK_ERROR: ', '');
      } else if (err.message?.startsWith('DB_ERROR:')) {
        errorMsg = err.message.replace('DB_ERROR: ', '');
      } else if (err.message?.includes('duplicate') || err.code === '23505') {
        errorMsg = "A candidate with this information already exists.";
      } else if (err.code === '23503') {
        errorMsg = "Unable to link candidate data. The job may no longer exist.";
      } else if (err.message?.includes('permission') || err.message?.includes('RLS') || err.code === '42501') {
        errorMsg = "You don't have permission to add candidates. Please contact an administrator to verify your account has been set up correctly.";
      } else {
        errorMsg = err.message || "Failed to add candidate. Please try again.";
      }
      
      setSubmitError(errorMsg);
      
      toast.error("Failed to Add Candidate", {
        description: errorMsg,
        duration: 8000
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      toast.error("Full name is required");
      return false;
    }
    
    if (!formData.linkedinUrl && !formData.email && !formData.phone) {
      toast.error("Please provide at least one contact method", {
        description: "LinkedIn URL (preferred), email, or phone number"
      });
      return false;
    }
    
    if (!formData.linkedinUrl) {
      toast.warning("LinkedIn URL recommended", {
        description: "Adding a LinkedIn profile helps with candidate enrichment"
      });
    }
    
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Please enter a valid email address");
        return false;
      }
    }
    
    if (formData.linkedinUrl && !formData.linkedinUrl.startsWith('http')) {
      toast.warning("LinkedIn URL should start with http:// or https://");
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      if (!proceedWithDuplicate) {
        const duplicates = await checkForDuplicates();
        
        if (duplicates && duplicates.length > 0) {
          setDuplicateCandidates(duplicates);
          setShowDuplicateDialog(true);
          setLoading(false);
          return;
        }
      }

      const addingToast = toast.loading("Adding candidate to pipeline...");
      
      try {
        await proceedWithSubmission();
        toast.dismiss(addingToast);
      } catch (error) {
        toast.dismiss(addingToast);
        throw error;
      }
    } catch (error: unknown) {
      console.error("Error in submission flow:", error);
      const err = error as { message?: string; code?: string };
      
      if (err.message?.includes('email already exists') || err.message?.includes('duplicate') || err.code === '23505') {
        toast.error("Duplicate Email Detected", {
          description: "A candidate with this email already exists. Please search for the existing candidate or use a different email.",
          duration: 6000
        });
      } else if (err.code === '23503') {
        toast.error("Database Error", {
          description: "Unable to link candidate data. Please try again or contact support if the issue persists.",
          duration: 5000
        });
      } else if (err.message?.includes('permission') || err.message?.includes('RLS') || err.code === '42501') {
        toast.error("Permission Denied", {
          description: "You don't have permission to add candidates. Please contact an administrator.",
          duration: 5000
        });
      } else if (err.message?.includes('unique constraint')) {
        toast.error("Duplicate Candidate", {
          description: "This candidate already exists in the system. Please check existing applications.",
          duration: 5000
        });
      } else {
        toast.error("Failed to Add Candidate", {
          description: err.message || "An unexpected error occurred. Please try again or contact support.",
          duration: 5000
        });
      }
      
      setLoading(false);
    }
  };

  const handleDuplicateProceed = async () => {
    setShowDuplicateDialog(false);
    setProceedWithDuplicate(true);
    setLoading(true);
    try {
      await proceedWithSubmission();
    } catch {
      setLoading(false);
    }
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateDialog(false);
    setDuplicateCandidates([]);
    setProceedWithDuplicate(false);
    setLoading(false);
  };

  return (
    <>
      <DuplicateCandidateDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        duplicates={duplicateCandidates}
        matchType={duplicateMatchType}
        jobTitle={jobTitle}
        onProceed={handleDuplicateProceed}
        onCancel={handleDuplicateCancel}
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
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
                Add a candidate to <strong>{jobTitle}</strong>. Provide at least a LinkedIn URL or email to get started. You can merge with their user account later if they sign up.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Info banner explaining workflow */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Step 1: Add candidate manually</strong>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Add candidates to track them in your pipeline. If they sign up later, 
                you can merge their profile with their account.
              </p>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-destructive" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-destructive mb-1">
                  Failed to Add Candidate
                </h4>
                <p className="text-sm text-destructive/90">
                  {submitError}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSubmitError(null)}
                className="flex-shrink-0 h-6 w-6 p-0"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </Button>
            </div>
          </div>
        )}

        <Tabs value={addMode} onValueChange={(v) => { setAddMode(v as "manual" | "linkedin" | "existing"); setSelectedExistingCandidate(null); }} className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="manual">
              <UserPlus className="w-4 h-4 mr-2" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="linkedin">
              <Zap className="w-4 h-4 mr-2" />
              LinkedIn
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="existing">
                <Users className="w-4 h-4 mr-2" />
                Existing
              </TabsTrigger>
            )}
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

          {/* Existing Candidate Tab — Admin/Strategist only */}
          {isAdmin && (
            <TabsContent value="existing" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg border border-border/40 bg-card/30">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-full bg-accent/10">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Link Existing Candidate</h3>
                    <p className="text-sm text-muted-foreground">
                      Search for a candidate already in the system and add them to this job without creating a duplicate profile.
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or LinkedIn URL..."
                    value={existingSearch}
                    onChange={(e) => setExistingSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Results */}
                <ScrollArea className="h-52 rounded-lg border border-border/30">
                  {existingLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : existingSearch.trim() && existingResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No candidates found.</p>
                  ) : !existingSearch.trim() ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Start typing to search candidates.</p>
                  ) : (
                    <div className="p-1 space-y-1">
                      {existingResults.map((c) => {
                        const inPipeline = existingJobCandidateIds.has(c.id);
                        const isSelected = selectedExistingCandidate?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            disabled={inPipeline}
                            onClick={() => setSelectedExistingCandidate(isSelected ? null : c)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                              inPipeline
                                ? "opacity-50 cursor-not-allowed"
                                : isSelected
                                  ? "bg-accent/10 border border-accent/30"
                                  : "hover:bg-foreground/5 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={c.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {(c.full_name || "?").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{c.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {c.current_title ? `${c.current_title}${c.current_company ? ` at ${c.current_company}` : ""}` : c.email || "No details"}
                                </p>
                              </div>
                              {inPipeline ? (
                                <Badge variant="outline" className="text-[10px] shrink-0 border-muted-foreground/30">
                                  Already in pipeline
                                </Badge>
                              ) : isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {/* Stage picker + credit + submit for existing */}
                {selectedExistingCandidate && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-border/30">
                    <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                      <p className="text-sm font-medium">
                        Selected: <strong>{selectedExistingCandidate.full_name}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedExistingCandidate.email || selectedExistingCandidate.linkedin_url || "No contact info"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Starting Pipeline Stage</Label>
                      <Select
                        value={formData.startStageIndex}
                        onValueChange={(value) => setFormData({ ...formData, startStageIndex: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {jobPipelineStages.map((stage, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Credit-to picker */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-accent" />
                        Credit Assignment
                      </Label>
                      <Popover open={creditPopoverOpen} onOpenChange={setCreditPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {creditTo.length === 0
                              ? "Select team members..."
                              : `${creditTo.length} selected`}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search team members..." />
                            <CommandEmpty>No team member found.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                              {teamMembers.map((member) => (
                                <CommandItem
                                  key={member.id}
                                  onSelect={() => {
                                    setCreditTo(
                                      creditTo.includes(member.id)
                                        ? creditTo.filter((id) => id !== member.id)
                                        : [...creditTo, member.id]
                                    );
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      creditTo.includes(member.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{member.name}</span>
                                    <span className="text-xs text-muted-foreground">{member.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                        placeholder="Why are you adding this candidate to this job?"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={loading}
                        onClick={async () => {
                          setLoading(true);
                          try {
                            await proceedWithSubmission();
                          } catch {
                            // handled inside
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Add to Pipeline
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

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
                disabled={linkedinImported && formData.fullName.length > 0}
                className={linkedinImported && formData.fullName.length > 0 ? "bg-muted" : ""}
              />
              {linkedinImported && formData.fullName.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Linkedin className="w-3 h-3" />
                  Name extracted from LinkedIn profile
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-accent" />
                LinkedIn Profile (Recommended)
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
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent" />
                Email Address (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-accent" />
                Phone Number (Optional)
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
                {jobPipelineStages.map((stage, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {stage.name}
                  </SelectItem>
                ))}
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

          <div className="space-y-2">
            <Label htmlFor="resume" className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              Resume / CV
            </Label>
            <Input
              id="resume"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            {resumeFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {resumeFile.name}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="linkedinImported"
              checked={linkedinImported}
              onCheckedChange={(checked) => setLinkedinImported(checked as boolean)}
            />
            <Label
              htmlFor="linkedinImported"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
            >
              <Linkedin className="w-4 h-4 text-accent" />
              LinkedIn profile imported
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Award className="w-4 h-4 text-accent" />
              Credit Assignment
            </Label>
            <Popover open={creditPopoverOpen} onOpenChange={setCreditPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {creditTo.length === 0
                    ? "Select team members..."
                    : `${creditTo.length} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search team members..." />
                  <CommandEmpty>No team member found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {teamMembers.map((member) => (
                      <CommandItem
                        key={member.id}
                        onSelect={() => {
                          setCreditTo(
                            creditTo.includes(member.id)
                              ? creditTo.filter((id) => id !== member.id)
                              : [...creditTo, member.id]
                          );
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            creditTo.includes(member.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{member.name}</span>
                          <span className="text-xs text-muted-foreground">{member.email}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Select team members who should receive credit for this candidate
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 bg-gradient-to-r from-accent to-purple-500"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
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
    </>
  );
};
