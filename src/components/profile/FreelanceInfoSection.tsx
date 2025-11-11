import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, Clock, Star, ExternalLink, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FreelanceInfoSectionProps {
  profile: any;
  isOwnProfile: boolean;
}

export function FreelanceInfoSection({ profile, isOwnProfile }: FreelanceInfoSectionProps) {
  const navigate = useNavigate();

  if (!profile?.open_to_freelance_work) {
    return null;
  }

  const availabilityColors = {
    available: "bg-green-500/10 text-green-600 border-green-200",
    busy: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    not_accepting: "bg-gray-500/10 text-gray-600 border-gray-200"
  };

  const availabilityLabels = {
    available: "Available for Projects",
    busy: "Busy - Limited Availability",
    not_accepting: "Not Accepting Projects"
  };

  const status = profile.freelance_availability_status || 'not_accepting';

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Available for Freelance Projects</CardTitle>
          </div>
          <Badge className={availabilityColors[status as keyof typeof availabilityColors]}>
            {availabilityLabels[status as keyof typeof availabilityLabels]}
          </Badge>
        </div>
        <CardDescription>
          {isOwnProfile 
            ? "Your freelance profile is visible to clients looking for talent"
            : "This professional is open to freelance opportunities"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rates & Availability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            <DollarSign className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hourly Rate</p>
              <p className="text-lg font-bold">
                €{profile.freelance_hourly_rate_min || 0} - €{profile.freelance_hourly_rate_max || 0}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Availability</p>
              <p className="text-lg font-bold">
                {profile.freelance_hours_per_week_min || 0}-{profile.freelance_hours_per_week_max || 0} hrs/week
              </p>
            </div>
          </div>
        </div>

        {/* Categories */}
        {profile.freelance_categories && profile.freelance_categories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Specializations</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.freelance_categories.map((category: string) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {profile.portfolio_url && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Portfolio</p>
            </div>
            <a 
              href={profile.portfolio_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View Portfolio
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Experience */}
        {profile.freelance_years_experience && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {profile.freelance_years_experience} years of freelancing experience
            </p>
          </div>
        )}

        {/* CTA for own profile or visitors */}
        <div className="pt-4 border-t">
          {isOwnProfile ? (
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={() => navigate('/settings?tab=freelance')}
            >
              Edit Freelance Settings
            </Button>
          ) : (
            <Button 
              className="w-full gap-2"
              onClick={() => navigate('/projects')}
            >
              View Available Projects
              <Briefcase className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
