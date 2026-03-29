import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LinkedinIcon, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const LinkedInImport = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const handleImport = async () => {
    if (!user || !linkedinUrl) {
      toast.error("Please enter a LinkedIn profile URL");
      return;
    }
    
    setImporting(true);
    try {
      // Call the Proxycurl scraper edge function
      const { data, error } = await supabase.functions.invoke('linkedin-scraper-proxycurl', {
        body: { linkedinUrl }
      });

      if (error) throw error;
      
      if (!data || data.error) {
        toast.error(data?.error || 'Failed to scrape LinkedIn profile');
        return;
      }

      const profileData = data;

      // Update candidate profile with scraped data
      const updates: any = {
        linkedin_url: linkedinUrl,
        last_profile_update: new Date().toISOString()
      };

      if (profileData.fullName) updates.full_name = profileData.fullName;
      if (profileData.headline) updates.current_title = profileData.headline;
      if (profileData.location) updates.desired_locations = [profileData.location];
      if (profileData.summary) updates.ai_summary = profileData.summary;
      if (profileData.yearsExperience) updates.years_of_experience = profileData.yearsExperience;
      if (profileData.skills?.length) updates.skills = profileData.skills;

      // Update candidate_profiles table
      const { error: updateError } = await supabase
        .from('candidate_profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Import work experience
      if (profileData.experience?.length) {
        for (const exp of profileData.experience) {
          await supabase.from('profile_experience').insert({
            user_id: user.id,
            company_name: exp.company,
            position_title: exp.title,
            start_date: exp.startDate,
            end_date: exp.endDate,
            is_current: !exp.endDate,
            description: exp.description
          });
        }
      }

      // Import education
      if (profileData.education?.length) {
        for (const edu of profileData.education) {
          await supabase.from('profile_education').insert({
            user_id: user.id,
            institution_name: edu.school,
            degree_type: edu.degree,
            field_of_study: edu.field,
            start_date: edu.startDate,
            end_date: edu.endDate
          });
        }
      }

      // Log the import
      await supabase.from('linkedin_imports').insert({
        user_id: user.id,
        import_type: 'proxycurl',
        imported_data: profileData,
        import_status: 'success'
      });

      toast.success("LinkedIn profile imported successfully!");
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Import error:', error);
      toast.error("Failed to import LinkedIn data");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <LinkedinIcon className="w-4 h-4 mr-2" />
          {t('profileSection.importFromLinkedIn')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedinIcon className="w-5 h-5" />
            {t('profileSection.importLinkedInProfile')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('profileSection.linkedInImportDesc')}{' '}
              {t('profileSection.linkedInPrivacyNotice', 'Data imported from LinkedIn is processed per our')}{' '}
              <Link to="/legal/privacy" className="text-primary hover:underline">{t('privacy_policy', 'Privacy Policy')}</Link>.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="linkedin-url">{t('profileSection.linkedInProfileUrl')}</Label>
            <Input
              id="linkedin-url"
              type="url"
              placeholder="https://www.linkedin.com/in/yourprofile"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              disabled={importing}
            />
          </div>

          <Button 
            onClick={handleImport} 
            disabled={importing || !linkedinUrl}
            className="w-full"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('profileSection.importingFromLinkedIn')}
              </>
            ) : (
              <>
                <LinkedinIcon className="w-4 h-4 mr-2" />
                {t('profileSection.importProfile')}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {t('profileSection.importWillInclude')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};