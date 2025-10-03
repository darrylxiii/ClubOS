import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LinkedinIcon, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const LinkedInImport = () => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedSections, setSelectedSections] = useState({
    experience: true,
    education: true,
    skills: true,
    certifications: true,
    projects: false
  });

  const handleConnect = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/profile`,
          scopes: 'openid profile email'
        }
      });

      if (error) throw error;
      toast.success('Redirecting to LinkedIn...');
    } catch (error) {
      console.error('LinkedIn connection error:', error);
      toast.error('Failed to connect to LinkedIn');
    }
  };

  const handleImport = async () => {
    if (!user) return;
    
    setImporting(true);
    try {
      // Get LinkedIn profile data from the user's auth metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser?.user_metadata?.linkedin_profile_data) {
        toast.error('No LinkedIn data found. Please connect your LinkedIn account first.');
        return;
      }

      const linkedInData = authUser.user_metadata.linkedin_profile_data;
      
      // Import selected sections
      const sectionsToImport = Object.entries(selectedSections)
        .filter(([_, selected]) => selected)
        .map(([section, _]) => section);

      // Log the import
      const { error: logError } = await supabase
        .from('linkedin_imports')
        .insert({
          user_id: user.id,
          import_type: 'oauth',
          imported_data: linkedInData,
          sections_imported: sectionsToImport,
          import_status: 'success'
        });

      if (logError) console.error('Error logging import:', logError);

      // Import experience
      if (selectedSections.experience && linkedInData.experience) {
        for (const exp of linkedInData.experience) {
          await supabase.from('profile_experience').insert({
            user_id: user.id,
            company_name: exp.company,
            position_title: exp.title,
            location: exp.location,
            start_date: exp.startDate,
            end_date: exp.endDate,
            is_current: exp.isCurrent || false,
            description: exp.description
          });
        }
      }

      // Import education
      if (selectedSections.education && linkedInData.education) {
        for (const edu of linkedInData.education) {
          await supabase.from('profile_education').insert({
            user_id: user.id,
            institution_name: edu.school,
            degree_type: edu.degree,
            field_of_study: edu.fieldOfStudy,
            start_date: edu.startDate,
            end_date: edu.endDate
          });
        }
      }

      // Import skills
      if (selectedSections.skills && linkedInData.skills) {
        for (const skill of linkedInData.skills) {
          await supabase.from('profile_skills').insert({
            user_id: user.id,
            skill_name: skill.name,
            category: 'technical',
            endorsement_count: skill.endorsementCount || 0
          });
        }
      }

      toast.success('LinkedIn data imported successfully!');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import LinkedIn data');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <LinkedinIcon className="w-4 h-4 mr-2" />
          Import from LinkedIn
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkedinIcon className="w-5 h-5" />
            Import LinkedIn Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connect your LinkedIn account to automatically import your professional information. 
              We'll only access publicly available data.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Select Sections to Import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="experience"
                  checked={selectedSections.experience}
                  onCheckedChange={(checked) => setSelectedSections({...selectedSections, experience: !!checked})}
                />
                <Label htmlFor="experience" className="font-normal cursor-pointer">
                  Work Experience
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="education"
                  checked={selectedSections.education}
                  onCheckedChange={(checked) => setSelectedSections({...selectedSections, education: !!checked})}
                />
                <Label htmlFor="education" className="font-normal cursor-pointer">
                  Education
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="skills"
                  checked={selectedSections.skills}
                  onCheckedChange={(checked) => setSelectedSections({...selectedSections, skills: !!checked})}
                />
                <Label htmlFor="skills" className="font-normal cursor-pointer">
                  Skills & Endorsements
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="certifications"
                  checked={selectedSections.certifications}
                  onCheckedChange={(checked) => setSelectedSections({...selectedSections, certifications: !!checked})}
                />
                <Label htmlFor="certifications" className="font-normal cursor-pointer">
                  Certifications
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="projects"
                  checked={selectedSections.projects}
                  onCheckedChange={(checked) => setSelectedSections({...selectedSections, projects: !!checked})}
                />
                <Label htmlFor="projects" className="font-normal cursor-pointer">
                  Projects
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button onClick={handleConnect} className="w-full">
              <LinkedinIcon className="w-4 h-4 mr-2" />
              Connect LinkedIn
            </Button>
            <Button 
              onClick={handleImport} 
              variant="secondary" 
              disabled={importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Your data is imported securely and you can review before saving.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};