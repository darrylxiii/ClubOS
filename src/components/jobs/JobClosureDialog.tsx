import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  CheckCircle2, XCircle, Pause, Ban, 
  Star, TrendingUp, Users, Clock,
  ChevronLeft, ChevronRight, Loader2, X, Award, Plus
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
interface JobClosureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  applications: any[];
  onComplete: () => void;
}

type ClosureType = "hired" | "not_filled" | "cancelled" | "on_hold";

const CLOSURE_TYPES = [
  { value: "hired", label: "Hired", icon: CheckCircle2, color: "text-green-500", description: "Candidate was successfully placed" },
  { value: "not_filled", label: "Not Filled", icon: XCircle, color: "text-destructive", description: "Role closed without a hire" },
  { value: "cancelled", label: "Cancelled", icon: Ban, color: "text-muted-foreground", description: "Client cancelled the search" },
  { value: "on_hold", label: "On Hold", icon: Pause, color: "text-amber-500", description: "Temporarily paused" },
];

const LOSS_REASONS = [
  { value: "budget_cut", label: "Budget Cut" },
  { value: "role_eliminated", label: "Role Eliminated" },
  { value: "hired_internally", label: "Hired Internally" },
  { value: "hired_competitor", label: "Hired via Competitor" },
  { value: "requirements_changed", label: "Requirements Changed" },
  { value: "no_qualified_candidates", label: "No Qualified Candidates" },
  { value: "timing_issues", label: "Timing Issues" },
  { value: "client_unresponsive", label: "Client Unresponsive" },
  { value: "other", label: "Other" },
];

const KEY_LEARNINGS_OPTIONS = [
  "Salary expectations too low",
  "Role requirements unclear",
  "Strong candidate pipeline",
  "Client decision speed slow",
  "Market very competitive",
  "Good client communication",
  "Remote flexibility important",
  "Technical assessment helpful",
  "Referrals produced quality candidates",
  "JD needed refinement",
];

