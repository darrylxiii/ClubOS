import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddCompanyDialogProps {
  onSuccess: () => void;
}

export function AddCompanyDialog({ onSuccess }: AddCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    industry: "",
    company_size: "",
    headquarters_location: "",
    website_url: "",
    linkedin_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Company name is required");
      return;
    }

    setLoading(true);
    try {
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { error } = await supabase
        .from('companies')
        .insert({
          name: formData.name,
          slug,
          tagline: formData.tagline || null,
          description: formData.description || null,
          industry: formData.industry || null,
          company_size: formData.company_size || null,
          headquarters_location: formData.headquarters_location || null,
          website_url: formData.website_url || null,
          linkedin_url: formData.linkedin_url || null,
          is_active: true,
        });

      if (error) throw error;
      
      toast.success("Company created successfully");
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      tagline: "",
      description: "",
      industry: "",
      company_size: "",
      headquarters_location: "",
      website_url: "",
      linkedin_url: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      setOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Partner Company</DialogTitle>
          <DialogDescription>
            Create a new company profile for The Quantum Club ecosystem
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Acme Corporation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="One-line company description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Full company description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Technology, Finance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_size">Company Size</Label>
              <Input
                id="company_size"
                value={formData.company_size}
                onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                placeholder="e.g., 50-200, 1000+"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headquarters_location">Headquarters Location</Label>
            <Input
              id="headquarters_location"
              value={formData.headquarters_location}
              onChange={(e) => setFormData({ ...formData, headquarters_location: e.target.value })}
              placeholder="e.g., Amsterdam, Netherlands"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website_url">Website URL</Label>
            <Input
              id="website_url"
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/company/..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
