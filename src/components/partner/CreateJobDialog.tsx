import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { validatePostMediaFile } from "@/lib/fileValidation";
import {
  FileText, X, AlertCircle, CheckCircle2, Upload, Briefcase, Clock, FileSignature,
  Laptop, GraduationCap, MapPin, Building2, Globe, Compass, ChevronLeft, ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { ToolSelector } from "@/components/jobs/ToolSelector";
import { jobFormSchema, type JobFormData, DEPARTMENTS, EXPERIENCE_LEVELS, LOCATION_TYPES, URGENCY_LEVELS } from "@/schemas/jobFormSchema";
import { useJobFormDraft } from "@/hooks/useJobFormDraft";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { StealthJobToggle } from "@/components/jobs/StealthJobToggle";
import { StealthViewerSelector } from "@/components/jobs/StealthViewerSelector";
import { Separator } from "@/components/ui/separator";
import { stealthJobAuditService } from "@/services/stealthJobAuditService";
import { PipelineTypeSelector } from "@/components/jobs/PipelineTypeSelector";
import { JobFeeConfiguration, type FeeConfiguration } from "@/components/jobs/JobFeeConfiguration";
import { type LocationResult } from "@/components/ui/enhanced-location-autocomplete";
import { CompanyOfficeLocationPicker } from "@/components/jobs/CompanyOfficeLocationPicker";
import { MultiLocationInput, type LocationInput } from "@/components/jobs/MultiLocationInput";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  onJobCreated: () => void;
}

type SubmitStep = "idle" | "creating" | "uploading" | "finalizing" | "complete";

interface FieldError {
  field: string;
  message: string;
}

const TOTAL_STEPS = 5;

const STEP_META = [
  { label: 'Basics', icon: Briefcase },
  { label: 'Location', icon: MapPin },
  { label: 'Compensation', icon: ArrowUpRight },
  { label: 'Details', icon: FileSignature },
  { label: 'Review', icon: CheckCircle2 },
];

const EMPLOYMENT_OPTIONS = [
  { value: "fulltime", label: 'Full-time', icon: Briefcase },
  { value: "parttime", label: 'Part-time', icon: Clock },
  { value: "contract", label: 'Contract', icon: FileSignature },
  { value: "freelance", label: 'Freelance', icon: Laptop },
  { value: "internship", label: 'Internship', icon: GraduationCap },
];

const SENIORITY_OPTIONS = [
  { value: "junior", label: 'Junior' },
  { value: "mid", label: 'Mid-Level' },
  { value: "senior", label: 'Senior' },
  { value: "lead", label: 'Lead' },
  { value: "director", label: 'Director' },
  { value: "vp_csuite", label: 'VP / C-Suite' },
];

const LOCATION_TYPE_OPTIONS = [
  { value: "onsite", label: 'On-site', icon: MapPin },
  { value: "hybrid", label: 'Hybrid', icon: Building2 },
  { value: "remote", label: 'Remote', icon: Globe },
  { value: "flexible", label: 'Flexible', icon: Compass },
];

const URGENCY_OPTIONS = [
  { value: "immediate", label: 'Immediate' },
  { value: "two_weeks", label: 'Within 2 weeks' },
  { value: "one_month", label: 'Within 1 month' },
  { value: "three_months", label: 'Within 3 months' },
  { value: "no_rush", label: 'No rush' },
];

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

