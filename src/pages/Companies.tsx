import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  industry: string | null;
  headquarters_location: string | null;
  company_size: string | null;
  membership_tier: string | null;
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, slug, logo_url, tagline, industry, headquarters_location, company_size, membership_tier")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.tagline?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
              Member Companies
            </h1>
            <p className="text-muted-foreground">
              Explore exclusive opportunities with The Quantum Club's elite partner companies
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-2 border-foreground"
            />
          </div>

          {/* Companies Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading companies...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No companies found matching your search." : "No companies available yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((company) => (
                <Card
                  key={company.id}
                  className="border-2 border-foreground hover:shadow-glow transition-all cursor-pointer group"
                  onClick={() => navigate(`/companies/${company.slug}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="w-16 h-16 border-2 border-accent">
                        <AvatarImage src={company.logo_url || undefined} alt={company.name} />
                        <AvatarFallback className="text-lg font-black">
                          {company.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-lg mb-1 group-hover:text-accent transition-colors truncate">
                          {company.name}
                        </h3>
                        {company.membership_tier === 'premium' && (
                          <Badge className="mb-2 text-xs">Premium Member</Badge>
                        )}
                        {company.tagline && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {company.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      {company.industry && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span className="truncate">{company.industry}</span>
                        </div>
                      )}
                      {company.headquarters_location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{company.headquarters_location}</span>
                        </div>
                      )}
                      {company.company_size && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span className="truncate">{company.company_size}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
    </AppLayout>
  );
}
