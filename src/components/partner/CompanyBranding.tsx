import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Palette } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface CompanyBrandingProps {
  companyId: string;
}

export const CompanyBranding = ({ companyId }: CompanyBrandingProps) => {
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
        company_id: companyId,
        primary_color: '#6366f1',
        secondary_color: '#8b5cf6',
        accent_color: '#ec4899',
        font_heading: 'Inter',
        font_body: 'Inter',
      });
    } catch (error) {
      console.error('Error fetching branding:', error);
      toast.error(t('companyBranding.toast.failedToLoadBranding'));
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
          ...branding,
          company_id: companyId,
        });

      if (error) throw error;
      
      toast.success(t('companyBranding.toast.brandingUpdatedSuccessfully'));
    } catch (error) {
      console.error('Error updating branding:', error);
      toast.error(t('companyBranding.toast.failedToUpdateBranding'));
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
            <CardDescription>{t('companyBranding.description')}</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-bold mb-4">{t('companyBranding.brandColors')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="primary_color">{t('companyBranding.label.primaryColor')}</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={branding?.primary_color || '#6366f1'}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={branding?.primary_color || '#6366f1'}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">{t('companyBranding.label.secondaryColor')}</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={branding?.secondary_color || '#8b5cf6'}
                  onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={branding?.secondary_color || '#8b5cf6'}
                  onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent_color">{t('companyBranding.label.accentColor')}</Label>
              <div className="flex gap-2">
                <Input
                  id="accent_color"
                  type="color"
                  value={branding?.accent_color || '#ec4899'}
                  onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={branding?.accent_color || '#ec4899'}
                  onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">{t('companyBranding.typography')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="font_heading">{t('companyBranding.label.headingFont')}</Label>
              <Input
                id="font_heading"
                value={branding?.font_heading || 'Inter'}
                onChange={(e) => setBranding({ ...branding, font_heading: e.target.value })}
                placeholder="e.g. Inter, Roboto," Poppins
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="font_body">{t('companyBranding.label.bodyFont')}</Label>
              <Input
                id="font_body"
                value={branding?.font_body || 'Inter'}
                onChange={(e) => setBranding({ ...branding, font_body: e.target.value })}
                placeholder="e.g. Inter, Roboto," Open Sans
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">{t('companyBranding.logosAssets')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="logo_light_url">{t('companyBranding.label.lightLogoUrl')}</Label>
              <Input
                id="logo_light_url"
                type="url"
                value={branding?.logo_light_url || ''}
                onChange={(e) => setBranding({ ...branding, logo_light_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_dark_url">{t('companyBranding.label.darkLogoUrl')}</Label>
              <Input
                id="logo_dark_url"
                type="url"
                value={branding?.logo_dark_url || ''}
                onChange={(e) => setBranding({ ...branding, logo_dark_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon_url">{t('companyBranding.label.faviconUrl')}</Label>
              <Input
                id="favicon_url"
                type="url"
                value={branding?.favicon_url || ''}
                onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="social_preview_image">{t('companyBranding.label.socialPreviewImage')}</Label>
              <Input
                id="social_preview_image"
                type="url"
                value={branding?.social_preview_image || ''}
                onChange={(e) => setBranding({ ...branding, social_preview_image: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-secondary rounded-lg">
          <h3 className="text-lg font-bold mb-4">{t('companyBranding.brandPreview')}</h3>
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded"
              style={{ backgroundColor: branding?.primary_color }}
            />
            <div 
              className="w-16 h-16 rounded"
              style={{ backgroundColor: branding?.secondary_color }}
            />
            <div 
              className="w-16 h-16 rounded"
              style={{ backgroundColor: branding?.accent_color }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};