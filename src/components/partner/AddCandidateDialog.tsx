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
import { UserPlus, Sparkles, Mail, Phone, Linkedin, FileText, Zap, Check, ChevronsUpDown, Award, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { DuplicateCandidateDialog } from "./DuplicateCandidateDialog";

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
  const [linkedinImported, setLinkedinImported] = useState(false);
  const [creditTo, setCreditTo] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [creditPopoverOpen, setCreditPopoverOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateMatchType, setDuplicateMatchType] = useState<"name" | "linkedin" | "both">("name");
  const [proceedWithDuplicate, setProceedWithDuplicate] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
          notes: data.data.ai_summary || `LinkedIn import\n\nSkills: ${(data.data.skills || []).join(", ")}`,
          startStageIndex: "0",
        });
        setLinkedinImported(true);
        setAddMode("manual");
        toast.success("Name extracted from LinkedIn", {
          description: "Please verify and fill in missing details from their profile"
        });
      }
    } catch (error) {
      console.error("Error scraping LinkedIn:", error);
      toast.error("Failed to import LinkedIn profile");
    } finally {
      setScrapingLinkedIn(false);
    }
  };

  const checkForDuplicates = async () => {
    // Only check if we have at least one identifier
    if (!formData.fullName && !formData.linkedinUrl && !formData.email) return [];

    try {
      let duplicates: any[] = [];
      
      // Check by EMAIL (if provided) - query through applications to ignore orphaned profiles
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
            setDuplicateMatchType('email' as any);
            return duplicates;
          }
        }
      }
      
      // Check by LinkedIn URL (if no email match)
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
      
      // Check by name (least reliable, only if no email/LinkedIn matches)
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
      console.log('🎯 [Add Candidate] Starting submission:', {
        fullName: formData.fullName,
        linkedinUrl: formData.linkedinUrl,
        email: formData.email,
        jobId,
        jobTitle,
        timestamp: new Date().toISOString()
      });

      // Get current admin user
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not authenticated");

      // STEP 1: Create STANDALONE candidate profile (NO USER LINKING)
      const { data: candidateProfile, error: profileError } = await supabase
        .from("candidate_profiles")
        .insert({
          user_id: null, // ALWAYS null for manual additions
          full_name: formData.fullName,
          email: formData.email || null,
          phone: formData.phone || null,
          linkedin_url: formData.linkedinUrl || null,
          current_company: formData.currentCompany || null,
          current_title: formData.currentTitle || null,
          avatar_url: null, // No avatar for manual entries
          source_channel: 'manual_admin',
          created_by: adminUser.id,
          tags: ['manually_added', 'standalone_profile']
        })
        .select()
        .single();

      if (profileError) {
        console.error('❌ [Add Candidate] Profile creation failed:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        
        // Specific error messages
        if (profileError.code === '23505') {
          const identifier = formData.email || formData.linkedinUrl || formData.fullName;
          throw new Error(`A candidate matching "${identifier}" already exists. Please check for duplicates or update the existing candidate.`);
        }
        if (profileError.message?.includes('RLS') || profileError.code === '42501') {
          throw new Error('You do not have permission to add candidates. Please contact an admin.');
        }
        
        throw new Error(profileError.message || 'Failed to create candidate profile');
      }

      console.log('✅ [Add Candidate] Standalone profile created:', {
        candidateId: candidateProfile.id,
        fullName: candidateProfile.full_name
      });

      const candidateId = candidateProfile.id;

      // STEP 2: Create application (also with null user_id for standalone candidates)
      // Set sourced_by to first credited team member (primary sourcer)
      const primarySourcer = creditTo.length > 0 ? creditTo[0] : adminUser.id;
      
      const { data: newApplication, error: appError } = await supabase
        .from("applications")
        .insert({
          user_id: null, // ALWAYS null for manually-added candidates
          candidate_id: candidateId,
          job_id: jobId,
          position: jobTitle,
          sourced_by: primarySourcer, // Track who sourced this candidate
          company_name: formData.currentCompany || "External Candidate",
          current_stage_index: parseInt(formData.startStageIndex),
          status: "active",
          stages: [
            {
              name: "Admin Added",
              status: "in_progress",
              started_at: new Date().toISOString(),
              notes: `Candidate: ${formData.fullName}\nEmail: ${formData.email || 'N/A'}\nPhone: ${formData.phone || 'N/A'}\nLinkedIn: ${formData.linkedinUrl || 'N/A'}\nCurrent: ${formData.currentTitle || 'N/A'} at ${formData.currentCompany || 'N/A'}\n\n${formData.notes}`,
            },
          ],
        })
        .select('id, job_id, candidate_id, current_stage_index, created_at, sourced_by')
        .single();

      if (appError) {
        console.error('❌ [Add Candidate] Application INSERT failed:', {
          code: appError.code,
          message: appError.message,
          details: appError.details,
          hint: appError.hint,
          postgresError: appError
        });

        // Delete orphaned candidate profile
        console.log('🧹 [Add Candidate] Cleaning up orphaned candidate profile:', candidateId);
        await supabase
          .from('candidate_profiles')
          .delete()
          .eq('id', candidateId);

        // Throw specific error based on type
        if (appError.code === '23505' && appError.message?.includes('idx_unique_active_application_per_job')) {
          throw new Error(`DUPLICATE_IN_JOB: This candidate is already in the "${jobTitle}" pipeline. To add them again, first reject or withdraw their existing application.`);
        } else if (appError.code === '42501' || appError.message?.toLowerCase().includes('rls') || appError.message?.toLowerCase().includes('permission')) {
          throw new Error('PERMISSION_ERROR: You do not have permission to add applications. Your user role may not be properly configured. Please contact an administrator.');
        } else if (appError.code === '23503') {
          // FK violation - diagnose which reference is invalid
          console.error('❌ [Add Candidate] FK violation details:', {
            candidateId,
            jobId,
            constraint: appError.message
          });
          
          // Check which reference is invalid
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
        console.error('❌ [Add Candidate] Application was not created (no data returned)');
        // Clean up orphaned candidate profile
        await supabase.from('candidate_profiles').delete().eq('id', candidateId);
        throw new Error('Application was not created. Please try again or contact support.');
      }

      console.log('✅ [Add Candidate] Application created successfully:', {
        applicationId: newApplication.id,
        candidateId: newApplication.candidate_id,
        jobId: newApplication.job_id
      });

      const application = newApplication;

      // STEP 3: Store sourcing credits for potential splits/commission tracking
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
      if (application) {
        await supabase.from("candidate_interactions").insert({
          candidate_id: candidateId,
          application_id: application.id,
          interaction_type: 'status_change',
          interaction_direction: 'internal',
          title: 'Candidate Added to Pipeline',
          content: `🎯 **Admin-Added Candidate**${linkedinImported ? ' 📎 **LinkedIn Import**' : ''}

**Name:** ${formData.fullName}
**Email:** ${formData.email || 'N/A'}
**Phone:** ${formData.phone || "N/A"}
**LinkedIn:** ${formData.linkedinUrl || "N/A"}
**Current Position:** ${formData.currentTitle || "N/A"} at ${formData.currentCompany || "N/A"}
${linkedinImported ? '\n**Source:** LinkedIn profile imported' : ''}
${creditTo.length > 0 ? `\n**Credit:** ${creditTo.length} team member${creditTo.length > 1 ? 's' : ''}` : ''}

**Notes:** ${formData.notes || "No additional notes"}`,
          metadata: {
            job_id: jobId,
            job_title: jobTitle,
            starting_stage: formData.startStageIndex,
            linkedin_imported: linkedinImported,
            credit_to: creditTo,
            duplicate_override: proceedWithDuplicate,
            duplicate_matched_by: proceedWithDuplicate ? duplicateMatchType : null
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

        // Log to pipeline audit log for team activity tracking
        const { data: jobStages } = await supabase
          .from('jobs')
          .select('pipeline_stages')
          .eq('id', jobId)
          .single();

        const stages = jobStages?.pipeline_stages || [];
        const startingStageName = stages[parseInt(formData.startStageIndex)]?.name || 'Applied';

        await supabase.from('pipeline_audit_logs').insert({
          job_id: jobId,
          user_id: adminUser.id,
          action: 'candidate_added',
          stage_data: {
            candidate_name: formData.fullName,
            candidate_email: formData.email || 'N/A',
            starting_stage: formData.startStageIndex,
            starting_stage_name: startingStageName,
            linkedin_imported: linkedinImported,
            user_linked: false // Always false for manual additions
          },
          metadata: {
            candidate_id: candidateId,
            application_id: application.id,
            duplicate_override: proceedWithDuplicate,
            credit_to: creditTo
          }
        });
      }

      toast.success("Candidate added successfully", {
        description: `${formData.fullName} has been added to the pipeline as a standalone candidate`,
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
      setLinkedinImported(false);
      setCreditTo([]);
      setResumeFile(null);
      setLinkedinUrlForScrape("");
      setProceedWithDuplicate(false);
      setDuplicateCandidates([]);
      setShowDuplicateDialog(false);
    } catch (error: any) {
      console.error("Error adding candidate:", error);
      
      // Set visible error message
      let errorMsg = "An unexpected error occurred. Please try again.";
      
      if (error.message?.startsWith('DUPLICATE_IN_JOB:')) {
        errorMsg = error.message.replace('DUPLICATE_IN_JOB: ', '');
      } else if (error.message?.startsWith('PERMISSION_ERROR:')) {
        errorMsg = error.message.replace('PERMISSION_ERROR: ', '');
      } else if (error.message?.startsWith('FK_ERROR:')) {
        errorMsg = error.message.replace('FK_ERROR: ', '');
      } else if (error.message?.startsWith('DB_ERROR:')) {
        errorMsg = error.message.replace('DB_ERROR: ', '');
      } else if (error.message?.includes('duplicate') || error.code === '23505') {
        errorMsg = "A candidate with this information already exists.";
      } else if (error.code === '23503') {
        errorMsg = "Unable to link candidate data. The job may no longer exist.";
      } else if (error.message?.includes('permission') || error.message?.includes('RLS') || error.code === '42501') {
        errorMsg = "You don't have permission to add candidates. Please contact an administrator to verify your account has been set up correctly.";
      } else {
        errorMsg = error.message || "Failed to add candidate. Please try again.";
      }
      
      setSubmitError(errorMsg);
      
      // Also show toast
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
    
    // At least ONE contact method required (LinkedIn preferred)
    if (!formData.linkedinUrl && !formData.email && !formData.phone) {
      toast.error("Please provide at least one contact method", {
        description: "LinkedIn URL (preferred), email, or phone number"
      });
      return false;
    }
    
    // Warning if no LinkedIn
    if (!formData.linkedinUrl) {
      toast.warning("LinkedIn URL recommended", {
        description: "Adding a LinkedIn profile helps with candidate enrichment"
      });
    }
    
    // Email validation (optional but must be valid if provided)
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
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      // Check for duplicates first (unless already proceeding with duplicate)
      if (!proceedWithDuplicate) {
        const duplicates = await checkForDuplicates();
        
        if (duplicates && duplicates.length > 0) {
          setDuplicateCandidates(duplicates);
          setShowDuplicateDialog(true);
          setLoading(false);
          return;
        }
      }

      // Show loading toast
      const addingToast = toast.loading("Adding candidate to pipeline...");
      
      try {
        await proceedWithSubmission();
        toast.dismiss(addingToast);
      } catch (error) {
        toast.dismiss(addingToast);
        throw error;
      }
    } catch (error: any) {
      console.error("Error in submission flow:", error);
      
      // Provide specific, actionable error messages
      if (error.message?.includes('email already exists') || error.message?.includes('duplicate') || error.code === '23505') {
        toast.error("Duplicate Email Detected", {
          description: "A candidate with this email already exists. Please search for the existing candidate or use a different email.",
          duration: 6000
        });
      } else if (error.code === '23503') {
        toast.error("Database Error", {
          description: "Unable to link candidate data. Please try again or contact support if the issue persists.",
          duration: 5000
        });
      } else if (error.message?.includes('permission') || error.message?.includes('RLS') || error.code === '42501') {
        toast.error("Permission Denied", {
          description: "You don't have permission to add candidates. Please contact an administrator.",
          duration: 5000
        });
      } else if (error.message?.includes('unique constraint')) {
        toast.error("Duplicate Candidate", {
          description: "This candidate already exists in the system. Please check existing applications.",
          duration: 5000
        });
      } else {
        toast.error("Failed to Add Candidate", {
          description: error.message || "An unexpected error occurred. Please try again or contact support.",
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
    } catch (error) {
      // Error already handled in proceedWithSubmission
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
    </>
  );
};
