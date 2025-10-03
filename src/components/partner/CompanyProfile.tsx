import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Save, X } from "lucide-react";

interface CompanyProfileProps {
  companyId: string;
  canEdit: boolean;
}

export const CompanyProfile = ({ companyId, canEdit }: CompanyProfileProps) => {
  const [company, setCompany] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (error) {
      console.error('Error fetching company:', error);
      toast.error("Failed to load company profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: company.name,
          tagline: company.tagline,
          description: company.description,
          website_url: company.website_url,
          linkedin_url: company.linkedin_url,
          twitter_url: company.twitter_url,
          headquarters_location: company.headquarters_location,
          industry: company.industry,
          company_size: company.company_size,
        })
        .eq('id', companyId);

      if (error) throw error;
      
      toast.success("Company profile updated");
      setEditing(false);
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error("Failed to update company profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black uppercase">
              Company Profile
            </CardTitle>
            <CardDescription>
              Manage your company information and branding
            </CardDescription>
          </div>
          {canEdit && !editing && (
            <Button onClick={() => setEditing(true)} variant="outline">
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {editing && (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={() => setEditing(false)} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              value={company?.name || ''}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={company?.tagline || ''}
              onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={company?.description || ''}
              onChange={(e) => setCompany({ ...company, description: e.target.value })}
              disabled={!editing}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={company?.website_url || ''}
              onChange={(e) => setCompany({ ...company, website_url: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input
              id="linkedin"
              type="url"
              value={company?.linkedin_url || ''}
              onChange={(e) => setCompany({ ...company, linkedin_url: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Headquarters Location</Label>
            <Input
              id="location"
              value={company?.headquarters_location || ''}
              onChange={(e) => setCompany({ ...company, headquarters_location: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={company?.industry || ''}
              onChange={(e) => setCompany({ ...company, industry: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Company Size</Label>
            <Input
              id="size"
              value={company?.company_size || ''}
              onChange={(e) => setCompany({ ...company, company_size: e.target.value })}
              disabled={!editing}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
