import { Shield, Lock, Award, CheckCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-4">
      <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
        <Shield className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs">GDPR Compliant</span>
      </Badge>
      <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
        <Lock className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs">256-bit SSL</span>
      </Badge>
      <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
        <Award className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs">No-Cure-No-Pay</span>
      </Badge>
      <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
        <Star className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs">4.9/5 Rating</span>
      </Badge>
    </div>
  );
}

export function TrustBadgesMinimal() {
  return (
    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground py-2">
      <div className="flex items-center gap-1">
        <Shield className="w-3 h-3" />
        <span>Secure</span>
      </div>
      <div className="flex items-center gap-1">
        <Lock className="w-3 h-3" />
        <span>Encrypted</span>
      </div>
      <div className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        <span>GDPR</span>
      </div>
    </div>
  );
}
