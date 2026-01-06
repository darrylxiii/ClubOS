import { useState, useEffect, useMemo, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { validatePostMediaFile } from "@/lib/fileValidation";
import { 
  FileText, 
  X, 
  Loader2, 
  Upload, 
  Save, 
  Eye, 
  Briefcase,
  Settings,
  FileStack,
  Download,
  Lock,
  Activity,
  Users,
  History
} from "lucide-react";
import { ToolSelector } from "@/components/jobs/ToolSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StealthJobToggle } from "@/components/jobs/StealthJobToggle";
import { StealthViewerSelector } from "@/components/jobs/StealthViewerSelector";
import { StealthAuditTimeline } from "@/components/jobs/StealthAuditTimeline";
import { stealthJobAuditService } from "@/services/stealthJobAuditService";
import { JobStatusManager } from "@/components/jobs/JobStatusManager";
import { JobStatus } from "@/components/jobs/JobStatusBadge";
import { EnhancedLocationAutocomplete, type LocationResult } from "@/components/ui/enhanced-location-autocomplete";
import { LocationMapCard } from "@/components/ui/location-map-card";
import { PipelineTypeSelector } from "@/components/jobs/PipelineTypeSelector";
import { JobFeeConfiguration, type FeeConfiguration } from "@/components/jobs/JobFeeConfiguration";

interface EditJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  onJobUpdated: () => void;
}

interface StealthViewer {
  id: string;
  user_id: string;
  granted_by: string;
  granted_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  granter?: {
    full_name: string;
  };
}

