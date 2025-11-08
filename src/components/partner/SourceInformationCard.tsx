import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Link as LinkIcon, FileText } from "lucide-react";
import { format } from "date-fns";

interface Props {
  candidateId: string;
}

interface SourceInfo {
  sourcedBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  sourceChannel?: string;
  sourceContext?: any;
}

export function SourceInformationCard({ candidateId }: Props) {
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSourceInfo();
  }, [candidateId]);

  const loadSourceInfo = async () => {
    try {
      // Get candidate profile
      const { data: profile } = await supabase
        .from('candidate_profiles')
        .select('created_at, source_channel, created_by')
        .eq('user_id', candidateId)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Get source info from applications (most recent)
      const { data: application } = await supabase
        .from('applications')
        .select('sourced_by, source_context, created_at')
        .or(`user_id.eq.${candidateId},candidate_id.in.(SELECT id FROM candidate_profiles WHERE user_id = '${candidateId}')`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let sourcedBy = undefined;
      const sourcerId = application?.sourced_by || profile.created_by;

      if (sourcerId) {
        const { data: sourcerProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', sourcerId)
          .single();

        if (sourcerProfile) {
          sourcedBy = {
            id: sourcerProfile.id,
            name: sourcerProfile.full_name || 'Unknown',
            avatar: sourcerProfile.avatar_url
          };
        }
      }

      setSourceInfo({
        sourcedBy,
        createdAt: profile.created_at,
        sourceChannel: profile.source_channel,
        sourceContext: application?.source_context
      });
    } catch (error) {
      console.error('Error loading source info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Source Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sourceInfo) return null;

  const getSourceIcon = (channel?: string) => {
    switch (channel) {
      case 'linkedin_import':
        return <LinkIcon className="h-4 w-4" />;
      case 'referral':
        return <User className="h-4 w-4" />;
      case 'cv_upload':
        return <FileText className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (channel?: string) => {
    switch (channel) {
      case 'linkedin_import':
        return 'LinkedIn Import';
      case 'referral':
        return 'Referral';
      case 'cv_upload':
        return 'CV Upload';
      case 'direct_application':
        return 'Direct Application';
      default:
        return 'Other';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Source Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sourceInfo.sourcedBy && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground min-w-[100px]">Sourced by:</div>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={sourceInfo.sourcedBy.avatar} />
                <AvatarFallback>{sourceInfo.sourcedBy.name[0]}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{sourceInfo.sourcedBy.name}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground min-w-[100px]">Added:</div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(sourceInfo.createdAt), 'MMM dd, yyyy')}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground min-w-[100px]">Channel:</div>
          <Badge variant="outline" className="gap-2">
            {getSourceIcon(sourceInfo.sourceChannel)}
            {getSourceLabel(sourceInfo.sourceChannel)}
          </Badge>
        </div>

        {sourceInfo.sourceContext?.note && (
          <div className="pt-3 border-t">
            <div className="text-sm text-muted-foreground mb-2">Initial Note:</div>
            <p className="text-sm italic bg-muted/30 p-3 rounded-md">
              "{sourceInfo.sourceContext.note}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
