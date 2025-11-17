import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Image as ImageIcon, Users, CheckCircle2, Loader2, Sparkles, Globe, Linkedin, Twitter, Instagram, Upload, X, Search } from "lucide-react";
import { toast } from "sonner";

interface AddCompanyDialogProps {
  onSuccess: () => void;
}

interface TeamMember {
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export function AddCompanyDialog({ onSuccess }: AddCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [autoFetching, setAutoFetching] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    description: "",
    industry: "",
    company_size: "",
    headquarters_location: "",
    website_url: "",
    linkedin_username: "",
    twitter_username: "",
    instagram_username: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [companySearchResults, setCompanySearchResults] = useState<any[]>([]);
  const [searchingCompanies, setSearchingCompanies] = useState(false);

  const steps = [
    { id: 0, title: "Company Details", icon: Building2 },
    { id: 1, title: "Branding & Media", icon: ImageIcon },
    { id: 2, title: "Team & Socials", icon: Users },
    { id: 3, title: "Review & Create", icon: CheckCircle2 }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  // Search companies database
  const searchCompanies = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setCompanySearchResults([]);
      return;
    }
    
    setSearchingCompanies(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-companies', {
        body: { query }
      });

      if (error) throw error;
      
      if (data?.companies) {
        setCompanySearchResults(data.companies);
      }
    } catch (error) {
      console.error('Company search error:', error);
      setCompanySearchResults([]);
    } finally {
      setSearchingCompanies(false);
    }
  }, []);

  // Debounced company search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (companySearchQuery) {
        searchCompanies(companySearchQuery);
      } else {
        setCompanySearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [companySearchQuery, searchCompanies]);

  // Select company from autocomplete
  const selectCompany = (company: any) => {
    setFormData(prev => ({
      ...prev,
      name: company.name,
      website_url: company.domain ? `https://${company.domain}` : prev.website_url,
    }));
    
    if (company.logo) {
      setLogoPreview(company.logo);
    }
    
    setCompanySearchQuery("");
    setCompanySearchResults([]);
    toast.success("Company data loaded!");
  };

  // Search users for team assignment
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchingUsers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        
        const filtered = data?.filter(
          user => !teamMembers.some(member => member.user_id === user.id)
        ) || [];
        
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setSearchingUsers(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, teamMembers]);

  const handleFileUpload = (file: File, type: 'logo' | 'cover') => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(reader.result as string);
      } else {
        setCoverFile(file);
        setCoverPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const addTeamMember = (user: any, role: string) => {
    setTeamMembers(prev => [...prev, {
      user_id: user.id,
      role,
      full_name: user.full_name,
      email: user.email,
      avatar_url: user.avatar_url
    }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeTeamMember = (userId: string) => {
    setTeamMembers(prev => prev.filter(m => m.user_id !== userId));
  };

  const handleSubmit = async () => {
    console.log('[AddCompany] handleSubmit called');
    
    if (!formData.name) {
      toast.error("Company name is required");
      return;
    }

    // 🔧 Step 1: Verify authentication first
    console.log('[AddCompany] Verifying authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[AddCompany] Authentication error:', authError);
      toast.error("You must be logged in to create a company. Please refresh and try again.", {
        duration: 6000
      });
      return;
    }

    console.log('[AddCompany] User authenticated:', { userId: user.id, email: user.email });
    console.log('[AddCompany] Starting company creation with data:', formData);

    // Show loading toast
    const loadingToast = toast.loading("Creating company...");
    setLoading(true);
    
    try {
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      console.log('[AddCompany] Generated slug:', slug);
      
      // Build full URLs from usernames
      const linkedinUrl = formData.linkedin_username 
        ? `https://linkedin.com/company/${formData.linkedin_username}` 
        : null;
      const twitterUrl = formData.twitter_username 
        ? `https://twitter.com/${formData.twitter_username}` 
        : null;
      const instagramUrl = formData.instagram_username 
        ? `https://instagram.com/${formData.instagram_username}` 
        : null;

      console.log('[AddCompany] Attempting to insert company into database...');
      
      // Create company
      const { data: company, error: companyError } = await supabase
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
          linkedin_url: linkedinUrl,
          twitter_url: twitterUrl,
          instagram_url: instagramUrl,
          is_active: true,
        })
        .select()
        .single();

      console.log('[AddCompany] Insert result:', { 
        success: !companyError, 
        companyId: company?.id,
        error: companyError 
      });

      if (companyError) {
        console.error('[AddCompany] Company creation failed:', {
          code: companyError.code,
          message: companyError.message,
          details: companyError.details,
          hint: companyError.hint
        });
        throw companyError;
      }

      console.log('[AddCompany] Company created successfully:', company.id);

      // Upload logo if exists
      if (logoFile && company) {
        console.log('[AddCompany] Uploading logo...');
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${company.id}-logo.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) {
          console.error('[AddCompany] Logo upload error:', uploadError);
          toast.error(`Failed to upload logo: ${uploadError.message}`);
        } else {
          console.log('[AddCompany] Logo uploaded successfully');
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          const { error: updateError } = await supabase
            .from('companies')
            .update({ logo_url: publicUrl })
            .eq('id', company.id);
          
          if (updateError) {
            console.error('[AddCompany] Logo URL update error:', updateError);
          } else {
            console.log('[AddCompany] Logo URL updated');
          }
        }
      }

      // Upload cover if exists
      if (coverFile && company) {
        console.log('[AddCompany] Uploading cover image...');
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${company.id}-cover.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('profile-headers')
          .upload(fileName, coverFile, { upsert: true });

        if (uploadError) {
          console.error('[AddCompany] Cover upload error:', uploadError);
          toast.error(`Failed to upload cover image: ${uploadError.message}`);
        } else {
          console.log('[AddCompany] Cover uploaded successfully');
          const { data: { publicUrl } } = supabase.storage
            .from('profile-headers')
            .getPublicUrl(fileName);

          const { error: updateError } = await supabase
            .from('companies')
            .update({ cover_image_url: publicUrl })
            .eq('id', company.id);
          
          if (updateError) {
            console.error('[AddCompany] Cover URL update error:', updateError);
          } else {
            console.log('[AddCompany] Cover URL updated');
          }
        }
      }

      // Add team members
      if (teamMembers.length > 0 && company) {
        console.log('[AddCompany] Adding team members:', teamMembers.length);
        const membersToInsert = teamMembers.map(member => ({
          company_id: company.id,
          user_id: member.user_id,
          role: member.role,
          is_active: true,
        }));

        const { error: membersError } = await supabase
          .from('company_members')
          .insert(membersToInsert);

        if (membersError) {
          console.error('[AddCompany] Error adding team members:', membersError);
        } else {
          console.log('[AddCompany] Team members added successfully');
        }
      }

      toast.dismiss(loadingToast);
      toast.success("Company created successfully!");
      console.log('[AddCompany] Process completed successfully');
      
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('[AddCompany] Error creating company:', error);
      console.error('[AddCompany] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      
      toast.dismiss(loadingToast);
      
      // 🔧 Improved: More specific error messages
      if (error.code === '42501') {
        console.error('[AddCompany] RLS Policy Violation: User lacks required role');
        toast.error("Permission denied. You need Partner or Admin role to create companies. Please contact support.", {
          duration: 6000
        });
      } else if (error.message?.includes('row-level security') || error.message?.includes('policy')) {
        console.error('[AddCompany] RLS Security Policy Error');
        toast.error("Access denied by security policy. Please contact an administrator.", {
          duration: 6000
        });
      } else if (error.code === '23505') {
        // Unique constraint violation
        console.error('[AddCompany] Unique constraint violation');
        if (error.message.includes('companies_name_key')) {
          toast.error("A company with this name already exists.");
        } else if (error.message.includes('companies_slug_key')) {
          toast.error("A company with a similar name already exists. Try a different name.");
        } else {
          toast.error("This company information conflicts with an existing company.");
        }
      } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        console.error('[AddCompany] Authentication error');
        toast.error("Authentication error. Please refresh the page and try again.", {
          duration: 6000
        });
      } else {
        console.error('[AddCompany] Generic error');
        toast.error(error.message || "Failed to create company. Please try again or contact support.", {
          duration: 5000
        });
      }
    } finally {
      setLoading(false);
      console.log('[AddCompany] Loading state reset, handleSubmit complete');
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
      linkedin_username: "",
      twitter_username: "",
      instagram_username: "",
    });
    setLogoFile(null);
    setLogoPreview("");
    setCoverFile(null);
    setCoverPreview("");
    setTeamMembers([]);
    setCurrentStep(0);
    setCompanySearchQuery("");
    setCompanySearchResults([]);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name.trim().length > 0;
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      setOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg hover:shadow-xl">
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden backdrop-blur-xl bg-background/95 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            Add New Partner Company
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div 
                  key={step.id}
                  className={`flex items-center gap-1 ${
                    currentStep === step.id ? 'text-primary font-semibold' : ''
                  } ${currentStep > step.id ? 'text-primary' : ''}`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Step 0: Company Details */}
          {currentStep === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2 relative">
                <Label htmlFor="name" className="flex items-center gap-2">
                  Company Name *
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={companySearchQuery || formData.name}
                    onChange={(e) => {
                      setCompanySearchQuery(e.target.value);
                      setFormData({ ...formData, name: e.target.value });
                    }}
                    placeholder="Start typing company name..."
                  />
                  {searchingCompanies && (
                    <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                
                {companySearchResults.length > 0 && (
                  <Card className="absolute z-50 w-full mt-1">
                    <CardContent className="p-2">
                      <ScrollArea className="max-h-64">
                        {companySearchResults.map((company, idx) => (
                          <div
                            key={idx}
                            onClick={() => selectCompany(company)}
                            className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition-colors"
                          >
                            {company.logo && (
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={company.logo} />
                                <AvatarFallback>{company.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{company.name}</p>
                              {company.domain && (
                                <p className="text-xs text-muted-foreground">{company.domain}</p>
                              )}
                            </div>
                            <Sparkles className="w-4 h-4 text-primary" />
                          </div>
                        ))}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://example.com"
                  className="transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="Technology, Finance, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_size">Company Size</Label>
                  <Select 
                    value={formData.company_size} 
                    onValueChange={(value) => setFormData({ ...formData, company_size: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10</SelectItem>
                      <SelectItem value="11-50">11-50</SelectItem>
                      <SelectItem value="51-200">51-200</SelectItem>
                      <SelectItem value="201-500">201-500</SelectItem>
                      <SelectItem value="501-1000">501-1000</SelectItem>
                      <SelectItem value="1000+">1000+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headquarters">Headquarters Location</Label>
                <Input
                  id="headquarters"
                  value={formData.headquarters_location}
                  onChange={(e) => setFormData({ ...formData, headquarters_location: e.target.value })}
                  placeholder="Amsterdam, Netherlands"
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
                  placeholder="Tell us about the company..."
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 1: Branding & Media */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <Label>Company Logo</Label>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Avatar className="w-24 h-24 border-4 border-border">
                      <AvatarImage src={logoPreview} />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/50">
                        {formData.name ? formData.name.substring(0, 2).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <Card className="border-2 border-dashed hover:border-primary transition-colors">
                        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload logo
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG up to 5MB
                          </p>
                        </CardContent>
                      </Card>
                    </Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Cover Image</Label>
                {coverPreview ? (
                  <div className="relative rounded-lg overflow-hidden border-2 border-border">
                    <img src={coverPreview} alt="Cover" className="w-full h-48 object-cover" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview("");
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Label htmlFor="cover-upload" className="cursor-pointer">
                    <Card className="border-2 border-dashed hover:border-primary transition-colors">
                      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload cover image
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Recommended: 1200x400px, PNG or JPG
                        </p>
                      </CardContent>
                    </Card>
                  </Label>
                )}
                <Input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'cover')}
                />
              </div>
            </div>
          )}

          {/* Step 2: Team & Socials */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <Label>Assign Team Members</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchingUsers && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}

                {searchResults.length > 0 && (
                  <Card>
                    <CardContent className="p-2">
                      <ScrollArea className="max-h-48">
                        {searchResults.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={user.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <Select onValueChange={(role) => addTeamMember(user, role)}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="recruiter">Recruiter</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {teamMembers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Selected Team Members ({teamMembers.length})</Label>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <Card key={member.user_id}>
                          <CardContent className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="bg-muted text-muted-foreground font-bold">
                                  {member.full_name ? member.full_name.substring(0, 2).toUpperCase() : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.full_name}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{member.role}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTeamMember(member.user_id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>Social Media Links</Label>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2 text-sm">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn Username
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">linkedin.com/company/</span>
                    <Input
                      id="linkedin"
                      value={formData.linkedin_username}
                      onChange={(e) => setFormData({ ...formData, linkedin_username: e.target.value })}
                      placeholder="company-name"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter" className="flex items-center gap-2 text-sm">
                    <Twitter className="w-4 h-4" />
                    Twitter Username
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">twitter.com/</span>
                    <Input
                      id="twitter"
                      value={formData.twitter_username}
                      onChange={(e) => setFormData({ ...formData, twitter_username: e.target.value })}
                      placeholder="companyhandle"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-2 text-sm">
                    <Instagram className="w-4 h-4" />
                    Instagram Username
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">instagram.com/</span>
                    <Input
                      id="instagram"
                      value={formData.instagram_username}
                      onChange={(e) => setFormData({ ...formData, instagram_username: e.target.value })}
                      placeholder="companyname"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Create */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">Review Company Details</h3>
                <p className="text-sm text-muted-foreground">Please review before creating</p>
              </div>

              <Card className="overflow-hidden border-2">
                {coverPreview && (
                  <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/10 relative">
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <Avatar className="w-16 h-16 border-4 border-background -mt-12 relative z-10">
                      <AvatarImage src={logoPreview} />
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary/50">
                        {formData.name ? formData.name.substring(0, 2).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold">{formData.name}</h4>
                      {formData.tagline && (
                        <p className="text-sm text-muted-foreground mt-1">{formData.tagline}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {formData.description && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="text-sm mt-1">{formData.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {formData.industry && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Industry</Label>
                          <p className="text-sm mt-1">{formData.industry}</p>
                        </div>
                      )}
                      {formData.company_size && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Size</Label>
                          <p className="text-sm mt-1">{formData.company_size}</p>
                        </div>
                      )}
                    </div>

                    {formData.headquarters_location && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Location</Label>
                        <p className="text-sm mt-1">{formData.headquarters_location}</p>
                      </div>
                    )}

                    {(formData.website_url || formData.linkedin_username || formData.twitter_username || formData.instagram_username) && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Links</Label>
                        <div className="flex flex-wrap gap-2">
                          {formData.website_url && (
                            <Badge variant="outline" className="gap-1">
                              <Globe className="w-3 h-3" />
                              Website
                            </Badge>
                          )}
                          {formData.linkedin_username && (
                            <Badge variant="outline" className="gap-1">
                              <Linkedin className="w-3 h-3" />
                              LinkedIn
                            </Badge>
                          )}
                          {formData.twitter_username && (
                            <Badge variant="outline" className="gap-1">
                              <Twitter className="w-3 h-3" />
                              Twitter
                            </Badge>
                          )}
                          {formData.instagram_username && (
                            <Badge variant="outline" className="gap-1">
                              <Instagram className="w-3 h-3" />
                              Instagram
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {teamMembers.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Team Members ({teamMembers.length})
                        </Label>
                        <div className="flex -space-x-2">
                          {teamMembers.slice(0, 5).map((member) => (
                            <Avatar key={member.user_id} className="w-8 h-8 border-2 border-background">
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {member.full_name ? member.full_name.substring(0, 2).toUpperCase() : "?"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {teamMembers.length > 5 && (
                            <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-semibold">
                              +{teamMembers.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0 || loading}
          >
            Back
          </Button>
          
          <div className="flex gap-2">
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="gap-2"
              >
                Next
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Company
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
