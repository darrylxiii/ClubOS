import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AssistedPasswordConfirmationProps {
  password: string;
  onConfirmPasswordChange: (value: string) => void;
  confirmPassword: string;
  onPasswordChange?: (value: string) => void;
  showPasswordInput?: boolean;
}

export function AssistedPasswordConfirmation({
  password,
  onConfirmPasswordChange,
  confirmPassword,
  onPasswordChange,
  showPasswordInput = false,
}: AssistedPasswordConfirmationProps) {
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

  return (
    <div className="space-y-3">
      {/* Box 1: Enhanced Password Input - ALWAYS shown, ALWAYS editable */}
      <motion.div
        className="relative h-14 w-full rounded-2xl border-2 bg-background overflow-hidden"
        animate={{
          ...bounceAnimation,
          borderColor: showPasswordInput ? 'hsl(var(--border))' : (passwordsMatch && confirmPassword ? 'hsl(var(--primary))' : 'hsl(var(--border))'),
          transition: { duration: 0.3 },
        }}
      >
        {/* Visual feedback layer - ONLY colored backgrounds, NO dots */}
        {!showPasswordInput && password && confirmPassword && (
          <div className="absolute inset-0 px-3.5 flex items-center pointer-events-none z-0">
            {password.split('').map((letter, index) => (
              <motion.div
                key={index}
                className={`h-full w-4 transition-all duration-300 ${getLetterStatus(
                  letter,
                  index,
                )}`}
                style={{
                  scaleX: confirmPassword[index] ? 1 : 0,
                  transformOrigin: 'left',
                }}
              />
            ))}
          </div>
        )}
        
        {/* Actual password input - shows native password dots */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => onPasswordChange?.(e.target.value)}
          required
          className="relative z-10 h-full w-full bg-transparent px-3.5 py-3 tracking-[0.4em] text-foreground outline-none placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 font-semibold text-base"
        />
      </motion.div>

      {/* Box 2: Confirmation Input */}
      <motion.div
        className="h-14 w-full overflow-hidden rounded-2xl"
        animate={matchAnimation}
      >
        <motion.input
          className="h-full w-full rounded-2xl border-2 bg-background px-3.5 py-3 tracking-[0.4em] text-foreground outline-none placeholder:tracking-normal placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 font-semibold text-base transition-all"
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          animate={borderAnimation}
        />
      </motion.div>
    </div>
  );
}
