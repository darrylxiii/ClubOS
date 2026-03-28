import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Award, CheckCircle2, Calendar, BookOpen, Share2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from 'react-i18next';

export default function CertificateVerify() {
  const { code } = useParams();
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation('common');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['certificate-verify', code],
    queryFn: async () => {
      const { data: cert, error } = await supabase
        .from("certificates")
        .select(`
          *,
          courses(title, slug, category, difficulty_level),
          profiles:user_id(full_name, avatar_url)
        `)
        .eq("verification_code", code)
        .maybeSingle();

      if (error || !cert) return null;
      return cert;
    },
    enabled: !!code,
  });

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t('certificate.verifying', 'Verifying certificate...')}</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">{t('certificate.notFound', 'Certificate Not Found')}</h2>
          <p className="text-muted-foreground">
            This verification code is invalid or the certificate does not exist.
          </p>
        </Card>
      </div>
    );
  }

  const course = data.courses as any;
  const profile = data.profiles as any;
  const issuedDate = new Date(data.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4 text-primary" />
            <span>ClubOS Academy — Certificate Verification</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Verification Status */}
        <div className="flex items-center gap-3 mb-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-700 dark:text-green-400">{t('certificate.verified', 'Verified Certificate')}</p>
            <p className="text-sm text-muted-foreground">
              This certificate was issued by ClubOS Academy and is authentic.
            </p>
          </div>
        </div>

        {/* Certificate Card */}
        <Card className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <Award className="h-16 w-16 mx-auto text-primary" />
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">{t('certificate.ofCompletion', 'Certificate of Completion')}</p>
              <h1 className="text-3xl font-bold mt-2">{course?.title || "Course"}</h1>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-muted-foreground">{t('certificate.awardedTo', 'Awarded to')}</p>
            <p className="text-2xl font-semibold">{profile?.full_name || "Student"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('certificate.issuedOn', 'Issued On')}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{issuedDate}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('certificate.certificateNumber', 'Certificate Number')}</p>
              <p className="text-sm font-mono font-medium mt-1">{data.certificate_number}</p>
            </div>
          </div>

          {course && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t">
              {course.category && <Badge variant="outline">{course.category}</Badge>}
              {course.difficulty_level && <Badge variant="secondary">{course.difficulty_level}</Badge>}
            </div>
          )}

          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Verification Code: <span className="font-mono">{data.verification_code}</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
