import { Building2, MapPin, Clock, Bookmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";

interface JobCardProps {
  title: string;
  company: string;
  location: string;
  type: string;
  postedDate: string;
  status?: "applied" | "screening" | "interview" | "offer" | "rejected";
  tags: string[];
  onApply?: () => void;
}

export const JobCard = ({
  title,
  company,
  location,
  type,
  postedDate,
  status,
  tags,
  onApply,
}: JobCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border border-border bg-gradient-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                <span>{company}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{postedDate}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {type}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {status ? (
              <StatusBadge status={status} />
            ) : (
              <Button onClick={onApply} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Apply Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
