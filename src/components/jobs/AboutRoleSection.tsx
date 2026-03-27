import { useTranslation } from 'react-i18next';
import { FileText } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface AboutRoleSectionProps {
  description?: string;
}

export function AboutRoleSection({ description }: AboutRoleSectionProps) {
  const { t } = useTranslation('common');
  if (!description) return null;

  return (
    <Card className="border-2 hover:border-primary transition-all hover-scale">
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary flex-shrink-0" />
          <div>
            <h3 className="text-xl font-black">{t("about_the_role", "About the Role")}</h3>
            <p className="text-sm text-muted-foreground">{t("full_job_description", "Full job description")}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="border-t pt-6">
        <p className="text-foreground/90 leading-relaxed">
          {description.split('\n').map((paragraph, index) => (
            <span key={index}>
              {paragraph}
              {index < description.split('\n').length - 1 && <><br /><br /></>}
            </span>
          ))}
        </p>
      </CardContent>
    </Card>
  );
}
