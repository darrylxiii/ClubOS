import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validatePostMediaFile } from "@/lib/fileValidation";
import { FileText, X, Download } from "lucide-react";

interface EditJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  onJobUpdated: () => void;
}

export const EditJobDialog = ({ open, onOpenChange, jobId, onJobUpdated }: EditJobDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [currentJobDescUrl, setCurrentJobDescUrl] = useState<string>('');
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [existingSupportingDocs, setExistingSupportingDocs] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    employment_type: 'fulltime',
    salary_min: '',
    salary_max: '',
    currency: 'EUR',
    company_id: '',
  });

  useEffect(() => {
    if (open && jobId) {
      fetchJobData();
      fetchCompanies();
    }
  }, [open, jobId]);

  const fetchJobData = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      
      setFormData({
        title: data.title || '',
        description: data.description || '',
        location: data.location || '',
        employment_type: data.employment_type || 'fulltime',
        salary_min: data.salary_min?.toString() || '',
        salary_max: data.salary_max?.toString() || '',
        currency: data.currency || 'EUR',
        company_id: data.company_id || '',
      });
      setCurrentJobDescUrl(data.job_description_url || '');
      setExistingSupportingDocs(Array.isArray(data.supporting_documents) ? data.supporting_documents : []);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error("Failed to load job data");
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

  const handleJobDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      setJobDescriptionFile(file);
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
    
    setSupportingDocuments(prev => [...prev, ...validFiles]);
  };

  const removeSupportingDocument = (index: number) => {
    setSupportingDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingDocument = (index: number) => {
    setExistingSupportingDocs(prev => prev.filter((_, i) => i !== index));
  };

  const downloadDocument = async (url: string, name: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('job-documents')
        .download(url);
      
      if (error) throw error;
      
      const blob = new Blob([data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const uploadFiles = async () => {
    setUploading(true);
    let jobDescriptionUrl = currentJobDescUrl;
    const supportingDocsUrls = [...existingSupportingDocs];

    try {
      // Upload job description if new file selected
      if (jobDescriptionFile) {
        const fileExt = jobDescriptionFile.name.split('.').pop();
        const fileName = `${jobId}/job-description.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(fileName, jobDescriptionFile, { upsert: true });

        if (uploadError) throw uploadError;
        jobDescriptionUrl = fileName;
      }

      // Upload new supporting documents
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

      return { jobDescriptionUrl, supportingDocsUrls };
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_id) {
      toast.error("Please select a company");
      return;
    }

    setLoading(true);

    try {
      // Upload files first
      const fileData = await uploadFiles();

      const { error } = await supabase
        .from('jobs')
        .update({
          company_id: formData.company_id,
          title: formData.title,
          description: formData.description,
          location: formData.location,
          employment_type: formData.employment_type,
          salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
          salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
          currency: formData.currency,
          job_description_url: fileData.jobDescriptionUrl,
          supporting_documents: fileData.supportingDocsUrls,
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success("Job updated successfully");
      onJobUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error("Failed to update job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase">Edit Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => setFormData({ ...formData, company_id: value })}
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
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employment_type">Employment Type</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fulltime">Full-time</SelectItem>
                  <SelectItem value="parttime">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_min">Min Salary</Label>
              <Input
                id="salary_min"
                type="number"
                value={formData.salary_min}
                onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                placeholder="e.g., 100000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_max">Max Salary</Label>
              <Input
                id="salary_max"
                type="number"
                value={formData.salary_max}
                onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                placeholder="e.g., 150000"
              />
            </div>
          </div>

          {/* Job Description Upload */}
          <div className="space-y-2">
            <Label htmlFor="job-description">Job Description Document</Label>
            <div className="space-y-2">
              {currentJobDescUrl && !jobDescriptionFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm flex-1">Current job description</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadDocument(currentJobDescUrl, 'job-description.pdf')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="job-description"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleJobDescriptionChange}
                  className="flex-1"
                />
                {jobDescriptionFile && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">{jobDescriptionFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setJobDescriptionFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supporting Documents Upload */}
          <div className="space-y-2">
            <Label htmlFor="supporting-docs">Supporting Documents</Label>
            <div className="space-y-2">
              {existingSupportingDocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Existing documents:</p>
                  {existingSupportingDocs.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm flex-1">{doc.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadDocument(doc.url, doc.name)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExistingDocument(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Input
                id="supporting-docs"
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                onChange={handleSupportingDocumentsChange}
              />
              {supportingDocuments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">New documents to upload:</p>
                  {supportingDocuments.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm flex-1">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSupportingDocument(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {uploading ? "Uploading..." : loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};