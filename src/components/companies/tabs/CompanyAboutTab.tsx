import { Card, CardContent } from "@/components/ui/card";
import { Target, Sparkles, Star } from "lucide-react";
import { EntityKnowledgeProfile } from "@/components/intelligence/EntityKnowledgeProfile";
import { CompanyOfficeManager } from "@/components/companies/CompanyOfficeManager";
import { useTranslation } from 'react-i18next';

interface CompanyAboutTabProps {
  company: {
    id: string;
    mission: string | null;
    vision: string | null;
    values: string[];
  };
  isAdmin: boolean;
  isCompanyMember: boolean;
}

export const CompanyAboutTab = ({ company, isAdmin, isCompanyMember }: CompanyAboutTabProps) => {
  const { t } = useTranslation('companies');
  return (
    <div className="space-y-6 mt-6">
      {/* Mission & Vision */}
      {(company.mission || company.vision) && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {company.mission && (
              <div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />{t('ourMission', 'Our Mission')}</h3>
                <p className="text-muted-foreground">{company.mission}</p>
              </div>
            )}
            {company.vision && (
              <div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-muted-foreground" />{t('ourVision', 'Our Vision')}</h3>
                <p className="text-muted-foreground">{company.vision}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Values */}
      {company.values.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">{t('ourValues', 'Our Values')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {company.values.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brand Voice & Knowledge */}
      {(isAdmin || isCompanyMember) && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{t('brandVoiceKnowledge', 'Brand Voice & Knowledge')}</h2>
                <p className="text-muted-foreground text-sm">{t('configureHowTheAiRepresents', 'Configure how the AI represents this company.')}</p>
              </div>
            </div>
            <EntityKnowledgeProfile 
              entityId={company.id} 
              entityType="company"
              title={t('title.brandBrainConfiguration', 'Brand Brain Configuration')}
              description={t('description.instructionsAndKnowledgeSourcesFor', 'Instructions and knowledge sources for the RAG engine.')}
            />
          </CardContent>
        </Card>
      )}

      {/* Office Locations */}
      <CompanyOfficeManager
        companyId={company.id}
        canManage={isAdmin || isCompanyMember}
      />
    </div>
  );
};
