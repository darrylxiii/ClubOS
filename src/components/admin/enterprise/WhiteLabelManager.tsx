import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Palette, Globe, Image, Code, Building2, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CompanyBranding {
  id: string;
  company_id: string;
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  custom_css: string | null;
  custom_domain: string | null;
  email_footer: string | null;
  is_whitelabel_enabled: boolean;
}

export const WhiteLabelManager = () => {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [editedBranding, setEditedBranding] = useState<Partial<CompanyBranding>>({});

  const { data: companies } = useQuery({
    queryKey: ['companies-for-whitelabel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: branding, isLoading } = useQuery({
    queryKey: ['company-branding', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return null;
      const { data, error } = await (supabase as any)
        .from('company_branding')
        .select('*, companies(name)')
        .eq('company_id', selectedCompanyId)
        .maybeSingle();
      if (error) throw error;
      return data as CompanyBranding | null;
    },
    enabled: !!selectedCompanyId
  });

  const saveBrandingMutation = useMutation({
    mutationFn: async (data: Partial<CompanyBranding>) => {
      const payload = {
        company_id: selectedCompanyId,
        ...data,
        updated_at: new Date().toISOString()
      };
      
      if (branding?.id) {
        const { error } = await (supabase as any)
          .from('company_branding')
          .update(payload)
          .eq('id', branding.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('company_branding')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branding', selectedCompanyId] });
      toast.success(t('enterprise.whiteLabelManager.brandingSettingsSaved'));
    },
    onError: () => toast.error(t('enterprise.whiteLabelManager.failedToSaveBranding'))
  });

  const currentBranding = { ...branding, ...editedBranding };

  const handleSave = () => {
    saveBrandingMutation.mutate(editedBranding);
  };

  const updateField = (field: keyof CompanyBranding, value: any) => {
    setEditedBranding(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('enterprise.whiteLabelManager.whiteLabelConfiguration')}</h2>
          <p className="text-muted-foreground">{t('enterprise.whiteLabelManager.customizeBrandingForEnterpriseTenants')}</p>
        </div>
      </div>

      {/* Company Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder={t('enterprise.whiteLabelManager.chooseACompanyToConfigure')} />
            </SelectTrigger>
            <SelectContent>
              {companies?.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCompanyId && (
        <>
          {/* Enable/Disable Toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t('enterprise.whiteLabelManager.whiteLabelMode')}</p>
                  <p className="text-sm text-muted-foreground">{t('enterprise.whiteLabelManager.enableCustomBrandingForThisCompany')}</p>
                </div>
                <Switch
                  checked={currentBranding?.is_whitelabel_enabled || false}
                  onCheckedChange={(checked) => updateField('is_whitelabel_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="colors" className="space-y-4">
            <TabsList>
              <TabsTrigger value="colors" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Assets
              </TabsTrigger>
              <TabsTrigger value="domain" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Domain
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors">
              <Card>
                <CardHeader>
                  <CardTitle>{t('enterprise.whiteLabelManager.brandColors')}</CardTitle>
                  <CardDescription>{t('enterprise.whiteLabelManager.defineTheColorPaletteForThis')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>{t('enterprise.whiteLabelManager.primaryColor')}</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={currentBranding?.primary_color || '#C9A24E'}
                          onChange={(e) => updateField('primary_color', e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={currentBranding?.primary_color || '#C9A24E'}
                          onChange={(e) => updateField('primary_color', e.target.value)}
                          placeholder="#C9A24E"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{t('enterprise.whiteLabelManager.secondaryColor')}</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={currentBranding?.secondary_color || '#0E0E10'}
                          onChange={(e) => updateField('secondary_color', e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={currentBranding?.secondary_color || '#0E0E10'}
                          onChange={(e) => updateField('secondary_color', e.target.value)}
                          placeholder="#0E0E10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>{t('enterprise.whiteLabelManager.accentColor')}</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={currentBranding?.accent_color || '#F5F4EF'}
                          onChange={(e) => updateField('accent_color', e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={currentBranding?.accent_color || '#F5F4EF'}
                          onChange={(e) => updateField('accent_color', e.target.value)}
                          placeholder="#F5F4EF"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Preview */}
                  <div className="mt-6 p-6 rounded-lg border" style={{ backgroundColor: currentBranding?.secondary_color || '#0E0E10' }}>
                    <div className="flex items-center gap-4">
                      <div 
                        className="px-4 py-2 rounded font-medium"
                        style={{ backgroundColor: currentBranding?.primary_color || '#C9A24E', color: '#000' }}
                      >
                        Primary Button
                      </div>
                      <span style={{ color: currentBranding?.accent_color || '#F5F4EF' }}>{t('enterprise.whiteLabelManager.previewText')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assets">
              <Card>
                <CardHeader>
                  <CardTitle>{t('enterprise.whiteLabelManager.brandAssets')}</CardTitle>
                  <CardDescription>{t('enterprise.whiteLabelManager.uploadLogosAndFavicons')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t('enterprise.whiteLabelManager.logoUrl')}</Label>
                    <Input
                      value={currentBranding?.logo_url || ''}
                      onChange={(e) => updateField('logo_url', e.target.value)}
                      placeholder="https://example.com/logo.svg"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Recommended: SVG or PNG, 200x60px</p>
                  </div>
                  <div>
                    <Label>{t('enterprise.whiteLabelManager.faviconUrl')}</Label>
                    <Input
                      value={currentBranding?.favicon_url || ''}
                      onChange={(e) => updateField('favicon_url', e.target.value)}
                      placeholder="https://example.com/favicon.ico"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Recommended: ICO or PNG, 32x32px</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="domain">
              <Card>
                <CardHeader>
                  <CardTitle>{t('enterprise.whiteLabelManager.customDomain')}</CardTitle>
                  <CardDescription>{t('enterprise.whiteLabelManager.configureACustomDomainForThis')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t('enterprise.whiteLabelManager.customDomain')}</Label>
                    <Input
                      value={currentBranding?.custom_domain || ''}
                      onChange={(e) => updateField('custom_domain', e.target.value)}
                      placeholder="talent.yourcompany.com"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Point a CNAME record to app.thequantumclub.com
                    </p>
                  </div>
                  {currentBranding?.custom_domain && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">{t('enterprise.whiteLabelManager.dnsConfiguration')}</p>
                      <code className="text-xs bg-background p-2 rounded block">
                        {currentBranding.custom_domain} CNAME app.thequantumclub.com
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced">
              <Card>
                <CardHeader>
                  <CardTitle>{t('enterprise.whiteLabelManager.advancedCustomization')}</CardTitle>
                  <CardDescription>{t('enterprise.whiteLabelManager.customCssAndEmailTemplates')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t('enterprise.whiteLabelManager.customCss')}</Label>
                    <Textarea
                      value={currentBranding?.custom_css || ''}
                      onChange={(e) => updateField('custom_css', e.target.value)}
                      placeholder="/* Add custom CSS overrides here */"
                      className="mt-1 font-mono text-sm"
                      rows={6}
                    />
                  </div>
                  <div>
                    <Label>{t('enterprise.whiteLabelManager.emailFooter')}</Label>
                    <Textarea
                      value={currentBranding?.email_footer || ''}
                      onChange={(e) => updateField('email_footer', e.target.value)}
                      placeholder={t('enterprise.whiteLabelManager.customEmailFooterText')}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditedBranding({})}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Changes
            </Button>
            <Button onClick={handleSave} disabled={saveBrandingMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
