import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from '@/lib/motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AssistedPasswordConfirmation } from '@/components/ui/assisted-password-confirmation';
import { UnifiedLoader } from '@/components/ui/unified-loader';
import { toast } from 'sonner';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';
import { validatePasswordStrength } from '@/utils/passwordReset';
import { logger } from '@/lib/logger';

/**
 * ChangePassword — Session-based forced password change page.
 * 
 * Used when an admin forces a password reset for non-partner users.
 * Unlike ResetPasswordNew (token-based), this page works with
 * an authenticated session and checks force_password_change metadata.
 */
const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (user && user.user_metadata?.force_password_change !== true) {
      navigate('/home');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate strength
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      const missing = strength.missing.map(m => {
        const labels: Record<string, string> = {
          minLength: '12+ characters',
          uppercase: 'uppercase letter',
          lowercase: 'lowercase letter',
          number: 'number',
          special: 'special character',
          noCommonPattern: 'avoid common patterns',
        };
        return labels[m] || m;
      });
      toast.error(`Password requires: ${missing.join(', ')}`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      // Update password
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;

      // Clear force_password_change flag
      const { error: metaError } = await supabase.auth.updateUser({
        data: { force_password_change: false },
      });
      if (metaError) {
        logger.error('[ChangePassword] Failed to clear force_password_change', metaError);
      }

      // Refresh session so ProtectedRoute sees updated metadata
      await supabase.auth.refreshSession();

      toast.success('Password updated successfully');
      navigate('/home');
    } catch (error) {
      logger.error('[ChangePassword] Password update failed', error instanceof Error ? error : new Error(String(error)));
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <UnifiedLoader variant="page" showBranding />;
  }

  if (!user || user.user_metadata?.force_password_change !== true) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-2 border-primary/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">
              Set New Password
            </CardTitle>
            <CardDescription>
              Your administrator has required you to change your password before continuing.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <AssistedPasswordConfirmation
                password={password}
                onPasswordChange={setPassword}
                confirmPassword={confirmPassword}
                onConfirmPasswordChange={setConfirmPassword}
                showPasswordInput
              />

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg font-semibold"
                disabled={isSubmitting || !password || !confirmPassword}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ChangePassword;
