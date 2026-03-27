import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { useEffect, useState } from 'react';
import { validatePasswordStrength } from '@/utils/passwordReset';
import { Check, X } from 'lucide-react';

interface AssistedPasswordConfirmationProps {
  password: string;
  onConfirmPasswordChange: (value: string) => void;
  confirmPassword: string;
  onPasswordChange?: (value: string) => void;
  showPasswordInput?: boolean;
}

// Labels are resolved at render time via useTranslation in the component below
const REQUIREMENT_KEYS: Record<string, { key: string; fallback: string }> = {
  minLength: { key: 'password.twelveChars', fallback: '12+ characters' },
  uppercase: { key: 'password.uppercaseLetter', fallback: 'Uppercase letter' },
  lowercase: { key: 'password.lowercaseLetter', fallback: 'Lowercase letter' },
  number: { key: 'password.number', fallback: 'Number' },
  special: { key: 'password.specialChar', fallback: 'Special character' },
  noCommonPattern: { key: 'password.noCommonPatterns', fallback: 'No common patterns' },
};

export function AssistedPasswordConfirmation({
  password,
  onConfirmPasswordChange,
  confirmPassword,
  onPasswordChange,
  showPasswordInput = false,
}: AssistedPasswordConfirmationProps) {
  const { t } = useTranslation('common');
  const [shake, setShake] = useState(false);

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (
      confirmPassword.length >= password.length &&
      e.target.value.length > confirmPassword.length
    ) {
      setShake(true);
    } else {
      onConfirmPasswordChange(e.target.value);
    }
  };

  useEffect(() => {
    if (shake) {
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  const getLetterStatus = (letter: string, index: number) => {
    if (!confirmPassword[index]) return '';
    return confirmPassword[index] === letter
      ? 'bg-green-500/20'
      : 'bg-red-500/20';
  };

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const strength = validatePasswordStrength(password);

  const bounceAnimation = {
    x: shake ? [-10, 10, -10, 10, 0] : 0,
    transition: { duration: 0.5 },
  };

  const matchAnimation = {
    scale: passwordsMatch ? [1, 1.05, 1] : 1,
    transition: { duration: 0.3 },
  };

  const borderAnimation = {
    borderColor: passwordsMatch ? 'hsl(var(--primary))' : 'hsl(var(--border))',
    transition: { duration: 0.3 },
  };

  const strengthColor = strength.strength === 'strong'
    ? 'bg-green-500'
    : strength.strength === 'medium'
      ? 'bg-yellow-500'
      : 'bg-red-500';

  const strengthWidth = strength.strength === 'strong'
    ? 'w-full'
    : strength.strength === 'medium'
      ? 'w-2/3'
      : 'w-1/3';

  return (
    <div className="space-y-3">
      {/* Box 1: Enhanced Password Input */}
      <motion.div
        className="relative h-14 w-full rounded-2xl border-2 bg-background overflow-hidden"
        animate={{
          ...bounceAnimation,
          borderColor: showPasswordInput ? 'hsl(var(--border))' : (passwordsMatch && confirmPassword ? 'hsl(var(--primary))' : 'hsl(var(--border))'),
          transition: { duration: 0.3 },
        }}
      >
        {!showPasswordInput && password && confirmPassword && (
          <div className="absolute inset-0 px-3.5 flex items-center pointer-events-none z-0">
            {password.split('').map((letter, index) => (
              <motion.div
                key={index}
                className={`h-full w-4 transition-all duration-300 ${getLetterStatus(letter, index)}`}
                style={{
                  scaleX: confirmPassword[index] ? 1 : 0,
                  transformOrigin: 'left',
                }}
              />
            ))}
          </div>
        )}

        <input
          id="password-input"
          type="password"
          placeholder={t("password", "Password")}
          aria-label={t("password", "Password")}
          value={password}
          onChange={(e) => onPasswordChange?.(e.target.value)}
          required
          className="relative z-10 h-full w-full bg-transparent px-3.5 py-3 tracking-[0.4em] text-foreground outline-none placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 font-semibold text-base"
        />
      </motion.div>

      {/* Strength indicator */}
      {password.length > 0 && (
        <div className="space-y-2">
          {/* Strength bar */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${strengthColor}`}
                initial={{ width: 0 }}
                animate={{ width: strengthWidth === 'w-full' ? '100%' : strengthWidth === 'w-2/3' ? '66%' : '33%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-muted-foreground capitalize">{t(`password.${strength.strength}`, strength.strength)}</span>
          </div>

          {/* Requirements checklist */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {Object.entries(strength.requirements).map(([key, met]) => (
              <div key={key} className="flex items-center gap-1.5">
                {met ? (
                  <Check className="h-3 w-3 text-green-500 shrink-0" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                )}
                <span className={`text-xs ${met ? 'text-green-500' : 'text-muted-foreground/70'}`}>
                  {REQUIREMENT_KEYS[key] ? t(REQUIREMENT_KEYS[key].key, REQUIREMENT_KEYS[key].fallback) : key}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Box 2: Confirmation Input */}
      <motion.div
        className="h-14 w-full overflow-hidden rounded-2xl"
        animate={matchAnimation}
      >
        <motion.input
          id="confirm-password-input"
          className="h-full w-full rounded-2xl border-2 bg-background px-3.5 py-3 tracking-[0.4em] text-foreground outline-none placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 font-semibold text-base transition-all"
          type="password"
          placeholder={t("confirm_password", "Confirm Password")}
          aria-label={t("confirm_password", "Confirm password")}
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          animate={borderAnimation}
        />
      </motion.div>
    </div>
  );
}
