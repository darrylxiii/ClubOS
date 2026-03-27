import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Save } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface CompanyBrandingEditorProps {
  companyId: string;
  canEdit: boolean;
}

export const CompanyBrandingEditor = ({ companyId, canEdit }: CompanyBrandingEditorProps) => {
  const { t } = useTranslation('partner');
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, [companyId]);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setBranding(data || {
        primary_color: '#6366f1',
        secondary_color: '#8b5cf6',
        accent_color: '#ec4899',
        font_heading: 'Inter',
        font_body: 'Inter',
      });
    } catch (error) {
      console.error('Error fetching branding:', error);
      toast.error(t('companyBrandingEditor.toast.failedToLoadBrandingSettings'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_branding')
        .upsert({
          company_id: companyId,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color,
          font_heading: branding.font_heading,
          font_body: branding.font_body,
        }, {
          onConflict: 'company_id'
        });

      if (error) throw error;
      
      toast.success(t('companyBrandingEditor.toast.brandingUpdatedSuccessfully'));
    } catch (error) {
      console.error('Error updating branding:', error);
      toast.error(t('companyBrandingEditor.toast.failedToUpdateBranding'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black uppercase flex items-center gap-2">
              <Palette className="w-6 h-6" />
              Company Branding
            </CardTitle>
            <CardDescription>{t('companyBrandingEditor.description')}</CardDescription>
          </div>
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primary">{t('companyBrandingEditor.label.primaryColor')}</Label>
            <div className="flex gap-2">
              <Input
                id="primary"
                type="color"
                value={branding?.primary_color || '#6366f1'}
                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                disabled={!canEdit}
                className="h-12 w-20"
              />
              <Input
                type="text"
                value={branding?.primary_color || '#6366f1'}
                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                disabled={!canEdit}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary">{t('companyBrandingEditor.label.secondaryColor')}</Label>
            <div className="flex gap-2">
              <Input
                id="secondary"
                type="color"
                value={branding?.secondary_color || '#8b5cf6'}
                onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                disabled={!canEdit}
                className="h-12 w-20"
              />
              <Input
                type="text"
                value={branding?.secondary_color || '#8b5cf6'}
                onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                disabled={!canEdit}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accent">{t('companyBrandingEditor.label.accentColor')}</Label>
            <div className="flex gap-2">
              <Input
                id="accent"
                type="color"
                value={branding?.accent_color || '#ec4899'}
                onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                disabled={!canEdit}
                className="h-12 w-20"
              />
              <Input
                type="text"
                value={branding?.accent_color || '#ec4899'}
                onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                disabled={!canEdit}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="font_heading">{t('companyBrandingEditor.label.headingFont')}</Label>
            <Input
              id="font_heading"
              value={branding?.font_heading || 'Inter'}
              onChange={(e) => setBranding({ ...branding, font_heading: e.target.value })}
              disabled={!canEdit}
              placeholder={t('companyBrandingEditor.placeholder.interRobotoEtc')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="font_body">{t('companyBrandingEditor.label.bodyFont')}</Label>
            <Input
              id="font_body"
              value={branding?.font_body || 'Inter'}
              onChange={(e) => setBranding({ ...branding, font_body: e.target.value })}
              disabled={!canEdit}
              placeholder={t('companyBrandingEditor.placeholder.interRobotoEtc')}
            />
          </div>
        </div>

        <div className="p-6 border-2 border-dashed rounded-lg space-y-4">
          <h3 className="font-bold">{t('companyBrandingEditor.preview')}</h3>
          <div 
            className="p-4 rounded"
            style={{ 
              backgroundColor: branding?.primary_color,
              color: 'white',
              fontFamily: branding?.font_heading
            }}
          >
            <h4 className="text-xl font-bold">{t('companyBrandingEditor.headingExample')}</h4>
          </div>
          <div 
            className="p-4 rounded"
            style={{ 
              backgroundColor: branding?.secondary_color,
              color: 'white',
              fontFamily: branding?.font_body
            }}
          >
            <p>{t('companyBrandingEditor.bodyTextExampleWithYourSelectedFontAndCo')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
