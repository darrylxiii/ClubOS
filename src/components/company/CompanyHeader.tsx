import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Settings, Eye, Share2, Star } from "lucide-react";
import { logger } from "@/lib/logger";

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  cover_image_url: string | null;
  tagline: string | null;
  description: string | null;
  membership_tier: string | null;
}

interface CompanyHeaderProps {
  company: Company;
  isAdmin: boolean;
  isCompanyMember: boolean;
  onEditClick: () => void;
  onUploadCover: (file: File) => void;
  onShare: () => void;
}

export function CompanyHeader({
  company,
  isAdmin,
  isCompanyMember,
  onEditClick,
  onUploadCover,
  onShare,
}: CompanyHeaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      logger.info('Cover image selected', { fileName: file.name, fileSize: file.size });
      onUploadCover(file);
    }
  };

  return (
    <div className="relative overflow-visible">
      {/* Cover Image */}
      <div className="relative w-full h-64 overflow-hidden bg-muted rounded-t-lg">
        {company.cover_image_url ? (
          <>
            <img
              src={company.cover_image_url}
              alt={`${company.name} cover`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
          </>
        ) : null}

        {/* Change Header button */}
        {(isAdmin || isCompanyMember) && (
          <div className="absolute top-4 right-4">
            <label htmlFor="cover-upload" className="cursor-pointer">
              <Button size="sm" variant="secondary" className="gap-2 shadow-lg" asChild>
                <span>
                  <ImageIcon className="w-4 h-4" />
                  Change Header
                </span>
              </Button>
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Upload cover image"
              />
            </label>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="absolute top-64 left-6 transform -translate-y-1/2 z-10">
        <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
          <AvatarImage 
            src={company.logo_url || undefined}
            className="object-contain w-full h-full"
            alt={`${company.name} logo`}
          />
          <AvatarFallback className="text-4xl font-black bg-gradient-to-br from-primary to-accent text-white">
            {company.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {(isAdmin || isCompanyMember) && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0 shadow-lg"
            onClick={onEditClick}
            aria-label="Edit company"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Company Info */}
      <div className="pt-20 px-6 pb-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{company.name}</h1>
              {company.membership_tier === 'premium' && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white gap-1">
                  <Star className="w-3 h-3" />
                  Premium Partner
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{company.tagline || 'Building the future'}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" className="gap-2" aria-label="Preview company page">
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={onShare} aria-label="Share company page">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {company.description && (
          <p className="text-muted-foreground">
            {company.description}
          </p>
        )}
      </div>
    </div>
  );
}
