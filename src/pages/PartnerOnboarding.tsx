import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PartnerOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    website_url: "",
    linkedin_url: "",
    company_size: "",
    industry: "",
    headquarters_location: "",
    careers_email: user?.email || "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const generateUniqueSlug = async (baseName: string): Promise<string> => {
    let slug = generateSlug(baseName);
    let counter = 1;

    // Check if slug exists
    while (true) {
      const { data: existing } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!existing) {
        return slug; // Unique slug found
      }

      // Slug exists, try with counter
      slug = `${generateSlug(baseName)}-${counter}`;
      counter++;

      if (counter > 100) {
        throw new Error('Unable to generate unique company slug');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.company_size || !formData.industry) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Check if user already has a company
      const { data: existingMembership } = await supabase
        .from('company_members')
        .select('company_id, companies!inner(name)')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingMembership) {
        toast.error(`You are already registered with ${(existingMembership as any).companies.name}`, {
          description: "Please contact support if you need to create a new company."
        });
        setLoading(false);
        return;
      }

      // Generate unique slug
      const slug = await generateUniqueSlug(formData.name);
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          ...formData,
          slug,
          is_active: true,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Update user profile with company_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: company.id })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Add user as company owner
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          user_id: user?.id,
          company_id: company.id,
          role: 'owner',
          is_active: true,
        });

      if (memberError) throw memberError;

      toast.success("Company profile created successfully!");
      navigate('/company-jobs');
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || "Failed to create company profile");
    } finally {
      setLoading(false);
    }
  };

  const companySizes = [
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1000+"
  ];

  const industries = [
    "Technology",
    "Finance",
    "Healthcare",
    "Education",
    "E-commerce",
    "Marketing",
    "Consulting",
    "Manufacturing",
    "Real Estate",
    "Other"
  ];

  return (
    <AppLayout>
      <div className="container max-w-3xl mx-auto px-4 py-8 lg:py-12">
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            <h1 className="text-4xl font-black uppercase tracking-tight">
              Company Setup
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Let's get your company profile set up so you can start hiring top talent
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-2 border-foreground">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Tell us about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Acme Inc."
                  required
                />
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="Building the future of work"
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Tell candidates what makes your company unique..."
                  rows={4}
                />
              </div>

              {/* Company Size */}
              <div className="space-y-2">
                <Label htmlFor="company_size">
                  Company Size <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) => handleInputChange('company_size', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size} employees
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label htmlFor="industry">
                  Industry <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => handleInputChange('industry', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="headquarters_location">Headquarters Location</Label>
                <Input
                  id="headquarters_location"
                  value={formData.headquarters_location}
                  onChange={(e) => handleInputChange('headquarters_location', e.target.value)}
                  placeholder="Amsterdam, Netherlands"
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website_url">Company Website</Label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => handleInputChange('website_url', e.target.value)}
                  placeholder="https://yourcompany.com"
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>

              {/* Careers Email */}
              <div className="space-y-2">
                <Label htmlFor="careers_email">Careers Contact Email</Label>
                <Input
                  id="careers_email"
                  type="email"
                  value={formData.careers_email}
                  onChange={(e) => handleInputChange('careers_email', e.target.value)}
                  placeholder="careers@yourcompany.com"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Complete Setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
};

export default PartnerOnboarding;
