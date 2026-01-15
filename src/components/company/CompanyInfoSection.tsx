import { Briefcase, MapPin, Users, Calendar, Globe, Linkedin, Twitter, Instagram, Mail, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Company {
  name?: string | null;
  industry: string | null;
  headquarters_location: string | null;
  company_size: string | null;
  founded_year: number | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  careers_email: string | null;
  careers_page_url: string | null;
  logo_url?: string | null;
}

interface CompanyInfoSectionProps {
  company: Company;
  followerCount: number;
  isFollowing: boolean;
  onFollow: () => void;
}

export function CompanyInfoSection({
  company,
  followerCount,
  isFollowing,
  onFollow,
}: CompanyInfoSectionProps) {
  return (
    <div className="space-y-4">
      {/* Quick Info */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {company.industry && (
          <div className="flex items-center gap-1">
            <Briefcase className="w-4 h-4" />
            <span>{company.industry}</span>
          </div>
        )}
        {company.headquarters_location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{company.headquarters_location}</span>
          </div>
        )}
        {company.company_size && (
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{company.company_size} employees</span>
          </div>
        )}
        {company.founded_year && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Founded {company.founded_year}</span>
          </div>
        )}
      </div>

      {/* Social Links & Actions */}
      <div className="flex flex-wrap gap-2">
        {company.website_url && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(company.website_url!, '_blank')}
            aria-label="Visit company website"
          >
            <Globe className="w-4 h-4" />
            Website
          </Button>
        )}
        {company.linkedin_url && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(company.linkedin_url!, '_blank')}
            aria-label="Visit LinkedIn profile"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </Button>
        )}
        {company.twitter_url && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(company.twitter_url!, '_blank')}
            aria-label="Visit Twitter profile"
          >
            <Twitter className="w-4 h-4" />
            Twitter
          </Button>
        )}
        {company.instagram_url && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(company.instagram_url!, '_blank')}
            aria-label="Visit Instagram profile"
          >
            <Instagram className="w-4 h-4" />
            Instagram
          </Button>
        )}
        {company.careers_email && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.location.href = `mailto:${company.careers_email}`}
            aria-label="Email careers team"
          >
            <Mail className="w-4 h-4" />
            Careers
          </Button>
        )}
        <Button
          variant={isFollowing ? "secondary" : "default"}
          size="sm"
          className="gap-2 ml-auto"
          onClick={onFollow}
          aria-label={isFollowing ? "Unfollow company" : "Follow company"}
        >
          <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
          {isFollowing ? "Following" : "Follow"}
          {followerCount > 0 && <span className="ml-1">({followerCount})</span>}
        </Button>
      </div>
    </div>
  );
}