export const EditJobSheet = ({ open, onOpenChange, job, onJobUpdated }: EditJobSheetProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [closeConfirmDialogOpen, setCloseConfirmDialogOpen] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [requiredTools, setRequiredTools] = useState<any[]>([]);
  const [niceToHaveTools, setNiceToHaveTools] = useState<any[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<any[]>([]);
  
  // Stealth job state
  const [isStealthEnabled, setIsStealthEnabled] = useState(false);
  const [stealthViewerIds, setStealthViewerIds] = useState<string[]>([]);
  const [existingViewers, setExistingViewers] = useState<StealthViewer[]>([]);
  
  // Location state with geocoordinates
  const [locationData, setLocationData] = useState<LocationResult | null>(null);
  
  // Pipeline configuration state
  const [pipelineType, setPipelineType] = useState<"standard" | "continuous">("standard");
  const [targetHireCount, setTargetHireCount] = useState<number | null>(null);
  const [isUnlimitedHires, setIsUnlimitedHires] = useState(true);

  // Fee configuration state
  const [feeConfig, setFeeConfig] = useState<FeeConfiguration>({
    feeType: 'percentage',
    feePercentage: null,
    feeFixed: null,
    useOverride: false,
  });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    location_city: null as string | null,
    location_country_code: null as string | null,
    employment_type: 'fulltime',
    salary_min: '',
    salary_max: '',
    currency: 'EUR',
    company_id: '',
    external_url: '',
  });

  // Stable memoization of tool arrays
  const { requiredToolsData, niceToHaveToolsData } = useMemo(() => {
    if (!job?.job_tools) return { requiredToolsData: [], niceToHaveToolsData: [] };
    
    return {
      requiredToolsData: job.job_tools
        .filter((jt: any) => jt.is_required)
        .map((jt: any) => jt.tools_and_skills),
      niceToHaveToolsData: job.job_tools
        .filter((jt: any) => !jt.is_required)
        .map((jt: any) => jt.tools_and_skills)
    };
  }, [job?.id]); // Only re-calculate when job ID changes

  // Initialize form when dialog opens - FIX for infinite loop
  useEffect(() => {
    if (open && job) {
      setFormData({
        title: job.title || '',
        description: job.description || '',
        location: job.location || '',
        latitude: job.latitude || null,
        longitude: job.longitude || null,
        location_city: job.location_city || null,
        location_country_code: job.location_country_code || null,
        employment_type: job.employment_type || 'fulltime',
        salary_min: job.salary_min?.toString() || '',
        salary_max: job.salary_max?.toString() || '',
        currency: job.currency || 'EUR',
        company_id: job.company_id || '',
        external_url: job.external_url || '',
      });

      // Initialize location data if coordinates exist
      if (job.latitude && job.longitude) {
        setLocationData({
          displayName: job.location || '',
          city: job.location_city || null,
          country: '',
          countryCode: job.location_country_code || '',
          latitude: job.latitude,
          longitude: job.longitude,
          formattedAddress: job.location || '',
        });
      } else {
        setLocationData(null);
      }

      // Only set tools if they've actually changed (compare IDs)
      const newRequiredIds = requiredToolsData.map(t => t.id).sort().join(',');
      const currentRequiredIds = requiredTools.map(t => t.id).sort().join(',');
      if (newRequiredIds !== currentRequiredIds) {
        setRequiredTools(requiredToolsData);
      }

      const newNiceToHaveIds = niceToHaveToolsData.map(t => t.id).sort().join(',');
      const currentNiceToHaveIds = niceToHaveTools.map(t => t.id).sort().join(',');
      if (newNiceToHaveIds !== currentNiceToHaveIds) {
        setNiceToHaveTools(niceToHaveToolsData);
      }

      setExistingDocuments(job.supporting_documents || []);
      setIsStealthEnabled(job.is_stealth || false);
      
      // Initialize pipeline settings
      setPipelineType(job.is_continuous ? "continuous" : "standard");
      setTargetHireCount(job.target_hire_count || null);
      setIsUnlimitedHires(job.target_hire_count === null);

      // Initialize fee settings
      setFeeConfig({
        feeType: job.fee_type_override || 'percentage',
        feePercentage: job.placement_fee_percentage_override || null,
        feeFixed: job.placement_fee_fixed_override || null,
        useOverride: !!(job.fee_type_override || job.placement_fee_percentage_override || job.placement_fee_fixed_override),
      });
      
      setHasUnsavedChanges(false);
      fetchCompanies();
      if (job.id) fetchStealthViewers(job.id);
    }
  }, [open, job?.id]); // CRITICAL: Only depend on open and job.id, NOT the tool arrays

  const fetchStealthViewers = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('job_stealth_viewers')
        .select('id, user_id, granted_by, granted_at')
        .eq('job_id', jobId);

      if (error) throw error;
      setExistingViewers((data || []) as StealthViewer[]);
      setStealthViewerIds((data || []).map((v: any) => v.user_id));
    } catch (error) {
      console.error('Error fetching stealth viewers:', error);
    }
  };

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

  // Memoize change handlers to prevent re-renders
  const handleRequiredToolsChange = useCallback((tools: any[]) => {
    setRequiredTools(tools);
    setHasUnsavedChanges(true);
  }, []);

  const handleNiceToHaveToolsChange = useCallback((tools: any[]) => {
    setNiceToHaveTools(tools);
    setHasUnsavedChanges(true);
  }, []);

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Handle location selection with geocoordinates
  const handleLocationChange = (location: LocationResult | null) => {
    setLocationData(location);
    setHasUnsavedChanges(true);
    if (location) {
      setFormData(prev => ({
        ...prev,
        location: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        location_city: location.city,
        location_country_code: location.countryCode,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        location: '',
        latitude: null,
        longitude: null,
        location_city: null,
        location_country_code: null,
      }));
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
      setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
    }
  };

  const removeSupportingDocument = (index: number) => {
    setSupportingDocuments(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const removeExistingDocument = async (docUrl: string) => {
    try {
      const updatedDocs = existingDocuments.filter((doc: any) => doc.url !== docUrl);
      setExistingDocuments(updatedDocs);
      setHasUnsavedChanges(true);
      toast.success("Document will be removed when you save");
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error("Failed to remove document");
    }
  };

  const downloadDocument = async (docUrl: string, docName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('job-documents')
        .download(docUrl);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = docName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error("Failed to download document");
    }
  };

  const uploadFiles = async (jobId: string) => {
    setUploading(true);
    let jobDescriptionUrl = job.job_description_url;
    const supportingDocsUrls = [...existingDocuments];

    try {
      if (jobDescriptionFile) {
        const fileExt = jobDescriptionFile.name.split('.').pop();
        const fileName = `${jobId}/job-description.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(fileName, jobDescriptionFile, { upsert: true });

        if (uploadError) throw uploadError;
        jobDescriptionUrl = fileName;
      }

      for (let i = 0; i < supportingDocuments.length; i++) {
        const file = supportingDocuments[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${jobId}/supporting/${Date.now()}-${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        supportingDocsUrls.push({
          url: fileName,
          name: file.name,
          uploaded_at: new Date().toISOString()
        });
      }

      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          job_description_url: jobDescriptionUrl,
          supporting_documents: supportingDocsUrls
        })
        .eq('id', jobId);

      if (updateError) throw updateError;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);

    try {
      // Calculate pipeline and fee data
      const isContinuous = pipelineType === "continuous";
      const jobFeeData = feeConfig.useOverride ? {
        fee_type_override: feeConfig.feeType,
        placement_fee_percentage_override: feeConfig.feeType !== 'fixed' ? feeConfig.feePercentage : null,
        placement_fee_fixed_override: feeConfig.feeType === 'fixed' || feeConfig.feeType === 'hybrid' ? feeConfig.feeFixed : null,
      } : {
        fee_type_override: null,
        placement_fee_percentage_override: null,
        placement_fee_fixed_override: null,
      };

      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          location_city: formData.location_city,
          location_country_code: formData.location_country_code,
          employment_type: formData.employment_type,
          salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
          salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
          currency: formData.currency,
          company_id: formData.company_id,
          external_url: formData.external_url || null,
          updated_at: new Date().toISOString(),
          is_stealth: isStealthEnabled,
          stealth_enabled_by: isStealthEnabled ? user?.id : null,
          stealth_enabled_at: isStealthEnabled ? new Date().toISOString() : null,
          // Pipeline settings
          is_continuous: isContinuous,
          target_hire_count: isContinuous ? (isUnlimitedHires ? null : targetHireCount) : 1,
          // Fee settings
          ...jobFeeData,
        })
        .eq('id', job.id);

      if (updateError) throw updateError;

      // Audit logging helper
      const performer = { id: user?.id || '', email: user?.email, full_name: user?.user_metadata?.full_name };
      const previousViewerIds = existingViewers.map(v => v.user_id);

      // Log stealth mode toggle if changed
      if (isStealthEnabled !== job.is_stealth) {
        stealthJobAuditService.logStealthToggled(job.id, formData.title, isStealthEnabled, performer);
      }

      // Update stealth viewers
      if (isStealthEnabled) {
        // Remove old viewers
        await supabase.from('job_stealth_viewers').delete().eq('job_id', job.id);
        
        // Add new viewers
        if (stealthViewerIds.length > 0) {
          const viewerInserts = stealthViewerIds.map(viewerId => ({
            job_id: job.id,
            user_id: viewerId,
            granted_by: user?.id,
          }));
          await supabase.from('job_stealth_viewers').insert(viewerInserts);
        }

        // Log viewer changes
        stealthJobAuditService.logViewerChanges(
          job.id,
          formData.title,
          previousViewerIds,
          stealthViewerIds,
          performer
        );
      }

      if (jobDescriptionFile || supportingDocuments.length > 0) {
        await uploadFiles(job.id);
      }

      const { error: deleteError } = await supabase
        .from('job_tools')
        .delete()
        .eq('job_id', job.id);

      if (deleteError) {
        console.error("Error deleting old tools:", deleteError);
      }

      const toolInserts = [
        ...requiredTools.map(tool => ({
          job_id: job.id,
          tool_id: tool.id,
          is_required: true,
        })),
        ...niceToHaveTools.map(tool => ({
          job_id: job.id,
          tool_id: tool.id,
          is_required: false,
        })),
      ];

      if (toolInserts.length > 0) {
        const { error: toolsError } = await supabase
          .from("job_tools")
          .insert(toolInserts);

        if (toolsError) {
          console.error("Error inserting tools:", toolsError);
        }
      }

      toast.success("Job updated successfully");
      setHasUnsavedChanges(false);
      onJobUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error("Failed to update job");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      toast.info("You have unsaved changes");
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-5xl p-0 flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Briefcase className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">{job?.title || 'Edit Job'}</h2>
                <p className="text-sm text-muted-foreground">
                  {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || uploading}>
                {loading || uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploading ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="basic" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="tools" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Tools & Skills
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="gap-2">
                  <Users className="h-4 w-4" />
                  Pipeline & Fees
                </TabsTrigger>
                <TabsTrigger value="status" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Status
                </TabsTrigger>
                <TabsTrigger value="visibility" className="gap-2">
                  <Lock className="h-4 w-4" />
                  Visibility
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileStack className="h-4 w-4" />
                  Documents
                </TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Job Details</CardTitle>
                    <CardDescription>Update the core information about this position</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company *</Label>
                      <Select
                        value={formData.company_id}
                        onValueChange={(value) => handleFormChange('company_id', value)}
                        required
                      >
                        <SelectTrigger>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleFormChange('title', e.target.value)}
                        placeholder="e.g., Senior Product Designer"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                        placeholder="Brief overview of the role..."
                        rows={8}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.description.length} characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="external_url" className="flex items-center gap-2">
                        External Job URL
                        <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="external_url"
                        type="url"
                        value={formData.external_url}
                        onChange={(e) => handleFormChange('external_url', e.target.value)}
                        placeholder="https://linkedin.com/jobs/..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Link to where this job is posted online (LinkedIn, company website, etc.)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Location & Type</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <EnhancedLocationAutocomplete
                          value={locationData}
                          onChange={handleLocationChange}
                          placeholder="e.g., Amsterdam, Remote"
                        />
                        {locationData && (
                          <p className="text-xs text-muted-foreground">📍 Coordinates captured</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="employment_type">Employment Type</Label>
                        <Select
                          value={formData.employment_type}
                          onValueChange={(value) => handleFormChange('employment_type', value)}
                        >
                          <SelectTrigger>
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
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Compensation</CardTitle>
                    <CardDescription>Set the salary range for this position</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => handleFormChange('currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                          <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                          <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                          <SelectItem value="AED">AED (د.إ) - UAE Dirham</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="salary_min">Min Salary (Annual)</Label>
                        <Input
                          id="salary_min"
                          type="number"
                          value={formData.salary_min}
                          onChange={(e) => handleFormChange('salary_min', e.target.value)}
                          placeholder="e.g., 100000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="salary_max">Max Salary (Annual)</Label>
                        <Input
                          id="salary_max"
                          type="number"
                          value={formData.salary_max}
                          onChange={(e) => handleFormChange('salary_max', e.target.value)}
                          placeholder="e.g., 150000"
                        />
                      </div>
                    </div>

                    {formData.salary_min && formData.salary_max && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">
                          Range: {formData.currency} {parseInt(formData.salary_min).toLocaleString()} - {parseInt(formData.salary_max).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tools & Skills Tab */}
              <TabsContent value="tools" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Required Tools & Technologies</CardTitle>
                    <CardDescription>
                      Essential skills candidates must have
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ToolSelector
                      selectedTools={requiredTools}
                      onChange={handleRequiredToolsChange}
                      placeholder="Search required tools (e.g., Figma, React, Python)..."
                    />
                    {requiredTools.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center py-8">
                        No required tools selected. Add tools that are essential for this role.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Nice-to-Have Tools</CardTitle>
                    <CardDescription>
                      Bonus skills that would be beneficial but not required
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ToolSelector
                      selectedTools={niceToHaveTools}
                      onChange={handleNiceToHaveToolsChange}
                      placeholder="Search nice-to-have tools..."
                    />
                    {niceToHaveTools.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-4 text-center py-8">
                        No nice-to-have tools selected. Add tools that would be a plus.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pipeline & Fees Tab */}
              <TabsContent value="pipeline" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pipeline Type</CardTitle>
                    <CardDescription>
                      Configure how this job handles multiple hires
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PipelineTypeSelector
                      pipelineType={pipelineType}
                      onPipelineTypeChange={(type) => {
                        setPipelineType(type);
                        setHasUnsavedChanges(true);
                      }}
                      targetHireCount={targetHireCount}
                      onTargetHireCountChange={(count) => {
                        setTargetHireCount(count);
                        setHasUnsavedChanges(true);
                      }}
                      isUnlimited={isUnlimitedHires}
                      onIsUnlimitedChange={(unlimited) => {
                        setIsUnlimitedHires(unlimited);
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </CardContent>
                </Card>

                {formData.company_id && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Fee Configuration</CardTitle>
                      <CardDescription>
                        Override company default placement fees for this role
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <JobFeeConfiguration
                        companyId={formData.company_id}
                        feeConfig={feeConfig}
                        onFeeConfigChange={(config) => {
                          setFeeConfig(config);
                          setHasUnsavedChanges(true);
                        }}
                        salaryMax={formData.salary_max ? parseInt(formData.salary_max) : null}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Status Tab */}
              <TabsContent value="status" className="space-y-6">
                <JobStatusManager
                  jobId={job?.id}
                  jobTitle={job?.title || formData.title}
                  currentStatus={(job?.status || 'draft') as JobStatus}
                  onStatusChange={onJobUpdated}
                />
              </TabsContent>

              {/* Visibility Tab */}
              <TabsContent value="visibility" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stealth Mode</CardTitle>
                    <CardDescription>
                      Control who can see this job posting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <StealthJobToggle
                      enabled={isStealthEnabled}
                      onEnabledChange={(enabled) => {
                        setIsStealthEnabled(enabled);
                        setHasUnsavedChanges(true);
                      }}
                      showWarning={job?.is_stealth !== isStealthEnabled}
                    />
                    
                    {isStealthEnabled && formData.company_id && (
                      <StealthViewerSelector
                        jobId={job?.id}
                        companyId={formData.company_id}
                        selectedUserIds={stealthViewerIds}
                        onSelectedUsersChange={(ids) => {
                          setStealthViewerIds(ids);
                          setHasUnsavedChanges(true);
                        }}
                        existingViewers={existingViewers}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Access History */}
                {job?.id && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Access History
                      </CardTitle>
                      <CardDescription>
                        View all changes to stealth mode and viewer permissions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <StealthAuditTimeline jobId={job.id} maxHeight="350px" />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Job Description Document</CardTitle>
                    <CardDescription>
                      Upload the main job description file (PDF, DOC, DOCX)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {job.job_description_url && !jobDescriptionFile && (
                      <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary" />
                          <div>
                            <p className="font-medium">Current document uploaded</p>
                            <p className="text-xs text-muted-foreground">Upload a new file to replace it</p>
                          </div>
                        </div>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                    )}

                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <Input
                        id="job-description"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleJobDescriptionChange}
                        className="max-w-xs mx-auto"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Drag & drop or click to upload
                      </p>
                    </div>

                    {jobDescriptionFile && (
                      <div className="p-4 bg-primary/10 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-6 w-6 text-primary" />
                          <div>
                            <p className="font-medium">{jobDescriptionFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(jobDescriptionFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setJobDescriptionFile(null);
                            setHasUnsavedChanges(true);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Supporting Documents</CardTitle>
                    <CardDescription>
                      Additional files like company culture decks, benefit guides, etc.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Existing documents */}
                    {existingDocuments.length > 0 && (
                      <div className="space-y-2">
                        <Label>Existing Documents</Label>
                        {existingDocuments.map((doc: any, index: number) => (
                          <div key={index} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="h-5 w-5 text-primary" />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadDocument(doc.url, doc.name)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExistingDocument(doc.url)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Separator className="my-4" />
                      </div>
                    )}

                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <Input
                        id="supporting-docs"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        multiple
                        onChange={handleSupportingDocumentsChange}
                        className="max-w-xs mx-auto"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Upload multiple files at once
                      </p>
                    </div>

                    {/* New documents to upload */}
                    {supportingDocuments.length > 0 && (
                      <div className="space-y-2">
                        <Label>New Documents (will be uploaded on save)</Label>
                        {supportingDocuments.map((file, index) => (
                          <div key={index} className="p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="h-5 w-5 text-primary" />
                              <div className="flex-1">
                                <p className="font-medium text-sm">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSupportingDocument(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 border-t bg-background p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {hasUnsavedChanges ? (
                <span className="text-amber-600 font-medium">● Unsaved changes</span>
              ) : (
                <span className="text-green-600">✓ All changes saved</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || uploading}>
                {loading || uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploading ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