const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <div className="space-y-2">
    <Label className="text-sm">{label}</Label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 transition-colors"
        >
          <Star
            className={cn(
              "w-6 h-6 transition-colors",
              star <= value ? "text-amber-400 fill-amber-400" : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  </div>
);

export function JobClosureDialog({ open, onOpenChange, job, applications, onComplete }: JobClosureDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Closure type & date
  const [closureType, setClosureType] = useState<ClosureType | "">("");
  const [actualClosingDate, setActualClosingDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Step 2: Type-specific details
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [actualSalary, setActualSalary] = useState("");
  const [placementFee, setPlacementFee] = useState("");
  const [placementFeeOverridden, setPlacementFeeOverridden] = useState(false);
  const [lossReason, setLossReason] = useState("");
  
  // Sourcing credit override
  const [sourcedBy, setSourcedBy] = useState<string>("");
  const [originalSourcedBy, setOriginalSourcedBy] = useState<string>(""); // Track original for override detection
  const [sourcerDisplayName, setSourcerDisplayName] = useState<string>(""); // Display name for read-only mode
  const [isOverridingSourcer, setIsOverridingSourcer] = useState(false); // Toggle for override mode
  const [addedBy, setAddedBy] = useState<string>("");
  const [addedByName, setAddedByName] = useState<string>("");
  const [sourcerOverrideReason, setSourcerOverrideReason] = useState("");
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; avatarUrl?: string }>>([]);
  const [sourcerAvatarUrl, setSourcerAvatarUrl] = useState<string>("");
  const [isSplittingCredit, setIsSplittingCredit] = useState(false);
  const [sourcingCredits, setSourcingCredits] = useState<Array<{ userId: string; name: string; percentage: number }>>([]);
  
  // Step 3: Takeaways
  const [whatWentWell, setWhatWentWell] = useState("");
  const [whatCouldImprove, setWhatCouldImprove] = useState("");
  const [candidateQualityRating, setCandidateQualityRating] = useState(0);
  const [clientResponsivenessRating, setClientResponsivenessRating] = useState(0);
  const [marketDifficultyRating, setMarketDifficultyRating] = useState(0);
  const [keyLearnings, setKeyLearnings] = useState<string[]>([]);
  const [recommendationsForFuture, setRecommendationsForFuture] = useState("");
  const [notes, setNotes] = useState("");
  
  // Get fee percentage from job or company
  const feePercentage = job?.job_fee_percentage || job?.companies?.placement_fee_percentage || 0;
  const calculatedFee = actualSalary && feePercentage 
    ? Math.round(parseFloat(actualSalary) * (feePercentage / 100))
    : null;
  
  // Auto-calculate placement fee when salary changes (if not manually overridden)
  useEffect(() => {
    if (calculatedFee && !placementFeeOverridden) {
      setPlacementFee(calculatedFee.toString());
    }
  }, [calculatedFee, placementFeeOverridden]);

  // Calculate salary variance
  const salaryMin = job?.salary_min || 0;
  const salaryMax = job?.salary_max || 0;
  const salaryMidpoint = (salaryMin + salaryMax) / 2;
  const actualSalaryNum = parseFloat(actualSalary) || 0;
  const salaryVariancePercent = salaryMidpoint > 0 && actualSalaryNum > 0
    ? ((actualSalaryNum - salaryMidpoint) / salaryMidpoint) * 100
    : null;
  const salaryVarianceDirection = salaryVariancePercent !== null
    ? salaryVariancePercent > 5 ? 'above' : salaryVariancePercent < -5 ? 'below' : 'within'
    : null;

  // Load team members for sourcer override (Admins + Strategists + active employees)
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        // Get all admin and strategist user IDs
        const { data: roleUsers, error: roleError } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "strategist"]);
        
        if (roleError) {
          console.error("Error fetching user_roles:", roleError);
        }

        // Get all active employee user IDs
        const { data: employeeUsers, error: empError } = await supabase
          .from("employee_profiles")
          .select("user_id")
          .eq("is_active", true);
        
        if (empError) {
          console.error("Error fetching employee_profiles:", empError);
        }

        // Union all unique user IDs
        const userIdSet = new Set<string>();
        roleUsers?.forEach(r => userIdSet.add(r.user_id));
        employeeUsers?.forEach(e => userIdSet.add(e.user_id));
        
        const userIds = Array.from(userIdSet);
        
        if (userIds.length === 0) {
          console.warn("No team members found (admins/strategists/employees)");
          setTeamMembers([]);
          return;
        }

        // Fetch profiles for these users (including avatar_url)
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        
        if (profileError) {
          console.error("Error fetching profiles:", profileError);
          toast.error("Could not load team members");
          return;
        }

        const members = (profiles || [])
          .map(p => ({ id: p.id, name: p.full_name || 'Unknown', avatarUrl: p.avatar_url || undefined }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setTeamMembers(members);
      } catch (err) {
        console.error("Error loading team members:", err);
        toast.error("Could not load team members");
      }
    };
    loadTeamMembers();
  }, []);

  // Load sourcer info directly when candidate is selected
  // Uses the applications prop directly to avoid query issues
  const loadSourcerForApplication = async (appId: string, members: Array<{ id: string; name: string; avatarUrl?: string }>) => {
    if (!appId) {
      setSourcedBy("");
      setOriginalSourcedBy("");
      setSourcerDisplayName("");
      setSourcerAvatarUrl("");
      setAddedBy("");
      setAddedByName("");
      setIsOverridingSourcer(false);
      setSourcerOverrideReason("");
      return;
    }

    try {
      // Use the applications prop directly - no need to re-query
      const selectedApp = applications.find(a => a.id === appId);
      
      // Get sourced_by directly from the application object
      const appSourcedBy = selectedApp?.sourced_by || null;
      const candidateId = selectedApp?.candidate_id || null;
      
      console.log("[JobClosureDialog] Using application from prop:", {
        appId,
        appSourcedBy,
        candidateId,
        foundInProp: !!selectedApp
      });

      // Get creator ID from candidate_profiles if needed (separate query)
      let creatorId: string | null = null;
      if (candidateId) {
        const { data: candidate, error: candidateError } = await supabase
          .from("candidate_profiles")
          .select("created_by")
          .eq("id", candidateId)
          .maybeSingle();
        
        if (candidateError) {
          console.warn("[JobClosureDialog] candidate_profiles query failed (RLS?):", candidateError);
        }
        creatorId = candidate?.created_by || null;
      }
      
      // Determine sourcer ID using cascading fallback:
      // 1. application.sourced_by (primary - who sourced/submitted this candidate)
      // 2. candidate_profiles.created_by (who added the candidate to the system)
      // 3. Current logged-in user (fallback)
      const finalSourcerId = appSourcedBy || creatorId || user?.id || "";
      
      console.log("[JobClosureDialog] Sourcer resolution:", {
        appId,
        appSourcedBy,
        creatorId,
        currentUserId: user?.id,
        finalSourcerId,
        teamMembersCount: members.length
      });

      setAddedBy(creatorId || "");
      setSourcedBy(finalSourcerId);
      setOriginalSourcedBy(finalSourcerId);
      setIsOverridingSourcer(false);
      setSourcerOverrideReason("");

      // Resolve display name and avatar
      let displayName = "Unknown";
      let avatarUrl = "";

      // Try team members first (fastest)
      const memberMatch = members.find(m => m.id === finalSourcerId);
      if (memberMatch) {
        displayName = memberMatch.name;
        avatarUrl = memberMatch.avatarUrl || "";
      } else if (finalSourcerId) {
        // Fetch profile directly
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", finalSourcerId)
          .maybeSingle();
        
        if (profileError) {
          console.warn("[JobClosureDialog] Profile query failed:", profileError);
        }
        displayName = profile?.full_name || "Unknown";
        avatarUrl = profile?.avatar_url || "";
      }

      setSourcerDisplayName(displayName);
      setSourcerAvatarUrl(avatarUrl);
      
      // Get added by name (the creator)
      if (creatorId) {
        const creatorMatch = members.find(m => m.id === creatorId);
        if (creatorMatch) {
          setAddedByName(creatorMatch.name);
        } else {
          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", creatorId)
            .maybeSingle();
          setAddedByName(creatorProfile?.full_name || "Unknown");
        }
      }
    } catch (err) {
      console.error("[JobClosureDialog] Error loading sourcer:", err);
      setSourcerDisplayName("Unknown");
      setSourcerAvatarUrl("");
    }
  };

  // Pipeline metrics (calculated)
  const totalApplicants = applications.length;
  const candidatesInterviewed = applications.filter(a => a.current_stage_index >= 2).length;
  const candidatesFinalRound = applications.filter(a => a.current_stage_index >= 3).length;
  const activeApplications = applications.filter(a => a.status === 'active');

  // Eligible candidates for hire selection
  const eligibleForHire = applications.filter(a => 
    a.status === 'active' && a.current_stage_index >= 2
  );

  const resetForm = () => {
    setStep(1);
    setClosureType("");
    setActualClosingDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedApplicationId("");
    setActualSalary("");
    setPlacementFee("");
    setPlacementFeeOverridden(false);
    setLossReason("");
    setSourcedBy("");
    setOriginalSourcedBy("");
    setSourcerDisplayName("");
    setSourcerAvatarUrl("");
    setIsOverridingSourcer(false);
    setAddedBy("");
    setAddedByName("");
    setSourcerOverrideReason("");
    setIsSplittingCredit(false);
    setSourcingCredits([]);
    setWhatWentWell("");
    setWhatCouldImprove("");
    setCandidateQualityRating(0);
    setClientResponsivenessRating(0);
    setMarketDifficultyRating(0);
    setKeyLearnings([]);
    setRecommendationsForFuture("");
    setNotes("");
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const canProceedStep1 = closureType && actualClosingDate;
  const canProceedStep2 = closureType === "hired" 
    ? selectedApplicationId 
    : closureType === "not_filled" 
      ? lossReason 
      : true;

  const handleSubmit = async () => {
    if (!closureType) return;
    
    // Validate split credits total 100%
    if (isSplittingCredit && sourcingCredits.length > 0) {
      const totalPercentage = sourcingCredits.reduce((sum, c) => sum + c.percentage, 0);
      if (totalPercentage !== 100) {
        toast.error("Sourcing credit percentages must total 100%");
        return;
      }
      if (sourcingCredits.some(c => !c.userId)) {
        toast.error("Please select a team member for each credit split");
        return;
      }
    }
    
    setLoading(true);
    try {
      // Calculate time to fill for hired closures
      const timeToFillDays = closureType === "hired" && job.created_at
        ? Math.ceil((new Date(actualClosingDate).getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Determine primary sourcer for single-select or split mode
      let primarySourcerId = sourcedBy;
      let primarySourcerName = '';
      
      if (isSplittingCredit && sourcingCredits.length > 0) {
        // Primary sourcer is the one with highest percentage
        const primaryCredit = sourcingCredits.reduce((a, b) => 
          a.percentage > b.percentage ? a : b
        );
        primarySourcerId = primaryCredit.userId;
        primarySourcerName = primaryCredit.name;
      } else {
        primarySourcerName = isOverridingSourcer 
          ? teamMembers.find(m => m.id === sourcedBy)?.name || 'Unknown'
          : sourcerDisplayName || addedByName;
      }

      const isOverride = isSplittingCredit || isOverridingSourcer;

      // Create closure record with sourcing and salary variance data
      const closureData = {
        job_id: job.id,
        closure_type: closureType,
        actual_closing_date: actualClosingDate,
        hired_application_id: closureType === "hired" ? selectedApplicationId : null,
        actual_salary: actualSalary ? parseFloat(actualSalary) : null,
        placement_fee: placementFee ? parseFloat(placementFee) : null,
        time_to_fill_days: timeToFillDays,
        loss_reason: closureType === "not_filled" ? lossReason : null,
        what_went_well: whatWentWell || null,
        what_could_improve: whatCouldImprove || null,
        candidate_quality_rating: candidateQualityRating || null,
        client_responsiveness_rating: clientResponsivenessRating || null,
        market_difficulty_rating: marketDifficultyRating || null,
        key_learnings: keyLearnings.length > 0 ? keyLearnings : null,
        recommendations_for_future: recommendationsForFuture || null,
        total_applicants: totalApplicants,
        candidates_interviewed: candidatesInterviewed,
        candidates_final_round: candidatesFinalRound,
        closed_by: user?.id,
        notes: notes || null,
        // New sourcing attribution fields
        sourced_by: primarySourcerId || null,
        sourcer_name: primarySourcerName || null,
        added_by: addedBy || null,
        added_by_name: addedByName || null,
        sourcer_override_reason: isOverride ? sourcerOverrideReason : null,
        // New salary variance fields
        estimated_salary_min: salaryMin || null,
        estimated_salary_max: salaryMax || null,
        salary_variance_percent: salaryVariancePercent || null,
        closer_name: user?.email || null, // Will be resolved to name if available
      };

      const { error: closureError } = await supabase
        .from('job_closures')
        .insert(closureData as any);

      if (closureError) throw closureError;

      // Update job status
      const newStatus = closureType === "on_hold" ? "on_hold" : "closed";
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          status: newStatus,
          closed_at: closureType !== "on_hold" ? new Date().toISOString() : null,
        })
        .eq('id', job.id);

      if (jobError) throw jobError;

      // If hired, update the application status
      if (closureType === "hired" && selectedApplicationId) {
        const { data: updatedApp, error: appError } = await supabase
          .from('applications')
          .update({ status: 'hired' })
          .eq('id', selectedApplicationId)
          .select('id, status, candidate_id')
          .single();

        if (appError || !updatedApp || updatedApp.status !== 'hired') {
          throw new Error(`Failed to update application to hired: ${appError?.message || 'No rows affected'}`);
        }

        // Explicitly create placement fee record with sourcing & variance data
        const feePercentage = job?.job_fee_percentage || job?.companies?.placement_fee_percentage || 20;
        const { error: feeError } = await supabase
          .from('placement_fees')
          .upsert({
            application_id: selectedApplicationId,
            job_id: job?.id,
            candidate_id: updatedApp.candidate_id,
            partner_company_id: job?.company_id,
            fee_percentage: feePercentage,
            candidate_salary: parseFloat(actualSalary),
            fee_amount: parseFloat(placementFee),
            currency_code: job?.currency || 'EUR',
            status: 'pending',
            hired_date: actualClosingDate,
            notes: isSplittingCredit 
              ? `Created on job closure - Split: ${sourcingCredits.map(c => `${c.name} ${c.percentage}%`).join(', ')}`
              : 'Created on job closure',
            // Sourcing attribution - use primary sourcer
            sourced_by: primarySourcerId || null,
            sourcer_name: primarySourcerName || null,
            added_by: addedBy || null,
            added_by_name: addedByName || null,
            sourcer_override_reason: isOverride ? sourcerOverrideReason : null,
            // Salary variance tracking
            estimated_salary_min: salaryMin || null,
            estimated_salary_max: salaryMax || null,
            salary_variance_percent: salaryVariancePercent || null,
            salary_variance_direction: salaryVarianceDirection || null,
            // Closer tracking
            closed_by: user?.id || null,
            closer_name: user?.email || null,
          }, { onConflict: 'application_id' });

        if (feeError) {
          console.warn("Placement fee insert failed (trigger may handle):", feeError);
        }

        // If splitting credit, save to sourcing_credits table
        if (isSplittingCredit && sourcingCredits.length > 0) {
          // Delete any existing sourcing credits for this application first
          await supabase
            .from('sourcing_credits')
            .delete()
            .eq('application_id', selectedApplicationId);

          // Insert new sourcing credits
          const { error: creditsError } = await supabase
            .from('sourcing_credits')
            .insert(
              sourcingCredits.filter(c => c.userId).map(credit => ({
                application_id: selectedApplicationId,
                user_id: credit.userId,
                credit_type: 'sourcer',
                credit_percentage: credit.percentage,
                notes: sourcerOverrideReason || null,
                created_by: user?.id
              }))
            );

          if (creditsError) {
            console.warn("Sourcing credits insert failed:", creditsError);
          }
        }

        // Close other active applications
        const otherActiveIds = activeApplications
          .filter(a => a.id !== selectedApplicationId)
          .map(a => a.id);

        if (otherActiveIds.length > 0) {
          await supabase
            .from('applications')
            .update({ status: 'closed' })
            .in('id', otherActiveIds);
        }
      } else if (closureType === "not_filled" || closureType === "cancelled") {
        // Close all active applications
        const activeIds = activeApplications.map(a => a.id);
        if (activeIds.length > 0) {
          await supabase
            .from('applications')
            .update({ status: 'closed' })
            .in('id', activeIds);
        }
      }

      toast.success(
        closureType === "hired" 
          ? "Job closed successfully - Congratulations on the placement!" 
          : closureType === "on_hold"
            ? "Job placed on hold"
            : "Job closed successfully"
      );
      
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error closing job:", error);
      toast.error(error.message || "Failed to close job");
    } finally {
      setLoading(false);
    }
  };

  const toggleLearning = (learning: string) => {
    setKeyLearnings(prev => 
      prev.includes(learning) 
        ? prev.filter(l => l !== learning)
        : [...prev, learning]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Close Job: {job?.title}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4 - {step === 1 ? "Closure Type" : step === 2 ? "Details" : step === 3 ? "Takeaways" : "Review"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step 1: Closure Type & Date */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>How is this job being closed?</Label>
              <RadioGroup value={closureType} onValueChange={(v) => setClosureType(v as ClosureType)}>
                <div className="grid grid-cols-2 gap-3">
                  {CLOSURE_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                        closureType === type.value 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <RadioGroupItem value={type.value} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <type.icon className={cn("w-4 h-4", type.color)} />
                          <span className="font-medium">{type.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closingDate">Actual Closing Date</Label>
              <Input
                id="closingDate"
                type="date"
                value={actualClosingDate}
                onChange={(e) => setActualClosingDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
              <p className="text-xs text-muted-foreground">
                When did this role actually close? (May differ from today)
              </p>
            </div>

            {/* Pipeline summary */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pipeline Summary</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold">{totalApplicants}</div>
                  <div className="text-xs text-muted-foreground">Total Applicants</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{candidatesInterviewed}</div>
                  <div className="text-xs text-muted-foreground">Interviewed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{candidatesFinalRound}</div>
                  <div className="text-xs text-muted-foreground">Final Round</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Type-specific details */}
        {step === 2 && (
          <div className="space-y-6">
            {closureType === "hired" && (
              <>
                <div className="space-y-2">
                  <Label>Select Hired Candidate *</Label>
                  <Select 
                    value={selectedApplicationId} 
                    onValueChange={(appId) => {
                      setSelectedApplicationId(appId);
                      // Immediately load sourcer info with current teamMembers
                      loadSourcerForApplication(appId, teamMembers);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose the hired candidate..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleForHire.length > 0 ? (
                        eligibleForHire.map((app) => (
                          <SelectItem key={app.id} value={app.id}>
                            {app.full_name || app.candidate_full_name || "Unknown"} - {app.current_title || app.candidate_title || "No title"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_none" disabled>
                          No eligible candidates (must be in interview stage+)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="actualSalary">Actual Salary</Label>
                    <Input
                      id="actualSalary"
                      type="number"
                      placeholder="e.g., 85000"
                      value={actualSalary}
                      onChange={(e) => setActualSalary(e.target.value)}
                    />
                    {feePercentage > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Fee will auto-calculate at {feePercentage}%
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="placementFee">
                      Placement Fee
                      {calculatedFee && !placementFeeOverridden && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Auto: €{calculatedFee.toLocaleString()}
                        </Badge>
                      )}
                    </Label>
                    <Input
                      id="placementFee"
                      type="number"
                      placeholder={calculatedFee ? `€${calculatedFee.toLocaleString()}` : "e.g., 17000"}
                      value={placementFee}
                      onChange={(e) => {
                        setPlacementFee(e.target.value);
                        setPlacementFeeOverridden(true);
                      }}
                    />
                    {placementFeeOverridden && calculatedFee && (
                      <button
                        type="button"
                        onClick={() => {
                          setPlacementFee(calculatedFee.toString());
                          setPlacementFeeOverridden(false);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Reset to calculated (€{calculatedFee.toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>

                {/* Salary Variance Display */}
                {actualSalary && salaryMin > 0 && (
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Salary Comparison</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Estimated Range:</span>
                        <div className="font-medium">€{salaryMin.toLocaleString()} - €{salaryMax.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Actual:</span>
                        <div className="font-medium">€{parseFloat(actualSalary).toLocaleString()}</div>
                      </div>
                    </div>
                    {salaryVariancePercent !== null && (
                      <div className="mt-3 flex items-center gap-2">
                        <Badge 
                          className={cn(
                            "text-xs",
                            salaryVarianceDirection === 'above' && "bg-green-500/10 text-green-700",
                            salaryVarianceDirection === 'below' && "bg-amber-500/10 text-amber-700",
                            salaryVarianceDirection === 'within' && "bg-blue-500/10 text-blue-700"
                          )}
                        >
                          {salaryVariancePercent > 0 ? '▲' : salaryVariancePercent < 0 ? '▼' : '●'} {salaryVariancePercent > 0 ? '+' : ''}{salaryVariancePercent.toFixed(1)}% {salaryVarianceDirection} estimate
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Sourcing Credit Override */}
                {selectedApplicationId && (
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Sourcing Credit</span>
                        {(isOverridingSourcer || isSplittingCredit) && (
                          <Badge variant="outline" className="text-xs">Overriding</Badge>
                        )}
                      </div>
                      {(isOverridingSourcer || isSplittingCredit) && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Split credit</Label>
                          <Switch 
                            checked={isSplittingCredit} 
                            onCheckedChange={(checked) => {
                              setIsSplittingCredit(checked);
                              if (checked && sourcingCredits.length === 0 && sourcedBy) {
                                const currentName = teamMembers.find(m => m.id === sourcedBy)?.name || sourcerDisplayName || '';
                                setSourcingCredits([{ userId: sourcedBy, name: currentName, percentage: 100 }]);
                              }
                            }} 
                          />
                        </div>
                      )}
                    </div>
                    
                    {addedBy && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Candidate added by: {addedByName || 'Unknown'}
                      </p>
                    )}

                    {/* Default: Read-only display with Override button */}
                    {!isOverridingSourcer && !isSplittingCredit ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Sourced by (gets commission)</Label>
                          <div className="mt-1 p-3 rounded-md bg-background border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                {sourcerAvatarUrl ? (
                                  <AvatarImage src={sourcerAvatarUrl} alt={sourcerDisplayName || "Sourcer"} />
                                ) : null}
                                <AvatarFallback className="text-xs">
                                  {sourcerDisplayName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">
                                {sourcerDisplayName || "Unknown"}
                              </span>
                            </div>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => setIsOverridingSourcer(true)}
                            >
                              Override
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This person will receive the commission for this placement.
                        </p>
                      </div>
                    ) : !isSplittingCredit && isOverridingSourcer ? (
                      /* Override mode: Editable dropdown + reason */
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Sourced by (gets commission)</Label>
                          <Select value={sourcedBy} onValueChange={setSourcedBy}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select who gets credit..." />
                            </SelectTrigger>
                            <SelectContent className="z-[999]">
                              {teamMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Reason for override</Label>
                          <Textarea
                            className="mt-1"
                            placeholder="Why is the sourcing credit being changed?"
                            value={sourcerOverrideReason}
                            onChange={(e) => setSourcerOverrideReason(e.target.value)}
                            rows={2}
                          />
                        </div>

                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSourcedBy(originalSourcedBy);
                            setIsOverridingSourcer(false);
                            setSourcerOverrideReason("");
                          }}
                        >
                          Cancel Override
                        </Button>
                        
                        <p className="text-xs text-muted-foreground">
                          This person will receive the commission for this placement.
                        </p>
                      </div>
                    ) : (
                      /* Split credit mode */
                      <div className="space-y-3">
                        <Label className="text-xs">Split commission between team members</Label>
                        {sourcingCredits.map((credit, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Select 
                              value={credit.userId} 
                              onValueChange={(v) => {
                                const member = teamMembers.find(m => m.id === v);
                                setSourcingCredits(prev => prev.map((c, i) => 
                                  i === index ? { ...c, userId: v, name: member?.name || '' } : c
                                ));
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select person..." />
                              </SelectTrigger>
                              <SelectContent className="z-[999]">
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={credit.percentage}
                              onChange={(e) => {
                                setSourcingCredits(prev => prev.map((c, i) => 
                                  i === index ? { ...c, percentage: Math.min(100, Math.max(0, Number(e.target.value))) } : c
                                ));
                              }}
                              className="w-20"
                              min={1}
                              max={100}
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                            {sourcingCredits.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSourcingCredits(prev => prev.filter((_, i) => i !== index))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSourcingCredits(prev => [...prev, { userId: '', name: '', percentage: 0 }])}
                          disabled={sourcingCredits.length >= 4}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Person
                        </Button>
                        
                        {(() => {
                          const totalPercentage = sourcingCredits.reduce((sum, c) => sum + c.percentage, 0);
                          return totalPercentage !== 100 && (
                            <p className="text-xs text-destructive">
                              Total must equal 100% (currently {totalPercentage}%)
                            </p>
                          );
                        })()}

                        <div>
                          <Label className="text-xs">Reason for override</Label>
                          <Textarea
                            className="mt-1"
                            placeholder="Why is the sourcing credit being changed?"
                            value={sourcerOverrideReason}
                            onChange={(e) => setSourcerOverrideReason(e.target.value)}
                            rows={2}
                          />
                        </div>

                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSourcedBy(originalSourcedBy);
                            setIsSplittingCredit(false);
                            setSourcingCredits([]);
                            setSourcerOverrideReason("");
                          }}
                        >
                          Cancel Override
                        </Button>
                        
                        <p className="text-xs text-muted-foreground">
                          Commission will be split according to the percentages above.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {closureType === "not_filled" && (
              <div className="space-y-2">
                <Label>Reason for Not Filling *</Label>
                <Select value={lossReason} onValueChange={setLossReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LOSS_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {closureType === "cancelled" && (
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Ban className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  The search was cancelled by the client. Continue to capture learnings.
                </p>
              </div>
            )}

            {closureType === "on_hold" && (
              <div className="p-4 rounded-lg bg-amber-500/10 text-center">
                <Pause className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  This job will be paused. You can reactivate it later from the job management page.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional context about this closure..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Step 3: Takeaways */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <StarRating
                value={candidateQualityRating}
                onChange={setCandidateQualityRating}
                label="Candidate Quality"
              />
              <StarRating
                value={clientResponsivenessRating}
                onChange={setClientResponsivenessRating}
                label="Client Responsiveness"
              />
              <StarRating
                value={marketDifficultyRating}
                onChange={setMarketDifficultyRating}
                label="Market Difficulty"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="whatWentWell">What went well?</Label>
              <Textarea
                id="whatWentWell"
                placeholder="Describe what worked well in this search..."
                value={whatWentWell}
                onChange={(e) => setWhatWentWell(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatCouldImprove">What could be improved?</Label>
              <Textarea
                id="whatCouldImprove"
                placeholder="What would you do differently next time?"
                value={whatCouldImprove}
                onChange={(e) => setWhatCouldImprove(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Key Learnings (select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {KEY_LEARNINGS_OPTIONS.map((learning) => (
                  <Badge
                    key={learning}
                    variant={keyLearnings.includes(learning) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleLearning(learning)}
                  >
                    {learning}
                    {keyLearnings.includes(learning) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendations">Recommendations for Similar Roles</Label>
              <Textarea
                id="recommendations"
                placeholder="Tips for handling similar roles in the future..."
                value={recommendationsForFuture}
                onChange={(e) => setRecommendationsForFuture(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Closure Type</span>
                <Badge variant={closureType === "hired" ? "default" : "secondary"}>
                  {CLOSURE_TYPES.find(t => t.value === closureType)?.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Closing Date</span>
                <span className="font-medium">{format(new Date(actualClosingDate), "MMM d, yyyy")}</span>
              </div>
              {closureType === "hired" && selectedApplicationId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hired Candidate</span>
                  <span className="font-medium">
                    {eligibleForHire.find(a => a.id === selectedApplicationId)?.candidate_full_name}
                  </span>
                </div>
              )}
              {closureType === "not_filled" && lossReason && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Loss Reason</span>
                  <span className="font-medium">
                    {LOSS_REASONS.find(r => r.value === lossReason)?.label}
                  </span>
                </div>
              )}
            </div>

            {(candidateQualityRating > 0 || clientResponsivenessRating > 0 || marketDifficultyRating > 0) && (
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium mb-3">Ratings</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {candidateQualityRating > 0 && (
                    <div>
                      <div className="flex justify-center gap-0.5">
                        {[...Array(candidateQualityRating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Candidate Quality</div>
                    </div>
                  )}
                  {clientResponsivenessRating > 0 && (
                    <div>
                      <div className="flex justify-center gap-0.5">
                        {[...Array(clientResponsivenessRating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Client Response</div>
                    </div>
                  )}
                  {marketDifficultyRating > 0 && (
                    <div>
                      <div className="flex justify-center gap-0.5">
                        {[...Array(marketDifficultyRating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Market Difficulty</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {keyLearnings.length > 0 && (
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium mb-2">Key Learnings</h4>
                <div className="flex flex-wrap gap-1">
                  {keyLearnings.map((learning) => (
                    <Badge key={learning} variant="secondary" className="text-xs">
                      {learning}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pipeline Metrics</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <div className="font-bold">{totalApplicants}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="font-bold">{candidatesInterviewed}</div>
                  <div className="text-xs text-muted-foreground">Interviewed</div>
                </div>
                <div>
                  <div className="font-bold">{candidatesFinalRound}</div>
                  <div className="text-xs text-muted-foreground">Final Round</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between gap-2">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2)
                }
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {closureType === "hired" ? "Complete Placement" : "Close Job"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}