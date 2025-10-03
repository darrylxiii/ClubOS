import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone, Linkedin, Twitter, Instagram, User } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TalentStrategistProps {
  strategist: {
    id: string;
    full_name: string;
    title: string;
    bio?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    twitter_url?: string;
    instagram_url?: string;
    photo_url?: string;
    specialties?: string[];
  };
  compact?: boolean;
}

export const TalentStrategist = ({ strategist, compact = false }: TalentStrategistProps) => {
  const [showFullProfile, setShowFullProfile] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleContact = (type: 'email' | 'phone', value?: string) => {
    if (!value) return;
    
    if (type === 'email') {
      window.location.href = `mailto:${value}`;
    } else if (type === 'phone') {
      window.location.href = `tel:${value}`;
    }
  };

  if (compact) {
    return (
      <Dialog open={showFullProfile} onOpenChange={setShowFullProfile}>
        <DialogTrigger asChild>
          <Card className="border border-accent/20 bg-gradient-card hover:shadow-glow transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-accent">
                  <AvatarImage src={strategist.photo_url} alt={strategist.full_name} />
                  <AvatarFallback className="bg-accent/10 text-accent font-bold">
                    {getInitials(strategist.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{strategist.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{strategist.title}</p>
                </div>
                <User className="w-4 h-4 text-accent" />
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-16 w-16 border-2 border-accent">
                <AvatarImage src={strategist.photo_url} alt={strategist.full_name} />
                <AvatarFallback className="bg-accent/10 text-accent font-bold text-xl">
                  {getInitials(strategist.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-2xl font-black">{strategist.full_name}</h3>
                <p className="text-sm text-muted-foreground font-normal">{strategist.title}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {strategist.bio && (
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider mb-2">About</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{strategist.bio}</p>
              </div>
            )}

            {strategist.specialties && strategist.specialties.length > 0 && (
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider mb-2">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {strategist.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-3">Contact</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {strategist.email && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleContact('email', strategist.email)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                )}
                {strategist.phone && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleContact('phone', strategist.phone)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                )}
                {strategist.linkedin_url && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(strategist.linkedin_url, '_blank')}
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                )}
                {strategist.twitter_url && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(strategist.twitter_url, '_blank')}
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </Button>
                )}
                {strategist.instagram_url && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => window.open(strategist.instagram_url, '_blank')}
                  >
                    <Instagram className="w-4 h-4 mr-2" />
                    Instagram
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="border border-accent/20 bg-gradient-card shadow-glow">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border-2 border-accent">
            <AvatarImage src={strategist.photo_url} alt={strategist.full_name} />
            <AvatarFallback className="bg-accent/10 text-accent font-bold text-xl">
              {getInitials(strategist.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-xl font-black">{strategist.full_name}</CardTitle>
            <CardDescription className="text-base">{strategist.title}</CardDescription>
            {strategist.specialties && strategist.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {strategist.specialties.slice(0, 3).map((specialty, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {strategist.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed">{strategist.bio}</p>
        )}
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {strategist.email && (
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => handleContact('email', strategist.email)}
            >
              <Mail className="w-3 h-3 mr-1" />
              Email
            </Button>
          )}
          {strategist.phone && (
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => handleContact('phone', strategist.phone)}
            >
              <Phone className="w-3 h-3 mr-1" />
              Call
            </Button>
          )}
          {strategist.linkedin_url && (
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => window.open(strategist.linkedin_url, '_blank')}
            >
              <Linkedin className="w-3 h-3 mr-1" />
              LinkedIn
            </Button>
          )}
          {strategist.twitter_url && (
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => window.open(strategist.twitter_url, '_blank')}
            >
              <Twitter className="w-3 h-3 mr-1" />
              Twitter
            </Button>
          )}
          {strategist.instagram_url && (
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => window.open(strategist.instagram_url, '_blank')}
            >
              <Instagram className="w-3 h-3 mr-1" />
              Instagram
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};