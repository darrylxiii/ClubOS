import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Mail,
  ExternalLink,
  Target,
  Eye,
  Heart,
  Code,
  Briefcase
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, [slug]);

  const loadCompany = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

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

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading company...</p>
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Company Not Found</h2>
              <p className="text-muted-foreground">
                This company is not part of The Quantum Club network.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-subtle">
        {/* Cover Image */}
        {company.cover_image_url && (
          <div 
            className="h-64 bg-cover bg-center border-b-2 border-foreground"
            style={{ backgroundImage: `url(${company.cover_image_url})` }}
          />
        )}

        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Company Header */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="w-24 h-24 border-2 border-accent">
              <AvatarImage src={company.logo_url || undefined} alt={company.name} />
              <AvatarFallback className="text-2xl font-black">
                {company.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-4xl font-black uppercase mb-2">{company.name}</h1>
                  {company.tagline && (
                    <p className="text-lg text-muted-foreground">{company.tagline}</p>
                  )}
                </div>
                {company.membership_tier === 'premium' && (
                  <Badge className="bg-accent text-accent-foreground">Premium Member</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
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
                    {company.company_size}
                  </div>
                )}
                {company.founded_year && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Founded {company.founded_year}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
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
                {company.careers_page_url && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(company.careers_page_url!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Careers Page
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* About Section */}
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
                <Card className="border-2 border-foreground">
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
                <Card className="border-2 border-foreground">
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

          {/* Values */}
          {company.values.length > 0 && (
            <Card className="border-2 border-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Our Values
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {company.values.map((value, index) => (
                    <div key={index} className="p-4 bg-secondary rounded-lg">
                      <p className="font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Culture & Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {company.culture_highlights.length > 0 && (
              <Card className="border-2 border-foreground">
                <CardHeader>
                  <CardTitle>Culture Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
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
              <Card className="border-2 border-foreground">
                <CardHeader>
                  <CardTitle>Benefits & Perks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
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

          {/* Tech Stack */}
          {company.tech_stack.length > 0 && (
            <Card className="border-2 border-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Tech Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.tech_stack.map((tech, index) => (
                    <Badge key={index} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact CTA */}
          {company.careers_email && (
            <Card className="border-2 border-accent bg-accent/5">
              <CardContent className="py-8 text-center">
                <h3 className="text-2xl font-black mb-2">Interested in Joining?</h3>
                <p className="text-muted-foreground mb-4">
                  Get in touch with our team to learn more about opportunities
                </p>
                <Button
                  size="lg"
                  onClick={() => window.location.href = `mailto:${company.careers_email}`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Careers Team
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
