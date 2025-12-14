import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { secureStorage } from '@/services/secureStorage';
import { Fingerprint, ScanFace, Eye, Lock, KeyRound, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BiometricLockScreenProps {
  onUnlock: () => void;
  onFallbackLogin: () => void;
  userName?: string;
}

export function BiometricLockScreen({ onUnlock, onFallbackLogin, userName }: BiometricLockScreenProps) {
  const { isAvailable, biometryType, biometryName, authenticate } = useBiometricAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPinFallback, setShowPinFallback] = useState(false);
  const [pin, setPin] = useState('');

  // Get the appropriate icon for biometry type
  const BiometryIcon = biometryType === 'face' ? ScanFace : biometryType === 'fingerprint' ? Fingerprint : Eye;

  // Auto-prompt for biometric auth on mount
  useEffect(() => {
    if (isAvailable && !showPinFallback) {
      handleBiometricAuth();
    }
  }, [isAvailable]);

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);
    setError(null);

    const result = await authenticate('Unlock The Quantum Club');

    if (result.success) {
      await secureStorage.updateLastAuthTime();
      onUnlock();
    } else {
      setError(result.errorMessage || 'Authentication failed');
      setIsAuthenticating(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, verify PIN against stored hash
    if (pin.length >= 4) {
      await secureStorage.updateLastAuthTime();
      onUnlock();
    } else {
      setError('Invalid PIN');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        
        {/* Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', damping: 20 }}
          className="relative z-10 flex flex-col items-center gap-8 px-8"
        >
          {/* App Logo/Branding */}
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl">
              <Lock className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">The Quantum Club</h1>
            {userName && (
              <p className="text-muted-foreground">Welcome back, {userName}</p>
            )}
          </div>

          {/* Lock Animation */}
          {!showPinFallback && (
            <motion.div
              animate={isAuthenticating ? {
                scale: [1, 1.1, 1],
                opacity: [1, 0.5, 1],
              } : {}}
              transition={{ duration: 1.5, repeat: isAuthenticating ? Infinity : 0 }}
              className="relative"
            >
              <div className={cn(
                "h-32 w-32 rounded-full flex items-center justify-center",
                "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl",
                "border-2 border-primary/30 shadow-2xl",
                isAuthenticating && "border-primary animate-pulse"
              )}>
                <BiometryIcon className={cn(
                  "h-16 w-16 text-primary transition-all duration-300",
                  isAuthenticating && "scale-110"
                )} />
              </div>
              
              {/* Glow effect when authenticating */}
              {isAuthenticating && (
                <motion.div
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-primary/30"
                />
              )}
            </motion.div>
          )}

          {/* Biometric Prompt */}
          {!showPinFallback && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-foreground font-medium">
                {isAuthenticating ? `Using ${biometryName}...` : `Unlock with ${biometryName}`}
              </p>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-destructive text-sm"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={handleBiometricAuth}
                  disabled={isAuthenticating}
                  className="gap-2"
                >
                  <BiometryIcon className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowPinFallback(true)}
                >
                  Use PIN
                </Button>
              </div>
            </div>
          )}

          {/* PIN Fallback */}
          {showPinFallback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6 w-full max-w-xs"
            >
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <KeyRound className="h-8 w-8 text-muted-foreground" />
              </div>
              
              <p className="text-foreground font-medium">Enter your PIN</p>
              
              <form onSubmit={handlePinSubmit} className="w-full space-y-4">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
                
                {error && (
                  <p className="text-destructive text-sm text-center">{error}</p>
                )}
                
                <Button type="submit" className="w-full" disabled={pin.length < 4}>
                  Unlock
                </Button>
              </form>
              
              <div className="flex gap-4 mt-2">
                {isAvailable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPinFallback(false);
                      setError(null);
                    }}
                    className="gap-2"
                  >
                    <BiometryIcon className="h-4 w-4" />
                    Use {biometryName}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFallbackLogin}
                >
                  Sign in with password
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
