import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  MapPin, 
  Users, 
  Calendar, 
  Globe, 
  Linkedin, 
  Twitter,
  Instagram,
  Mail,
  ArrowLeft,
  Target,
  Eye,
  Heart,
  Code,
  Briefcase,
  Sparkles,
  TrendingUp,
  MessageCircle,
  Star,
  Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CompanyPosts } from "@/components/partner/CompanyPosts";
import { CompanyMembersStack } from "@/components/companies/CompanyMembersStack";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  tagline: string | null;
  description: string | null;
  founded_year: number | null;
  company_size: string | null;
  industry: string | null;
  headquarters_location: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  mission: string | null;
  vision: string | null;
  values: string[];
  culture_highlights: string[];
  benefits: string[];
  tech_stack: string[];
  careers_email: string | null;
  careers_page_url: string | null;
  member_since: string | null;
  membership_tier: string | null;
}

export default function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [jobCount, setJobCount] = useState(0);

  useEffect(() => {
    loadCompany();
    loadFollowStatus();
    loadStats();
  }, [slug]);

  const loadCompany = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setCompany({
          ...data,
          values: (data.values as string[]) || [],
          culture_highlights: (data.culture_highlights as string[]) || [],
          benefits: (data.benefits as string[]) || [],
          tech_stack: (data.tech_stack as string[]) || [],
        });
      }
    } catch (error) {
      console.error("Error loading company:", error);
      toast.error("Failed to load company information");
    } finally {
      setLoading(false);
    }
  };

  const loadFollowStatus = async () => {
    if (!user || !company) return;

    try {
      const { data } = await supabase
        .from("company_followers")
        .select("id")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error loading follow status:", error);
    }
  };

  const loadStats = async () => {
    if (!company) return;

    try {
      const [followersRes, jobsRes] = await Promise.all([
        supabase.from("company_followers").select("id", { count: 'exact', head: true }).eq("company_id", company.id),
        supabase.from("jobs").select("id", { count: 'exact', head: true }).eq("company_id", company.id).eq("status", "published"),
      ]);

      setFollowerCount(followersRes.count || 0);
      setJobCount(jobsRes.count || 0);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleFollow = async () => {
    if (!user || !company) {
      toast.error("Please sign in to follow companies");
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from("company_followers")
          .delete()
          .eq("company_id", company.id)
          .eq("user_id", user.id);
        toast.success("Unfollowed company");
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from("company_followers")
          .insert({
            company_id: company.id,
            user_id: user.id,
          });
        toast.success("Following company!");
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("Failed to update follow status");
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/companies');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Company Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This company is not part of The Quantum Club network.
              </p>
              <Button onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-subtle">
        {/* Back Navigation */}
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Companies
          </Button>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Company Header */}
          <Card className="border-2 border-foreground glass backdrop-blur-lg overflow-hidden">
            {/* Header Media (Cover Image or Video) */}
            {company.cover_image_url && (
              <div className="relative w-full h-64 overflow-hidden">
                <img
                  src={company.cover_image_url}
                  alt="Company header"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
              </div>
            )}

            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="w-32 h-32 border-4 border-accent shadow-glass-lg ring-4 ring-accent/20">
                  <AvatarImage src={company.logo_url || undefined} alt={company.name} />
                  <AvatarFallback className="text-4xl font-black bg-gradient-accent text-white">
                    {company.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-4xl font-black uppercase">{company.name}</h1>
                      {company.membership_tier === 'premium' && (
                        <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white gap-1">
                          <Star className="w-3 h-3" />
                          Premium Partner
                        </Badge>
                      )}
                    </div>
                    {company.tagline && (
                      <p className="text-lg text-muted-foreground">{company.tagline}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {company.industry && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {company.industry}
                      </div>
                    )}
                    {company.headquarters_location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {company.headquarters_location}
                      </div>
                    )}
                    {company.company_size && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {company.company_size} employees
                      </div>
                    )}
                    {company.founded_year && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Founded {company.founded_year}
                      </div>
                    )}
                  </div>

                  {/* Social Links */}
                  <div className="flex flex-wrap gap-2">
                    {company.website_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(company.website_url!, '_blank')}
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Website
                      </Button>
                    )}
                    {company.linkedin_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(company.linkedin_url!, '_blank')}
                      >
                        <Linkedin className="w-4 h-4 mr-2" />
                        LinkedIn
                      </Button>
                    )}
                    {company.twitter_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(company.twitter_url!, '_blank')}
                      >
                        <Twitter className="w-4 h-4 mr-2" />
                        Twitter
                      </Button>
                    )}
                    {company.instagram_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(company.instagram_url!, '_blank')}
                      >
                        <Instagram className="w-4 h-4 mr-2" />
                        Instagram
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Bar */}
          <Card className="border-2 border-foreground glass backdrop-blur-lg">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-black">{followerCount}</div>
                    <div className="text-xs text-muted-foreground">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black">{jobCount}</div>
                    <div className="text-xs text-muted-foreground">Open Roles</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleFollow}
                    className="gap-2"
                  >
                    <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  <Button variant="outline" onClick={() => toast.info("Share feature coming soon!")}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                  {company.careers_page_url && (
                    <Button onClick={() => window.open(company.careers_page_url!, '_blank')}>
                      <Briefcase className="w-4 h-4 mr-2" />
                      View Careers
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs defaultValue="about" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 glass backdrop-blur-lg">
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">About</span>
              </TabsTrigger>
              <TabsTrigger value="culture" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Culture</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
              <TabsTrigger value="updates" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Updates</span>
              </TabsTrigger>
            </TabsList>

            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              {/* Company Description */}
              {company.description && (
                <Card className="border-2 border-foreground">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      About {company.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {company.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Mission & Vision */}
              {(company.mission || company.vision) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {company.mission && (
                    <Card className="border-2 border-foreground glass backdrop-blur-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Mission
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">
                          {company.mission}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  {company.vision && (
                    <Card className="border-2 border-foreground glass backdrop-blur-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Eye className="w-5 h-5" />
                          Vision
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">
                          {company.vision}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Tech Stack */}
              {company.tech_stack.length > 0 && (
                <Card className="border-2 border-foreground glass backdrop-blur-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      Tech Stack
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {company.tech_stack.map((tech, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Culture Tab */}
            <TabsContent value="culture" className="space-y-6">
              {/* Values */}
              {company.values.length > 0 && (
                <Card className="border-2 border-foreground glass backdrop-blur-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Our Values
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {company.values.map((value, index) => (
                        <div key={index} className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                          <p className="font-bold text-center">{value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Culture & Benefits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {company.culture_highlights.length > 0 && (
                  <Card className="border-2 border-foreground glass backdrop-blur-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Culture Highlights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {company.culture_highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-accent mt-1">•</span>
                            <span className="text-muted-foreground">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {company.benefits.length > 0 && (
                  <Card className="border-2 border-foreground glass backdrop-blur-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Benefits & Perks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {company.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-accent mt-1">•</span>
                            <span className="text-muted-foreground">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6">
              <Card className="border-2 border-foreground glass backdrop-blur-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Team Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CompanyMembersStack companyId={company.id} showFull />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Updates Tab */}
            <TabsContent value="updates" className="space-y-6">
              <CompanyPosts companyId={company.id} />
            </TabsContent>
          </Tabs>

          {/* Contact CTA */}
          {(company.careers_email || company.careers_page_url) && (
            <Card className="border-2 border-accent bg-accent/5 glass backdrop-blur-lg">
              <CardContent className="py-8 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-accent" />
                <h3 className="text-2xl font-black mb-2">Interested in Joining?</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Discover opportunities to join our team and help us build the future
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {company.careers_page_url && (
                    <Button
                      size="lg"
                      onClick={() => window.open(company.careers_page_url!, '_blank')}
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      View Open Roles
                    </Button>
                  )}
                  {company.careers_email && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => window.location.href = `mailto:${company.careers_email}`}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Contact Us
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}