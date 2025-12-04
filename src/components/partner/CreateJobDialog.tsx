import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { validatePostMediaFile } from "@/lib/fileValidation";
import { FileText, X, AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { ToolSelector } from "@/components/jobs/ToolSelector";
import { jobFormSchema, type JobFormData } from "@/schemas/jobFormSchema";
import { JobFormProgress } from "@/components/jobs/JobFormProgress";
import { useJobFormDraft } from "@/hooks/useJobFormDraft";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { cn } from "@/lib/utils";
import { StealthJobToggle } from "@/components/jobs/StealthJobToggle";
import { StealthViewerSelector } from "@/components/jobs/StealthViewerSelector";
import { Separator } from "@/components/ui/separator";
import { stealthJobAuditService } from "@/services/stealthJobAuditService";

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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

const CreateJobDialogContent = ({ open, onOpenChange, companyId, onJobCreated }: CreateJobDialogProps) => {
  const { user } = useAuth();
  const [submitStep, setSubmitStep] = useState<SubmitStep>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [requiredTools, setRequiredTools] = useState<any[]>([]);
  const [niceToHaveTools, setNiceToHaveTools] = useState<any[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [restoreDraftDialogOpen, setRestoreDraftDialogOpen] = useState(false);
  const [closeConfirmDialogOpen, setCloseConfirmDialogOpen] = useState(false);
  
  // Stealth job state
  const [isStealthEnabled, setIsStealthEnabled] = useState(false);
  const [stealthViewerIds, setStealthViewerIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    location: '',
    employment_type: 'fulltime',
    salary_min: '',
    salary_max: '',
    currency: 'EUR',
    company_id: companyId || '',
    is_stealth: false,
    stealth_viewers: [],
  });

  // Draft auto-save
  const { saveDraft, loadDraft, clearDraft } = useJobFormDraft(
    formData,
    requiredTools,
    niceToHaveTools,
    open
  );

  useEffect(() => {
    if (open) {
      fetchCompanies();

      // Try to load draft
      const draft = loadDraft();
      if (draft) {
        setFormData(draft.formData);
        setRequiredTools(draft.requiredTools);
        setNiceToHaveTools(draft.niceToHaveTools);
        toast.success("Draft restored");
      }
    }
  }, [open, loadDraft, clearDraft]);

  // Track unsaved changes
  useEffect(() => {
    const hasData = formData.title || formData.description || requiredTools.length > 0;
    setHasUnsavedChanges(hasData && submitStep === "idle");
  }, [formData.title, formData.description, requiredTools.length, submitStep]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error("Failed to load companies");
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors.find(e => e.field === field)?.message;
  };

  const validateField = (field: keyof JobFormData, value: any) => {
    const testData = { ...formData, [field]: value };
    const result = jobFormSchema.safeParse(testData);

    // For salary fields, we need to check both the field error and cross-field refinement errors
    const salaryFields = ['salary_min', 'salary_max'];
    const isSalaryField = salaryFields.includes(field);

    if (result.success) {
      // Clear this field's error, and for salary fields, also clear salary_max refinement error
      setFieldErrors(prev => {
        let filtered = prev.filter(e => e.field !== field);
        if (isSalaryField) {
          filtered = filtered.filter(e => e.field !== 'salary_max' || e.message !== 'Minimum salary cannot exceed maximum salary');
        }
        return filtered;
      });
      return true;
    } else {
      const fieldError = result.error.errors.find(e => e.path[0] === field);
      // Also check for salary refinement error (path is ["salary_max"] but message is about min/max)
      const salaryRefinementError = isSalaryField 
        ? result.error.errors.find(e => e.message === 'Minimum salary cannot exceed maximum salary')
        : null;

      if (fieldError) {
        setFieldErrors(prev => [
          ...prev.filter(e => e.field !== field),
          { field, message: fieldError.message }
        ]);
        return false;
      } else if (salaryRefinementError) {
        // Show salary refinement error on salary_max
        setFieldErrors(prev => [
          ...prev.filter(e => !(e.field === 'salary_max' && e.message === 'Minimum salary cannot exceed maximum salary')),
          { field: 'salary_max', message: salaryRefinementError.message }
        ]);
        return false;
      } else {
        // Field is valid - clear any existing error for this field
        setFieldErrors(prev => prev.filter(e => e.field !== field));
        return true;
      }
    }
  };

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (value) {
      setTimeout(() => validateField(field, value), 300);
    }
  };

  const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      setJobDescriptionFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const handleSupportingDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSupportingDocuments(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added`);
    }
  };

  const removeSupportingDocument = (index: number) => {
    setSupportingDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (jobId: string) => {
    setSubmitStep("uploading");
    let jobDescriptionUrl = null;
    const supportingDocsUrls: any[] = [];
    const totalFiles = (jobDescriptionFile ? 1 : 0) + supportingDocuments.length;
    let uploadedFiles = 0;

    try {
      if (jobDescriptionFile) {
        const fileExt = jobDescriptionFile.name.split('.').pop();
        const fileName = `${jobId}/job-description.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(fileName, jobDescriptionFile, { upsert: true });

        if (uploadError) throw new Error(`Job description upload failed: ${uploadError.message}`);
        jobDescriptionUrl = fileName;
        uploadedFiles++;
        setUploadProgress(Math.round((uploadedFiles / totalFiles) * 100));
      }

      for (let i = 0; i < supportingDocuments.length; i++) {
        const file = supportingDocuments[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${jobId}/supporting-docs/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          toast.error(`Failed to upload ${file.name}`);
          // Still increment counter to avoid stuck progress bar
          uploadedFiles++;
          setUploadProgress(Math.round((uploadedFiles / totalFiles) * 100));
          continue;
        }

        supportingDocsUrls.push({
          url: fileName,
          name: file.name,
          size: file.size,
          type: file.type
        });

        uploadedFiles++;
        setUploadProgress(Math.round((uploadedFiles / totalFiles) * 100));
      }

      return { jobDescriptionUrl, supportingDocsUrls };
    } catch (error: any) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  const insertJobTools = async (jobId: string, tools: any[], isRequired: boolean) => {
    if (tools.length === 0) return;

    const toolInserts = tools.map(tool => {
      if (!tool.id || typeof tool.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tool.id)) {
        throw new Error(`Invalid tool ID format: ${tool.id}`);
      }

      return {
        job_id: jobId,
        tool_id: tool.id,
        is_required: isRequired,
        proficiency_level: 'intermediate'
      };
    });

    const { error } = await supabase
      .from('job_tools')
      .insert(toolInserts);

    if (error) {
      console.error('Error inserting job tools:', error);
      throw new Error(`Failed to add ${isRequired ? 'required' : 'nice-to-have'} tools: ${error.message}`);
    }
  };

  const handleSubmit = async (createAnother: boolean = false) => {
    try {
      setFieldErrors([]);

      const validationResult = jobFormSchema.safeParse(formData);
      if (!validationResult.success) {
        const errors: FieldError[] = validationResult.error.errors.map(err => ({
          field: err.path[0] as string,
          message: err.message
        }));
        setFieldErrors(errors);
        toast.error("Please fix the form errors");
        return;
      }

      setSubmitStep("creating");

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          location: formData.location.trim(),
          employment_type: formData.employment_type,
          salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
          salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
          currency: formData.currency,
          company_id: formData.company_id,
          created_by: user?.id,
          status: 'open',
          is_stealth: isStealthEnabled,
          stealth_enabled_by: isStealthEnabled ? user?.id : null,
          stealth_enabled_at: isStealthEnabled ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (jobError || !job) {
        throw new Error(`Job creation failed: ${jobError?.message || 'Unknown error'}`);
      }

      const jobId = job.id;

      // Insert stealth viewers and log audit events if stealth mode is enabled
      if (isStealthEnabled) {
        // Log stealth mode enabled
        const performer = { id: user?.id || '', email: user?.email, full_name: user?.user_metadata?.full_name };
        stealthJobAuditService.logStealthToggled(jobId, formData.title, true, performer);

        if (stealthViewerIds.length > 0) {
          const viewerInserts = stealthViewerIds.map(viewerId => ({
            job_id: jobId,
            user_id: viewerId,
            granted_by: user?.id,
          }));

          const { error: viewersError } = await supabase
            .from('job_stealth_viewers')
            .insert(viewerInserts);

          if (viewersError) {
            console.error('Error inserting stealth viewers:', viewersError);
            toast.error("Job created but failed to add some viewers");
          } else {
            // Log bulk add of viewers
            stealthJobAuditService.logBulkViewersAdded(jobId, formData.title, stealthViewerIds, performer);
          }
        }
      }


      let jobDescriptionUrl = null;
      let supportingDocsUrls: any[] = [];

      if (jobDescriptionFile || supportingDocuments.length > 0) {
        const uploadResult = await uploadFiles(jobId);
        jobDescriptionUrl = uploadResult.jobDescriptionUrl;
        supportingDocsUrls = uploadResult.supportingDocsUrls;

        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            job_description_url: jobDescriptionUrl,
            supporting_documents: supportingDocsUrls.length > 0 ? supportingDocsUrls : null,
          })
          .eq('id', jobId);

        if (updateError) {
          console.error('Failed to update job with file URLs:', updateError);
          toast.error("Job created but failed to attach files");
        }
      }

      setSubmitStep("finalizing");

      try {
        await insertJobTools(jobId, requiredTools, true);
        await insertJobTools(jobId, niceToHaveTools, false);
      } catch (toolError: any) {
        console.error('Tool insertion error:', toolError);
        toast.error(toolError.message || "Job created but failed to add tools");
      }

      setSubmitStep("complete");
      clearDraft();

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <span>Job posted successfully!</span>
        </div>
      );

      if (createAnother) {
        resetForm();
        setSubmitStep("idle");
      } else {
        setTimeout(() => {
          onOpenChange(false);
          onJobCreated();
          resetForm();
        }, 1500);
      }

    } catch (error: any) {
      console.error('Job creation error:', error);
      setSubmitStep("idle");
      toast.error(
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to create job</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      );
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      employment_type: 'fulltime',
      salary_min: '',
      salary_max: '',
      currency: 'EUR',
      company_id: companyId || '',
      is_stealth: false,
      stealth_viewers: [],
    });
    setJobDescriptionFile(null);
    setSupportingDocuments([]);
    setRequiredTools([]);
    setNiceToHaveTools([]);
    setFieldErrors([]);
    setUploadProgress(0);
    setHasUnsavedChanges(false);
    setIsStealthEnabled(false);
    setStealthViewerIds([]);
  };

  const handleClose = () => {
    if (hasUnsavedChanges && submitStep === "idle") {
      saveDraft();
    }
    onOpenChange(false);
    if (submitStep === "complete") {
      resetForm();
      setSubmitStep("idle");
    }
  };

  const isSubmitting = submitStep !== "idle" && submitStep !== "complete";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        aria-describedby="create-job-description"
      >
        <DialogHeader>
          <DialogTitle>Create New Job Posting</DialogTitle>
          <p id="create-job-description" className="text-sm text-muted-foreground">
            Fill in the details below to create a new job posting
          </p>
        </DialogHeader>

        {submitStep !== "idle" && submitStep !== "complete" && (
          <div className="my-4">
            <JobFormProgress currentStep={submitStep} uploadProgress={uploadProgress} />
          </div>
        )}

        {submitStep === "complete" && (
          <div className="my-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold">Job Posted Successfully!</h3>
                <p className="text-sm text-muted-foreground">Your job posting is now live</p>
              </div>
            </div>
            <Button
              onClick={() => handleSubmit(true)}
              variant="outline"
              className="w-full"
            >
              Create Another Job
            </Button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(false);
          }}
          className={cn("space-y-4", isSubmitting && "opacity-50 pointer-events-none")}
        >
          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-1">
              Company <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => handleInputChange('company_id', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="company"
                className={getFieldError('company_id') ? 'border-destructive' : ''}
                aria-invalid={!!getFieldError('company_id')}
                aria-describedby={getFieldError('company_id') ? 'company-error' : undefined}
              >
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getFieldError('company_id') && (
              <p id="company-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getFieldError('company_id')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-1">
              Job Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              disabled={isSubmitting}
              className={getFieldError('title') ? 'border-destructive' : ''}
              aria-invalid={!!getFieldError('title')}
              aria-describedby={getFieldError('title') ? 'title-error' : 'title-hint'}
              maxLength={200}
            />
            {getFieldError('title') ? (
              <p id="title-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getFieldError('title')}
              </p>
            ) : (
              <p id="title-hint" className="text-xs text-muted-foreground">
                {formData.title.length}/200 characters
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-1">
              Job Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the role, responsibilities, and requirements..."
              rows={6}
              disabled={isSubmitting}
              className={getFieldError('description') ? 'border-destructive' : ''}
              aria-invalid={!!getFieldError('description')}
              aria-describedby={getFieldError('description') ? 'description-error' : 'description-hint'}
              maxLength={5000}
            />
            {getFieldError('description') ? (
              <p id="description-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getFieldError('description')}
              </p>
            ) : (
              <p id="description-hint" className="text-xs text-muted-foreground">
                {formData.description.length}/5000 characters
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1">
              Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g. Amsterdam, Netherlands or Remote"
              disabled={isSubmitting}
              className={getFieldError('location') ? 'border-destructive' : ''}
              aria-invalid={!!getFieldError('location')}
              aria-describedby={getFieldError('location') ? 'location-error' : undefined}
            />
            {getFieldError('location') && (
              <p id="location-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getFieldError('location')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employment_type" className="flex items-center gap-1">
              Employment Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.employment_type}
              onValueChange={(value: any) => handleInputChange('employment_type', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="employment_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fulltime">Full-time</SelectItem>
                <SelectItem value="parttime">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Salary Range (Optional)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger aria-label="Currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">€ EUR</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                    <SelectItem value="GBP">£ GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  type="number"
                  value={formData.salary_min}
                  onChange={(e) => handleInputChange('salary_min', e.target.value)}
                  placeholder="Min"
                  disabled={isSubmitting}
                  aria-label="Minimum salary"
                  min="0"
                />
              </div>
              <div>
                <Input
                  type="number"
                  value={formData.salary_max}
                  onChange={(e) => handleInputChange('salary_max', e.target.value)}
                  placeholder="Max"
                  disabled={isSubmitting}
                  className={getFieldError('salary_max') ? 'border-destructive' : ''}
                  aria-label="Maximum salary"
                  aria-invalid={!!getFieldError('salary_max')}
                  aria-describedby={getFieldError('salary_max') ? 'salary-error' : undefined}
                  min="0"
                />
              </div>
            </div>
            {getFieldError('salary_max') && (
              <p id="salary-error" className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {getFieldError('salary_max')}
              </p>
            )}
          </div>

          {/* Stealth Job Section */}
          <Separator className="my-4" />
          <div className="space-y-4">
            <Label className="text-base font-semibold">Visibility Settings</Label>
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
            
            {isStealthEnabled && !formData.company_id && (
              <p className="text-sm text-muted-foreground">
                Select a company first to manage stealth viewers
              </p>
            )}
          </div>
          <Separator className="my-4" />

          <div className="space-y-2">
            <Label htmlFor="job-description-file" className="flex items-center gap-2">
              Job Description File
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="job-description-file"
                  type="file"
                  onChange={handleJobDescriptionChange}
                  disabled={isSubmitting}
                  accept=".pdf,.doc,.docx"
                  className="flex-1"
                  aria-describedby="jd-file-hint"
                />
                {jobDescriptionFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setJobDescriptionFile(null)}
                    disabled={isSubmitting}
                    aria-label="Remove job description file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {jobDescriptionFile && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="flex-1 truncate">{jobDescriptionFile.name}</span>
                  <span className="text-muted-foreground">{formatFileSize(jobDescriptionFile.size)}</span>
                </div>
              )}
              <p id="jd-file-hint" className="text-xs text-muted-foreground">
                PDF or DOC format, max 10MB
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supporting-docs" className="flex items-center gap-2">
              Supporting Documents
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="supporting-docs"
              type="file"
              multiple
              onChange={handleSupportingDocumentsChange}
              disabled={isSubmitting}
              accept=".pdf,.doc,.docx"
              aria-describedby="support-docs-hint"
            />
            <p id="support-docs-hint" className="text-xs text-muted-foreground">
              Additional documents (max 10MB each)
            </p>
            {supportingDocuments.length > 0 && (
              <div className="space-y-2 mt-2">
                {supportingDocuments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSupportingDocument(index)}
                      disabled={isSubmitting}
                      className="h-6 w-6"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Required Tools & Technologies
              <span className="text-xs text-muted-foreground font-normal ml-2">(Optional)</span>
            </Label>
            <ToolSelector
              selectedTools={requiredTools}
              onChange={setRequiredTools}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Nice-to-Have Tools & Technologies
              <span className="text-xs text-muted-foreground font-normal ml-2">(Optional)</span>
            </Label>
            <ToolSelector
              selectedTools={niceToHaveTools}
              onChange={setNiceToHaveTools}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.company_id}
            >
              {isSubmitting ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Creating...
                </>
              ) : (
                'Create Job'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const CreateJobDialog = (props: CreateJobDialogProps) => {
  return (
    <ErrorBoundary>
      <CreateJobDialogContent {...props} />
    </ErrorBoundary>
  );
};