// ── Company Combobox (searchable for admins) ──────────────────────
function CompanyCombobox({ companies, value, onValueChange, disabled, hasError }: {  companies: Array<{ id: string; name: string }>;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
const { t } = useTranslation('common');
  const [searchQuery, setSearchQuery] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const filtered = companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedName = companies.find(c => c.id === value)?.name || '';

  return (
    <Popover open={comboOpen} onOpenChange={setComboOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("w-full justify-between glass-input font-normal", hasError && 'border-destructive', !value && 'text-muted-foreground')}
        >
          {selectedName || "Select a company"}
          <Building2 className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[100] pointer-events-auto" align="start">
        <div className="p-2 border-b border-border">
          <Input
            placeholder={t("search_companies", "Search companies...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2 text-center">{t("no_companies_found", "No companies found")}</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => { onValueChange(c.id); setComboOpen(false); setSearchQuery(""); }}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-accent cursor-pointer flex items-center gap-2",
                  c.id === value && "bg-accent font-medium"
                )}
              >
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {c.name}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Tag Input Component (Fix 10: comma + paste support) ──────────────
function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder: string }) {
  const { t } = useTranslation('common');
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (text.includes(',')) {
              e.preventDefault();
              const items = text.split(',').map(s => s.trim()).filter(s => s && !tags.includes(s));
              if (items.length) onChange([...tags, ...items]);
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={!input.trim()}>
          {t('common:add')}
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))} className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Radio Card Component ──────────────────────────────────────────────
function RadioCard({ selected, onClick, label, icon: Icon, disabled }: { selected: boolean; onClick: () => void; label: string; icon?: any; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200",
        "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/40 bg-background",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {Icon && <Icon className={cn("w-4 h-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />}
      <span className={cn("text-sm font-medium", selected ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </button>
  );
}

// ── Step Indicator ──────────────────────────────────────────────
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {STEP_META.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200",
                isActive && "bg-primary text-primary-foreground shadow-sm",
                isDone && "bg-primary/20 text-primary",
                !isActive && !isDone && "bg-muted text-muted-foreground"
              )}>
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={cn(
                "text-[10px] font-medium hidden sm:block",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Mobile: show current step label */}
      <p className="text-xs font-medium text-center sm:hidden text-muted-foreground">
        Step {currentStep + 1}: {STEP_META[currentStep].label}
      </p>
      <Progress value={progress} className="h-1" />
    </div>
  );
}

// ── Main Dialog ──────────────────────────────────────────────
const CreateJobDialogContent = ({ open, onOpenChange, companyId, onJobCreated }: CreateJobDialogProps) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { currentRole } = useRole();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitStep, setSubmitStep] = useState<SubmitStep>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [requiredTools, setRequiredTools] = useState<any[]>([]);
  const [niceToHaveTools, setNiceToHaveTools] = useState<any[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDraftChoice, setShowDraftChoice] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<any>(null);

  // Stealth job state
  const [isStealthEnabled, setIsStealthEnabled] = useState(false);
  const [stealthViewerIds, setStealthViewerIds] = useState<string[]>([]);

  // Pipeline state
  const [pipelineType, setPipelineType] = useState<"standard" | "continuous">("standard");
  const [targetHireCount, setTargetHireCount] = useState<number | null>(null);
  const [isUnlimitedHires, setIsUnlimitedHires] = useState(true);

  // Fee config
  const [feeConfig, setFeeConfig] = useState<FeeConfiguration>({
    feeType: 'percentage',
    feePercentage: null,
    feeFixed: null,
    useOverride: false,
  });

  // Location state
  const [locationData, setLocationData] = useState<LocationResult | null>(null);
  const [jobLocations, setJobLocations] = useState<LocationInput[]>([]);
  const [isRemote, setIsRemote] = useState(false);

  // Tags state
  const [requirements, setRequirements] = useState<string[]>([]);
  const [niceToHave, setNiceToHave] = useState<string[]>([]);

  // Date picker
  const [startDate, setStartDate] = useState<Date | undefined>();

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    location: '',
    latitude: null,
    longitude: null,
    location_city: null,
    location_country_code: null,
    location_formatted: null,
    locationData: null,
    employment_type: 'fulltime',
    salary_min: '',
    salary_max: '',
    currency: 'EUR',
    company_id: companyId || '',
    is_stealth: false,
    stealth_viewers: [],
    external_url: '',
    experience_level: null,
    seniority_level: null,
    department: null,
    location_type: 'onsite',
    urgency: null,
    expected_start_date: null,
    nice_to_have: [],
    requirements: [],
  });

  // Fix 3: Extended draft with full state
  const { saveDraft, loadDraft, clearDraft } = useJobFormDraft(formData, requiredTools, niceToHaveTools, open, {
    requirements,
    niceToHave,
    startDate,
    currentStep,
    jobLocations,
  });

   useEffect(() => {
    if (open) {
      fetchCompanies();
      const draft = loadDraft();
      if (draft) {
        setPendingDraft(draft);
        setShowDraftChoice(true);
      }
    } else {
      // Fix 8: Reset form on close
      setCurrentStep(0);
      resetForm();
      setPendingDraft(null);
      setShowDraftChoice(false);
    }
  }, [open, loadDraft]);

  useEffect(() => {
    const hasData = formData.title || formData.description || requiredTools.length > 0;
    setHasUnsavedChanges(!!hasData && submitStep === "idle");
  }, [formData.title, formData.description, requiredTools.length, submitStep]);

  const fetchCompanies = async () => {
    try {
      const isAdminOrStrategist = currentRole === 'admin' || currentRole === 'strategist';
      if (isAdminOrStrategist) {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setCompanies(data || []);
      } else {
        // Partners: only show companies they belong to
        const { data, error } = await supabase
          .from('company_members')
          .select('company_id, companies(id, name)')
          .eq('user_id', user?.id || '')
          .eq('is_active', true);
        if (error) throw error;
        const memberCompanies = (data || [])
          .map((m: any) => m.companies)
          .filter(Boolean)
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        setCompanies(memberCompanies);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error(t("failed_to_load_companies", "Failed to load companies"));
    }
  };

  const getFieldError = (field: string): string | undefined =>
    fieldErrors.find(e => e.field === field)?.message;

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (location: LocationResult | null) => {
    setLocationData(location);
    if (location) {
      setFormData(prev => ({
        ...prev,
        location: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        location_city: location.city,
        location_country_code: location.countryCode,
        location_formatted: location.formattedAddress,
        locationData: location,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        location: '',
        latitude: null,
        longitude: null,
        location_city: null,
        location_country_code: null,
        location_formatted: null,
        locationData: null,
      }));
    }
  };

  // ── Step Validation ──────────────────────────────────────
  const validateStep = (step: number): boolean => {
    const errors: FieldError[] = [];

    if (step === 0) {
      if (!formData.company_id) errors.push({ field: 'company_id', message: t('partnerSection.createjobdialog.pleaseSelectACompany', 'Please select a company') });
      if (!formData.title || formData.title.trim().length < 2) errors.push({ field: 'title', message: t('partnerSection.createjobdialog.titleMustBeAtLeast2', 'Title must be at least 2 characters') });
    }

    if (step === 1) {
      if (formData.location_type !== 'remote' && (!formData.location || formData.location.trim().length < 2)) {
        errors.push({ field: 'location', message: t('partnerSection.createjobdialog.locationIsRequiredForNonremoteRoles', 'Location is required for non-remote roles') });
      }
    }

    if (step === 2) {
      // Fix 4: Salary negative value guard in step validation
      const salaryMin = formData.salary_min ? parseFloat(formData.salary_min) : null;
      const salaryMax = formData.salary_max ? parseFloat(formData.salary_max) : null;
      if (salaryMin !== null && salaryMin < 0) errors.push({ field: 'salary_min', message: t('partnerSection.createjobdialog.salaryCannotBeNegative', 'Salary cannot be negative') });
      if (salaryMax !== null && salaryMax < 0) errors.push({ field: 'salary_max', message: t('partnerSection.createjobdialog.salaryCannotBeNegative', 'Salary cannot be negative') });
      if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
        errors.push({ field: 'salary_max', message: t('partnerSection.createjobdialog.minimumSalaryCannotExceedMaximumSalary', 'Minimum salary cannot exceed maximum salary') });
      }
    }

    // Step 3: Description is optional — no blocking validation

    setFieldErrors(errors);
    return errors.length === 0;
  };

  const goNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS - 1));
    }
  };

  const goBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  // ── File Handlers ──────────────────────────────────────
  const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) { toast.error(validation.error); return; }
      setJobDescriptionFile(file);
    }
  };

  const handleSupportingDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) { toast.error(`${file.name}: ${validation.error}`); continue; }
      validFiles.push(file);
    }
    if (validFiles.length > 0) setSupportingDocuments(prev => [...prev, ...validFiles]);
  };

  const uploadFiles = async (jobId: string) => {
    setSubmitStep("uploading");
    let jobDescriptionUrl = null;
    const supportingDocsUrls: any[] = [];
    const totalFiles = (jobDescriptionFile ? 1 : 0) + supportingDocuments.length;
    let uploadedFiles = 0;

    if (jobDescriptionFile) {
      const fileExt = jobDescriptionFile.name.split('.').pop();
      const fileName = `${jobId}/job-description.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('job-documents').upload(fileName, jobDescriptionFile, { upsert: true });
      if (uploadError) throw new Error(`Job description upload failed: ${uploadError.message}`);
      jobDescriptionUrl = fileName;
      uploadedFiles++;
      setUploadProgress(Math.round((uploadedFiles / totalFiles) * 100));
    }

    for (let i = 0; i < supportingDocuments.length; i++) {
      const file = supportingDocuments[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${jobId}/supporting-docs/${Date.now()}-${i}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('job-documents').upload(fileName, file, { upsert: true });
      if (uploadError) { console.error(`Failed to upload ${file.name}:`, uploadError); uploadedFiles++; setUploadProgress(Math.round((uploadedFiles / totalFiles) * 100)); continue; }
      supportingDocsUrls.push({ url: fileName, name: file.name, size: file.size, type: file.type });
      uploadedFiles++;
      setUploadProgress(Math.round((uploadedFiles / totalFiles) * 100));
    }

    return { jobDescriptionUrl, supportingDocsUrls };
  };

  const insertJobTools = async (jobId: string, tools: any[], isRequired: boolean) => {
    if (tools.length === 0) return;
    const toolInserts = tools.map(tool => ({
      job_id: jobId,
      tool_id: tool.id,
      is_required: isRequired,
      proficiency_level: 'intermediate',
    }));
    const { error } = await supabase.from('job_tools').insert(toolInserts);
    if (error) throw new Error(`Failed to add ${isRequired ? 'required' : 'nice-to-have'} tools: ${error.message}`);
  };

  // ── Submit ──────────────────────────────────────
  const handleSubmit = async () => {
    try {
      setFieldErrors([]);

      // Set location to 'Remote' if remote type and no location specified
      const finalFormData = { ...formData };
      if (finalFormData.location_type === 'remote' && !finalFormData.location) {
        finalFormData.location = 'Remote';
      }
      finalFormData.requirements = requirements;
      finalFormData.nice_to_have = niceToHave;

      const validationResult = jobFormSchema.safeParse(finalFormData);
      if (!validationResult.success) {
        const errors: FieldError[] = validationResult.error.errors.map(err => ({
          field: err.path[0] as string,
          message: err.message,
        }));
        setFieldErrors(errors);
        toast.error(t("please_fix_the_form", "Please fix the form errors"));
        return;
      }

      setSubmitStep("creating");

      const effectivePipelineType = isPartner ? "standard" : pipelineType;
      const isContinuous = effectivePipelineType === "continuous";
      const jobFeeData = feeConfig.useOverride ? {
        job_fee_type: feeConfig.feeType,
        job_fee_percentage: feeConfig.feeType === 'percentage' || feeConfig.feeType === 'hybrid' ? feeConfig.feePercentage : null,
        job_fee_fixed: feeConfig.feeType === 'fixed' || feeConfig.feeType === 'hybrid' ? feeConfig.feeFixed : null,
        fee_source: 'job_override',
      } : {
        job_fee_type: null,
        job_fee_percentage: null,
        job_fee_fixed: null,
        fee_source: 'company',
      };

      const isAutoPublish = currentRole === 'admin' || currentRole === 'strategist';
      const jobStatus = isAutoPublish ? 'published' : 'pending_approval';

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: finalFormData.title.trim(),
          description: (finalFormData.description || '').trim(),
          location: finalFormData.location.trim(),
          latitude: finalFormData.latitude,
          longitude: finalFormData.longitude,
          location_city: finalFormData.location_city,
          location_country_code: finalFormData.location_country_code,
          location_formatted: finalFormData.location_formatted,
          employment_type: finalFormData.employment_type,
          salary_min: finalFormData.salary_min ? parseFloat(finalFormData.salary_min) : null,
          salary_max: finalFormData.salary_max ? parseFloat(finalFormData.salary_max) : null,
          currency: finalFormData.currency,
          company_id: finalFormData.company_id,
          created_by: user?.id,
          status: jobStatus,
          is_stealth: isStealthEnabled,
          stealth_enabled_by: isStealthEnabled ? user?.id : null,
          stealth_enabled_at: isStealthEnabled ? new Date().toISOString() : null,
          is_continuous: isContinuous,
          target_hire_count: isContinuous ? (isUnlimitedHires ? null : targetHireCount) : 1,
          hired_count: 0,
          continuous_started_at: isContinuous ? new Date().toISOString() : null,
          external_url: finalFormData.external_url || null,
          is_remote: finalFormData.location_type === 'remote',
          experience_level: finalFormData.experience_level,
          seniority_level: finalFormData.seniority_level,
          department: finalFormData.department,
          location_type: finalFormData.location_type,
          urgency: finalFormData.urgency,
          expected_start_date: finalFormData.expected_start_date,
          requirements: requirements.length > 0 ? requirements : null,
          nice_to_have: niceToHave.length > 0 ? niceToHave : null,
          ...jobFeeData,
        } as any)
        .select()
        .single();

      if (jobError || !job) throw new Error(`Job creation failed: ${jobError?.message || 'Unknown error'}`);

      const jobId = job.id;

      // Save locations to job_locations table
      try {
        const locationInserts: any[] = [];
        // Primary location
        if (finalFormData.latitude && finalFormData.longitude) {
          locationInserts.push({
            job_id: jobId,
            location_type: finalFormData.location_type || 'onsite',
            city: finalFormData.location_city,
            country_code: finalFormData.location_country_code,
            latitude: finalFormData.latitude,
            longitude: finalFormData.longitude,
            formatted_address: finalFormData.location_formatted || finalFormData.location,
            is_primary: true,
          });
        }
        // Additional locations
        for (const loc of jobLocations) {
          if (loc.latitude && loc.longitude) {
            locationInserts.push({
              job_id: jobId,
              location_type: loc.locationType || finalFormData.location_type || 'onsite',
              city: loc.city || null,
              country_code: loc.countryCode || null,
              latitude: loc.latitude,
              longitude: loc.longitude,
              formatted_address: loc.formattedAddress || loc.city || '',
              is_primary: false,
            });
          }
        }
        if (locationInserts.length > 0) {
          const { error: locError } = await supabase.from('job_locations').insert(locationInserts);
          if (locError) console.error('Error inserting job locations:', locError);
        }
      } catch (locErr) {
        console.error('Job locations insert failed (non-blocking):', locErr);
      }

      // Stealth viewers
      if (isStealthEnabled) {
        const performer = { id: user?.id || '', email: user?.email, full_name: user?.user_metadata?.full_name };
        stealthJobAuditService.logStealthToggled(jobId, finalFormData.title, true, performer);
        if (stealthViewerIds.length > 0) {
          const viewerInserts = stealthViewerIds.map(viewerId => ({ job_id: jobId, user_id: viewerId, granted_by: user?.id }));
          const { error: viewersError } = await supabase.from('job_stealth_viewers').insert(viewerInserts);
          if (viewersError) { console.error('Error inserting stealth viewers:', viewersError); toast.error(t('createJobDialog.toast.jobCreatedButFailedToAddSomeViewers')); }
          else { stealthJobAuditService.logBulkViewersAdded(jobId, finalFormData.title, stealthViewerIds, performer); }
        }
      }

      // File uploads
      if (jobDescriptionFile || supportingDocuments.length > 0) {
        const uploadResult = await uploadFiles(jobId);
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            job_description_url: uploadResult.jobDescriptionUrl,
            supporting_documents: uploadResult.supportingDocsUrls.length > 0 ? uploadResult.supportingDocsUrls : null,
          })
          .eq('id', jobId);
        if (updateError) { console.error('Failed to update job with file URLs:', updateError); }
      }

      setSubmitStep("finalizing");

      // Insert tools
      try {
        await insertJobTools(jobId, requiredTools, true);
        await insertJobTools(jobId, niceToHaveTools, false);
      } catch (toolError: any) {
        console.error('Tool insertion error:', toolError);
      }

      // ── Auto-create admin task (non-blocking) ──
      if (jobStatus === 'pending_approval') {
        try {
          const companyName = companies.find(c => c.id === finalFormData.company_id)?.name || 'Unknown';
          const submitterName = user?.user_metadata?.full_name || user?.email || 'Unknown';

          const taskNum = `TQ-${Date.now().toString(36).toUpperCase().slice(-6)}`;

          const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin').limit(1);
          const adminId = adminRoles?.[0]?.user_id;

          const { data: task } = await supabase.from('unified_tasks').insert({
            task_number: taskNum,
            title: `Review new role: ${finalFormData.title}`,
            description: `Submitted by ${submitterName} for ${companyName}. Review and approve or decline.`,
            priority: 'high',
            status: 'pending',
            task_type: 'review',
            company_name: companyName,
            position: finalFormData.title,
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            created_by: user?.id,
          } as any).select('id').single();

          if (task && adminId) {
            await supabase.from('unified_task_assignees').insert({ task_id: task.id, user_id: adminId });
          }

          await supabase.functions.invoke('notify-admin-job-submitted', {
            body: {
              jobId,
              jobTitle: finalFormData.title,
              companyName,
              submittedByName: submitterName,
              submittedByEmail: user?.email || '',
              employmentType: finalFormData.employment_type,
              location: finalFormData.location,
              department: finalFormData.department,
              seniorityLevel: finalFormData.seniority_level,
              urgency: finalFormData.urgency,
            },
          });
        } catch (e) {
          console.error('Admin notification/task failed (non-blocking):', e);
        }
      }

      setSubmitStep("complete");
      clearDraft();

      toast.success(isAutoPublish ? t('partnerSection.createjobdialog.rolePublishedSuccessfully', 'Role published successfully.') : t('partnerSection.createjobdialog.roleSubmittedForReview', 'Role submitted for review.'));

      setTimeout(() => {
        onOpenChange(false);
        onJobCreated();
        resetForm();
      }, 1500);

    } catch (error: unknown) {
      console.error('Job creation error:', error);
      setSubmitStep("idle");
      toast.error(error instanceof Error ? error.message : t('partnerSection.createjobdialog.anUnexpectedErrorOccurred', 'An unexpected error occurred'));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', description: '', location: '',
      latitude: null, longitude: null, location_city: null, location_country_code: null, location_formatted: null, locationData: null,
      employment_type: 'fulltime', salary_min: '', salary_max: '', currency: 'EUR',
      company_id: companyId || '', is_stealth: false, stealth_viewers: [], external_url: '',
      experience_level: null, seniority_level: null, department: null, location_type: 'onsite',
      urgency: null, expected_start_date: null, nice_to_have: [], requirements: [],
    });
    setLocationData(null);
    setJobDescriptionFile(null);
    setSupportingDocuments([]);
    setRequiredTools([]);
    setNiceToHaveTools([]);
    setFieldErrors([]);
    setUploadProgress(0);
    setHasUnsavedChanges(false);
    setIsStealthEnabled(false);
    setStealthViewerIds([]);
    setPipelineType("standard");
    setTargetHireCount(null);
    setIsUnlimitedHires(true);
    setFeeConfig({ feeType: 'percentage', feePercentage: null, feeFixed: null, useOverride: false });
    setRequirements([]);
    setNiceToHave([]);
    setStartDate(undefined);
    setCurrentStep(0);
    setSubmitStep("idle");
    setJobLocations([]);
  };

  // Fix 2: Close confirmation
  const handleClose = () => {
    if (hasUnsavedChanges && submitStep === "idle") {
      saveDraft();
      setShowCloseConfirm(true);
      return;
    }
    onOpenChange(false);
    if (submitStep === "complete") { resetForm(); }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    onOpenChange(false);
  };

  const isSubmitting = submitStep !== "idle" && submitStep !== "complete";
  const isPartner = currentRole !== 'admin' && currentRole !== 'strategist';

  const restoreDraft = (draft: any) => {
    setFormData(draft.formData);
    setRequiredTools(draft.requiredTools);
    setNiceToHaveTools(draft.niceToHaveTools);
    if (draft.requirements) setRequirements(draft.requirements);
    if (draft.niceToHave) setNiceToHave(draft.niceToHave);
    if (draft.startDateISO) setStartDate(new Date(draft.startDateISO));
    if (draft.currentStep) setCurrentStep(draft.currentStep);
    if (draft.jobLocations) setJobLocations(draft.jobLocations);
    setPendingDraft(null);
    setShowDraftChoice(false);
    toast.success(t("draft_restored", "Draft restored"));
  };

  // Fix 6: Ctrl+Enter to submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && currentStep === TOTAL_STEPS - 1 && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    }
  }, [currentStep, isSubmitting]);

  // ── Render Steps ──────────────────────────────────────

  const renderStep0 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("start_with_the_fundamentals", "Start with the fundamentals. These details help us match the right candidates.")}</p>

      {/* Company selector — unlocked for admin/strategist */}
      <div className="space-y-2">
        <Label className="glass-label">{t('partnerSection.createjobdialog.company', 'Company')} <span className="text-destructive">*</span></Label>
        {!isPartner && companies.length > 5 ? (
          <CompanyCombobox
            companies={companies}
            value={formData.company_id}
            onValueChange={(v) => handleInputChange('company_id', v)}
            disabled={isSubmitting}
            hasError={!!getFieldError('company_id')}
          />
        ) : (
          <Select value={formData.company_id} onValueChange={(v) => handleInputChange('company_id', v)} disabled={isSubmitting || (!!companyId && isPartner)}>
            <SelectTrigger className={cn("glass-input", getFieldError('company_id') && 'border-destructive')}>
              <SelectValue placeholder={t("select_a_company", "Select a company")} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {getFieldError('company_id') && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{getFieldError('company_id')}</p>}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label className="glass-label">{t('partnerSection.createjobdialog.jobTitle', 'Job Title')} <span className="text-destructive">*</span></Label>
        <Input
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder={t("eg_senior_product_designer", "e.g. Senior Product Designer")}
          maxLength={200}
          className={cn("glass-input", getFieldError('title') && 'border-destructive')}
        />
        <p className="text-xs text-muted-foreground">{formData.title.length}/200 characters</p>
        {getFieldError('title') && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{getFieldError('title')}</p>}
      </div>

      {/* Department */}
      <div className="space-y-2">
        <Label className="glass-label">{t("department", "Department")}</Label>
        <Select value={formData.department || ''} onValueChange={(v) => handleInputChange('department', v)}>
          <SelectTrigger className="glass-input"><SelectValue placeholder={t("select_department", "Select department")} /></SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Employment Type */}
      <div className="space-y-2">
        <Label className="glass-label">{t("employment_type", "Employment Type")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EMPLOYMENT_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.value}
              selected={formData.employment_type === opt.value}
              onClick={() => handleInputChange('employment_type', opt.value)}
              label={opt.label}
              icon={opt.icon}
              disabled={isSubmitting}
            />
          ))}
        </div>
      </div>

      {/* Seniority */}
      <div className="space-y-2">
        <Label className="glass-label">{t("seniority_level", "Seniority Level")}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SENIORITY_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.value}
              selected={formData.seniority_level === opt.value}
              onClick={() => handleInputChange('seniority_level', opt.value)}
              label={opt.label}
              disabled={isSubmitting}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("where_will_this_person", "Where will this person work? Be specific — it improves match quality.")}</p>

      {/* Location Type */}
      <div className="space-y-2">
        <Label className="glass-label">{t("work_model", "Work Model")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {LOCATION_TYPE_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.value}
              selected={formData.location_type === opt.value}
              onClick={() => {
                handleInputChange('location_type', opt.value);
                if (opt.value === 'remote') {
                  setIsRemote(true);
                  handleInputChange('location', 'Remote');
                } else {
                  setIsRemote(false);
                  // Clear auto-set "Remote" so user must pick a real location
                  if (formData.location === 'Remote') {
                    handleLocationChange(null);
                  }
                }
              }}
              label={opt.label}
              icon={opt.icon}
              disabled={isSubmitting}
            />
          ))}
        </div>
        {formData.location_type === 'remote' && (
          <p className="text-xs text-muted-foreground mt-2">{t("candidates_worldwide_will_be", "Candidates worldwide will be able to see this role.")}</p>
        )}
      </div>

      {/* Primary Location */}
      {formData.location_type !== 'remote' && (
        <div className="space-y-2">
          <Label className="glass-label">{t('partnerSection.createjobdialog.primaryLocation', 'Primary Location')} <span className="text-destructive">*</span></Label>
          {formData.company_id ? (
            <CompanyOfficeLocationPicker
              companyId={formData.company_id}
              value={locationData}
              onChange={handleLocationChange}
              disabled={isSubmitting}
              className={getFieldError('location') ? 'border-destructive' : ''}
            />
          ) : (
            <p className="text-sm text-muted-foreground p-3 rounded-xl border border-border/20 bg-card/20">{t('createJobDialog.selectACompanyFirstToChooseFromSavedOffi')}</p>
          )}
          {getFieldError('location') && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{getFieldError('location')}</p>}
          {locationData && <p className="text-xs text-muted-foreground">{t("coordinates_captured_for_map", "Coordinates captured for map display")}</p>}
        </div>
      )}

      {/* Additional Locations — Fix 5: always hide remote toggle */}
      {formData.location_type !== 'remote' && (
        <div className="space-y-2">
          <Label className="glass-label">{t("additional_locations", "Additional Locations")}</Label>
          <MultiLocationInput
            locations={jobLocations}
            isRemote={false}
            onChange={setJobLocations}
            onRemoteChange={() => {}}
            disabled={isSubmitting}
            hideRemoteToggle={true}
          />
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("setting_expectations_upfront_reduces", "Setting expectations upfront reduces back-and-forth later.")}</p>

      {/* Salary */}
      <div className="space-y-2">
        <Label className="glass-label">{t("salary_range_optional", "Salary Range (Optional)")}</Label>
        <div className="grid grid-cols-3 gap-2">
          <Select value={formData.currency} onValueChange={(v) => handleInputChange('currency', v)}>
            <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">{t("eur", "€ EUR")}</SelectItem>
              <SelectItem value="USD">{t("usd", "$ USD")}</SelectItem>
              <SelectItem value="GBP">{t("gbp", "£ GBP")}</SelectItem>
              <SelectItem value="AED">{t("دإ_aed", "د.إ AED")}</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" value={formData.salary_min} onChange={(e) => handleInputChange('salary_min', e.target.value)} placeholder={t("min", "Min")} min="0" className={cn("glass-input", getFieldError('salary_min') && 'border-destructive')} />
          <Input type="number" value={formData.salary_max} onChange={(e) => handleInputChange('salary_max', e.target.value)} placeholder={t("max", "Max")} min="0" className={cn("glass-input", getFieldError('salary_max') && 'border-destructive')} />
        </div>
        {getFieldError('salary_min') && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{getFieldError('salary_min')}</p>}
        {getFieldError('salary_max') && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{getFieldError('salary_max')}</p>}
        <p className="text-xs text-muted-foreground">{t('createJobDialog.compensationDetailsAreSharedOnlyWithShor')}</p>
      </div>

      {/* Expected Start Date */}
      <div className="space-y-2">
        <Label className="glass-label">{t("expected_start_date_optional", "Expected Start Date (Optional)")}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal glass-input", !startDate && "text-muted-foreground")}>
              {startDate ? format(startDate, "PPP") : "Select a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[100] pointer-events-auto" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(d) => {
                setStartDate(d);
                handleInputChange('expected_start_date', d ? format(d, 'yyyy-MM-dd') : null);
              }}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Urgency */}
      <div className="space-y-2">
        <Label className="glass-label">{t("urgency", "Urgency")}</Label>
        <Select value={formData.urgency || ''} onValueChange={(v) => handleInputChange('urgency', v)}>
          <SelectTrigger className="glass-input"><SelectValue placeholder={t("select_urgency", "Select urgency")} /></SelectTrigger>
          <SelectContent>
            {URGENCY_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("be_specific_about_what", "Be specific about what matters. Vague descriptions attract vague applications.")}</p>

      {/* Description */}
      <div className="space-y-2">
        <Label className="glass-label">Job Description {!jobDescriptionFile && <span className="text-destructive">*</span>}</Label>
        <p className="text-xs text-muted-foreground -mt-1">{t("optional_if_you_upload", "Optional if you upload a JD file below.")}</p>
        <Textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder={t("what_will_this_person", "What will this person do day-to-day? What does success look like in 6 months?")}
          rows={6}
          maxLength={5000}
          className={cn(getFieldError('description') && 'border-destructive')}
        />
        <p className="text-xs text-muted-foreground">{(formData.description || '').length}/5000 characters</p>
        {getFieldError('description') && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{getFieldError('description')}</p>}
      </div>

      {/* Requirements */}
      <div className="space-y-2">
        <Label className="glass-label">{t("requirements", "Requirements")}</Label>
        <TagInput tags={requirements} onChange={setRequirements} placeholder={t("eg_5_years_typescript", "e.g. 5+ years TypeScript experience")} />
      </div>

      {/* Nice to Have */}
      <div className="space-y-2">
        <Label className="glass-label">{t("nicetohave", "Nice-to-Have")}</Label>
        <TagInput tags={niceToHave} onChange={setNiceToHave} placeholder={t("eg_experience_with_figma", "e.g. Experience with Figma")} />
      </div>

      {/* Tools */}
      <div className="space-y-2">
        <Label className="glass-label">{t("required_tools_and_technologies", "Required Tools and Technologies")}</Label>
        <ToolSelector selectedTools={requiredTools} onChange={setRequiredTools} />
      </div>

      <div className="space-y-2">
        <Label className="glass-label">{t("nicetohave_tools", "Nice-to-Have Tools")}</Label>
        <ToolSelector selectedTools={niceToHaveTools} onChange={setNiceToHaveTools} />
      </div>

      {/* File uploads */}
      <div className="space-y-2">
        <Label className="glass-label">{t("job_description_file_optional", "Job Description File (Optional)")}</Label>
        <div className="flex items-center gap-2">
          <Input type="file" onChange={handleJobDescriptionChange} accept=".pdf,.doc,.docx" className="flex-1" />
          {jobDescriptionFile && (
            <Button type="button" variant="ghost" size="icon" onClick={() => setJobDescriptionFile(null)}><X className="w-4 h-4" /></Button>
          )}
        </div>
        {jobDescriptionFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
            <FileText className="w-4 h-4 text-primary" />
            <span className="flex-1 truncate">{jobDescriptionFile.name}</span>
            <span className="text-muted-foreground">{formatFileSize(jobDescriptionFile.size)}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="glass-label">{t("supporting_documents_optional", "Supporting Documents (Optional)")}</Label>
        <Input type="file" multiple onChange={handleSupportingDocumentsChange} accept=".pdf,.doc,.docx" />
        {supportingDocuments.length > 0 && (
          <div className="space-y-2 mt-2">
            {supportingDocuments.map((file, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => setSupportingDocuments(prev => prev.filter((_, j) => j !== i))} className="h-6 w-6"><X className="w-3 h-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* External URL */}
      <div className="space-y-2">
        <Label className="glass-label">{t("external_job_url_optional", "External Job URL (Optional)")}</Label>
        <Input
          type="url"
          value={formData.external_url || ''}
          onChange={(e) => handleInputChange('external_url', e.target.value)}
          placeholder="https://linkedin.com/jobs/..."
          className={cn("glass-input", getFieldError('external_url') && 'border-destructive')}
        />
        {getFieldError('external_url') && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{getFieldError('external_url')}</p>}
      </div>
    </div>
  );

  const renderStep4 = () => {
    const companyName = companies.find(c => c.id === formData.company_id)?.name || '—';
    const seniorityLabel = SENIORITY_OPTIONS.find(o => o.value === formData.seniority_level)?.label || '—';
    const employmentLabel = EMPLOYMENT_OPTIONS.find(o => o.value === formData.employment_type)?.label || '—';
    const locationTypeLabel = LOCATION_TYPE_OPTIONS.find(o => o.value === formData.location_type)?.label || '—';
    const urgencyLabel = URGENCY_OPTIONS.find(o => o.value === formData.urgency)?.label || '—';

    return (
      <div className="space-y-5">
        {/* Pipeline & Fee — admin/strategist only */}
        {!isPartner && (
          <div className="space-y-4">
            <PipelineTypeSelector
              pipelineType={pipelineType}
              onPipelineTypeChange={setPipelineType}
              targetHireCount={targetHireCount}
              onTargetHireCountChange={setTargetHireCount}
              isUnlimited={isUnlimitedHires}
              onIsUnlimitedChange={setIsUnlimitedHires}
            />
          </div>
        )}

        {formData.company_id && !isPartner && (
          <>
            <Separator />
            <JobFeeConfiguration
              companyId={formData.company_id}
              feeConfig={feeConfig}
              onFeeConfigChange={setFeeConfig}
              disabled={isSubmitting}
              salaryMax={formData.salary_max ? parseInt(formData.salary_max) : null}
            />
          </>
        )}

        {!isPartner && <Separator />}

        {/* Stealth — admin/strategist only */}
        {!isPartner && (
          <div className="space-y-4">
            <Label className="glass-label">{t("visibility", "Visibility")}</Label>
            <StealthJobToggle
              enabled={isStealthEnabled}
              onEnabledChange={setIsStealthEnabled}
              disabled={isSubmitting}
            />
            {isStealthEnabled && formData.company_id && (
              <StealthViewerSelector
                companyId={formData.company_id}
                selectedUserIds={stealthViewerIds}
                onSelectedUsersChange={setStealthViewerIds}
                disabled={isSubmitting}
              />
            )}
          </div>
        )}

        <Separator />

        {/* Review Summary — Fix 7: description spans full width */}
        <div className="space-y-3">
          <Label className="glass-label">{t("review_summary", "Review Summary")}</Label>
          <div className="glass rounded-xl p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <SummaryRow label={t("company", "Company")} value={companyName} />
              <SummaryRow label={t("title", "Title")} value={formData.title || '—'} />
              <SummaryRow label={t("department", "Department")} value={formData.department || '—'} />
              <SummaryRow label={t("type", "Type")} value={employmentLabel} />
              <SummaryRow label={t("seniority", "Seniority")} value={seniorityLabel} />
              <SummaryRow label={t("work_model", "Work Model")} value={locationTypeLabel} />
              <SummaryRow label={t("location", "Location")} value={formData.location || '—'} />
              {jobLocations.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t("additional_locations", "Additional Locations:")}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {jobLocations.map((loc, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border">
                        {loc.formattedAddress || loc.city || 'Unknown'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <SummaryRow label={t("urgency", "Urgency")} value={urgencyLabel} />
              {startDate && <SummaryRow label={t("start_date", "Start Date")} value={format(startDate, 'PPP')} />}
              {formData.salary_min && <SummaryRow label={t("salary", "Salary")} value={`${formData.currency} ${formData.salary_min}${formData.salary_max ? ` – ${formData.salary_max}` : ''}`} />}
              {jobDescriptionFile && <SummaryRow label={t("jd_file", "JD File")} value={jobDescriptionFile.name} />}
              {supportingDocuments.length > 0 && <SummaryRow label={t("documents", "Documents")} value={`${supportingDocuments.length} file(s)`} />}
              {requirements.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t("requirements", "Requirements:")}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {requirements.map((r, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {niceToHave.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t("nicetohave", "Nice-to-Have:")}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {niceToHave.map((n, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border">{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {requiredTools.length > 0 && <SummaryRow label={t("required_tools", "Required Tools")} value={`${requiredTools.length} selected`} />}
              {niceToHaveTools.length > 0 && <SummaryRow label={t("bonus_tools", "Bonus Tools")} value={`${niceToHaveTools.length} selected`} />}
              {/* Admin-only summary rows */}
              {!isPartner && (
                <>
                  <SummaryRow label={t("pipeline", "Pipeline")} value={pipelineType === 'continuous' ? t('partnerSection.createjobdialog.continuous', 'Continuous') : t('partnerSection.createjobdialog.standard', 'Standard')} />
                  <SummaryRow label={t("stealth", "Stealth")} value={isStealthEnabled ? t('partnerSection.createjobdialog.enabled', 'Enabled') : t('partnerSection.createjobdialog.off', 'Off')} />
                  {feeConfig.useOverride && <SummaryRow label={t("fee_override", "Fee Override")} value="Yes" />}
                </>
              )}
            </div>
            {/* Description preview — full width */}
            {formData.description && (
              <div className="pt-2 border-t border-border/30">
                <SummaryRow label={t("description", "Description")} value={formData.description.length > 150 ? formData.description.slice(0, 150) + '…' : formData.description} />
              </div>
            )}
          </div>
        </div>

        {/* Submit status */}
        {submitStep !== "idle" && submitStep !== "complete" && (
          <div className="space-y-2">
            <Progress value={submitStep === "creating" ? 30 : submitStep === "uploading" ? 30 + (uploadProgress * 0.5) : 90} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {submitStep === "creating" && "Creating role..."}
              {submitStep === "uploading" && `Uploading files... ${uploadProgress}%`}
              {submitStep === "finalizing" && "Finalizing..."}
            </p>
          </div>
        )}

        {submitStep === "complete" && (
          <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">{isPartner ? t('partnerSection.createjobdialog.roleSubmittedForReview', 'Role submitted for review.') : t('partnerSection.createjobdialog.rolePublishedSuccessfully', 'Role published successfully.')}</span>
          </div>
        )}
      </div>
    );
  };

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose} modal={false}>
        <SheetContent side="right" className="glass sm:max-w-2xl w-full p-0 flex flex-col">
          {/* Header */}
          <div className="p-6 pb-0 space-y-4">
            <SheetHeader>
              <SheetTitle className="text-lg font-semibold">{t("create_new_role", "Create New Role")}</SheetTitle>
            </SheetHeader>
            <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />
          </div>

          {/* Body — Fix 6: keyboard handler */}
          <div className="flex-1 overflow-y-auto px-6 py-4" onKeyDown={handleKeyDown}>
            <TooltipProvider>
              <div className={cn(isSubmitting && "opacity-50 pointer-events-none")}>
                {stepRenderers[currentStep]()}
              </div>
            </TooltipProvider>
          </div>

          {/* Footer */}
          <div className="border-t border-border/50 p-4 flex items-center gap-3">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={goBack} disabled={isSubmitting} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" /> {t('common:back')}
              </Button>
            )}
            {currentStep < TOTAL_STEPS - 1 ? (
              <Button type="button" onClick={goNext} disabled={isSubmitting} className="flex-1">
                {t('common:next')} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.company_id || submitStep === "complete"}
                className="flex-1"
              >
                {isSubmitting ? (
                  <><Upload className="w-4 h-4 mr-2 animate-pulse" />{t("submitting", "Submitting...")}</>
                ) : (
                  isPartner ? t('partnerSection.createjobdialog.submitForReview', 'Submit for Review') : t('partnerSection.createjobdialog.publishRole', 'Publish Role')
                )}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Close confirmation dialog */}
      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title={t("your_progress_is_saved", "Your progress is saved")}
        description={t("your_draft_has_been", "Your draft has been saved and will be restored next time you open this form.")}
        confirmText="Leave"
        cancelText="Continue editing"
        onConfirm={handleConfirmClose}
        className="z-[200]"
      />

      {/* Draft restore choice dialog */}
      <ConfirmDialog
        open={showDraftChoice}
        onOpenChange={(open) => {
          if (!open) {
            // Dismiss (X / Escape) — preserve draft in localStorage, just start fresh this session
            setPendingDraft(null);
            setShowDraftChoice(false);
          }
        }}
        title={t("continue_where_you_left", "Continue where you left off?")}
        description={pendingDraft ? `You have an unsaved draft from ${new Date(pendingDraft.timestamp).toLocaleString()}. Would you like to continue or start fresh?` : "You have an unsaved draft."}
        confirmText="Continue Draft"
        cancelText="Start Fresh"
        onConfirm={() => {
          if (pendingDraft) restoreDraft(pendingDraft);
        }}
        onCancel={() => {
          clearDraft();
          resetForm();
        }}
        className="z-[200]"
      />
    </>
  );
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export const CreateJobDialog = (props: CreateJobDialogProps) => {
  return (
    <ErrorBoundary>
      <CreateJobDialogContent {...props} />
    </ErrorBoundary>
  );
};
