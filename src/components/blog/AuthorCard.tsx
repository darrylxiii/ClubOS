import React from 'react';
import { Author } from '@/data/blog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

interface AuthorCardProps { author: Author; showBio?: boolean; size?: 'sm' | 'md' | 'lg'; linkToProfile?: boolean; }

const AuthorCard: React.FC<AuthorCardProps> = ({ author, showBio = false, size = 'md' }) => {
  const sizeClasses = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' };
  const textSizeClasses = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' };

  return (
    <div className="flex items-start gap-3">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={author.avatar} alt={author.name} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {author.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-foreground ${textSizeClasses[size]}`}>{author.name}</span>
          {author.medicallyVerified && <ShieldCheck className="h-4 w-4 text-accent" aria-label="Verified expert" />}
        </div>
        <span className="text-sm text-muted-foreground">{author.credentials}</span>
        {showBio && <p className="mt-2 text-sm text-muted-foreground max-w-md">{author.bio}</p>}
        {showBio && author.publications > 0 && (
          <Badge variant="secondary" className="mt-2 w-fit text-xs">{author.publications} publications</Badge>
        )}
      </div>
    </div>
  );
};

export default AuthorCard;
