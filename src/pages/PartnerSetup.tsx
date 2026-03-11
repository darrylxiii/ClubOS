import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from '@/lib/motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AssistedPasswordConfirmation } from '@/components/ui/assisted-password-confirmation';
import { UnifiedLoader } from '@/components/ui/unified-loader';
import { toast } from 'sonner';
import { Lock, Linkedin, Camera, ArrowRight, ArrowLeft, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { logger } from '@/lib/logger';
import { z } from 'zod';

import quantumLogoLight from '@/assets/quantum-logo-dark.png';
import quantumLogoDark from '@/assets/quantum-club-logo.png';

const passwordSchema = z.string().min(12).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);

type SetupStep = 'password' | 'profile' | 'complete';

const PartnerSetup = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<SetupStep>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchingAvatar, setFetchingAvatar] = useState(false);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      if (user.user_metadata?.force_password_change !== true) {
        navigate('/home');
        return;
      }
      setProfileName(user.user_metadata?.full_name || '');
      loadExistingAvatar();
    }
  }, [user, loading, navigate]);

  const loadExistingAvatar = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url, linkedin_url')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    if (profile?.linkedin_url) setLinkedinUrl(profile.linkedin_url);
  };

  const handleSetPassword = async () => {
    try {
      passwordSchema.parse(password);
    } catch {
      toast.error('Password must be at least 12 characters with uppercase, lowercase, number, and symbol.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Route through password-reset-set-password edge function for HIBP + history checks
      const { data, error } = await supabase.functions.invoke('password-reset-set-password', {
        body: { password }
      });

      if (error) throw error;
      if (data?.error) {
        // Handle specific error codes from the edge function
        if (data.code === 'weak_password' || data.code === 'pwned') {
          toast.error('This password has appeared in a data breach. Please choose a different one.');
        } else if (data.code === 'password_reused') {
          toast.error('You have used this password recently. Please choose a new one.');
        } else {
          toast.error(data.error || 'Failed to set password.');
        }
        return;
      }

      toast.success('Password set successfully.');
      setStep('profile');
    } catch (error) {
      logger.error('Password set error', error instanceof Error ? error : new Error(String(error)), { componentName: 'PartnerSetup' });
      toast.error(error instanceof Error ? error.message : 'Failed to set password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchLinkedInAvatar = async () => {
    if (!linkedinUrl.trim()) {
      toast.error('Please enter your LinkedIn URL first.');
      return;
    }
    if (!linkedinUrl.includes('linkedin.com/in/')) {
      toast.error('Please enter a valid LinkedIn profile URL.');
      return;
    }

    setFetchingAvatar(true);
    try {
      // Persist LinkedIn URL immediately so it survives a refresh
      if (user) {
        await supabase.from('profiles').update({ linkedin_url: linkedinUrl.trim() }).eq('id', user.id);
      }

      const { data, error } = await supabase.functions.invoke('fetch-linkedin-avatar', {
        body: { linkedinUrl: linkedinUrl.trim() }
      });
      if (error) throw error;
      if (data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
        toast.success('Profile photo imported from LinkedIn.');
      } else {
        toast.info('No profile photo found on LinkedIn. You can upload one manually.');
      }
    } catch (error) {
      logger.warn('LinkedIn avatar fetch failed', { componentName: 'PartnerSetup', error });
      toast.error('Could not fetch LinkedIn photo. You can upload one manually.');
    } finally {
      setFetchingAvatar(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setAvatarUrl(publicUrl);
      toast.success('Profile photo uploaded.');
    } catch (error) {
      toast.error('Failed to upload photo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // Step 1: Clear force_password_change FIRST — if this fails, don't mark onboarding complete
      const { error: metaError } = await supabase.auth.updateUser({
        data: { force_password_change: false }
      });
      if (metaError) throw metaError;

      // Step 2: Now safe to mark onboarding complete + save LinkedIn
      const updates: Record<string, unknown> = {
        onboarding_completed_at: new Date().toISOString(),
      };
      if (linkedinUrl.trim()) {
        updates.linkedin_url = linkedinUrl.trim();
      }
      await supabase.from('profiles').update(updates).eq('id', user.id);

      // Step 3: Audit log
      await supabase.from('comprehensive_audit_logs').insert({
        actor_id: user.id,
        actor_role: 'user',
        action_type: 'partner_setup_completed',
        action_category: 'account',
        resource_type: 'profile',
        description: 'Partner completed initial account setup (password + profile)',
        new_value: {
          has_avatar: !!avatarUrl,
          has_linkedin: !!linkedinUrl.trim(),
        },
        ip_address: 'client',
        user_agent: navigator.userAgent,
      });

      setStep('complete');
      setTimeout(() => navigate('/partner-welcome'), 2000);
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
      logger.error('Partner setup completion failed', error instanceof Error ? error : new Error(String(error)), { componentName: 'PartnerSetup' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <UnifiedLoader variant="page" showBranding />;
  if (!user) return null;

  const initials = profileName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="bg-card/95 border border-border/50 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6">
            <div className="flex justify-center mb-4">
              <img src={quantumLogoDark} alt="The Quantum Club" className="h-16 w-auto dark:hidden" />
              <img src={quantumLogoLight} alt="The Quantum Club" className="h-16 w-auto hidden dark:block" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 'password' && 'Secure Your Account'}
              {step === 'profile' && 'Complete Your Profile'}
              {step === 'complete' && 'All Set'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 'password' && `Welcome, ${profileName}. Set a password for future logins.`}
              {step === 'profile' && 'Add a profile photo and your LinkedIn to get started.'}
              {step === 'complete' && 'Your partner account is ready.'}
            </CardDescription>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {(['password', 'profile', 'complete'] as SetupStep[]).map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    step === s ? 'w-8 bg-primary' :
                    i < ['password', 'profile', 'complete'].indexOf(step) ? 'w-8 bg-primary/40' :
                    'w-4 bg-muted'
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-10">
            {step === 'password' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <Lock className="h-4 w-4" />
                    Set a strong password for email login
                  </div>
                </div>

                <AssistedPasswordConfirmation
                  password={password}
                  confirmPassword={confirmPassword}
                  onPasswordChange={setPassword}
                  onConfirmPasswordChange={setConfirmPassword}
                  showPasswordInput
                />

                <RainbowButton
                  onClick={handleSetPassword}
                  disabled={!password || !confirmPassword || isSubmitting}
                  className="w-full h-14 rounded-xl font-semibold"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting password…</>
                  ) : (
                    <>Continue <ArrowRight className="h-4 w-4 ml-2" /></>
                  )}
                </RainbowButton>
              </motion.div>
            )}

            {step === 'profile' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Avatar section */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-2 border-border">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Click the camera icon to upload</p>
                </div>

                {/* LinkedIn section */}
                <div className="space-y-3">
                  <Label htmlFor="linkedin-url" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                    LinkedIn Profile (optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="linkedin-url"
                      placeholder="https://linkedin.com/in/yourname"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="h-11 rounded-xl flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFetchLinkedInAvatar}
                      disabled={!linkedinUrl.trim() || fetchingAvatar}
                      className="h-11 px-3 rounded-xl"
                      title="Import photo from LinkedIn"
                    >
                      {fetchingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {fetchingAvatar ? (
                    <p className="text-xs text-primary font-medium animate-pulse">
                      Fetching your photo from LinkedIn — this may take a moment…
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      We can import your profile photo from LinkedIn automatically.
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setStep('password')}
                    className="h-12 px-4 rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCompleteSetup}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl"
                  >
                    Skip for now
                  </Button>
                  <RainbowButton
                    onClick={handleCompleteSetup}
                    disabled={isSubmitting}
                    className="flex-1 h-12 rounded-xl font-semibold"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Complete Setup <Sparkles className="h-4 w-4 ml-2" /></>
                    )}
                  </RainbowButton>
                </div>
              </motion.div>
            )}

            {step === 'complete' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <div className="p-4 rounded-full bg-primary/10">
                  <CheckCircle className="h-12 w-12 text-primary" />
                </div>
                <p className="text-lg font-semibold text-center">
                  Welcome to The Quantum Club, {profileName.split(' ')[0]}.
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Redirecting you to your partner portal…
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PartnerSetup;
