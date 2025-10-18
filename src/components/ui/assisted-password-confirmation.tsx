import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Input } from './input';

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
        className="relative h-14 w-full rounded-2xl border-2 bg-white/90 overflow-hidden"
        animate={{
          ...bounceAnimation,
          borderColor: showPasswordInput ? 'hsl(var(--border))' : (passwordsMatch && confirmPassword ? 'hsl(var(--primary))' : 'hsl(var(--border))'),
          transition: { duration: 0.3 },
        }}
      >
        {/* Visual feedback layer - dots and colored backgrounds */}
        {!showPasswordInput && password && (
          <div className="absolute inset-0 px-2 py-2 pointer-events-none">
            <div className="relative h-full w-fit overflow-hidden rounded-lg">
              {/* Dots display */}
              <div className="z-10 flex h-full items-center justify-center bg-transparent px-0 py-1 tracking-[0.15em]">
                {password.split('').map((_, index) => (
                  <div
                    key={index}
                    className="flex h-full w-4 shrink-0 items-center justify-center"
                  >
                    <span className="size-[5px] rounded-full bg-gray-900"></span>
                  </div>
                ))}
              </div>
              
              {/* Colored background indicators */}
              <div className="absolute bottom-0 left-0 top-0 z-0 flex h-full w-full items-center justify-start">
                {password.split('').map((letter, index) => (
                  <motion.div
                    key={index}
                    className={`ease absolute h-full w-4 transition-all duration-300 ${getLetterStatus(
                      letter,
                      index,
                    )}`}
                    style={{
                      left: `${index * 16}px`,
                      scaleX: confirmPassword[index] ? 1 : 0,
                      transformOrigin: 'left',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Actual password input - ALWAYS present and editable */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => onPasswordChange?.(e.target.value)}
          required
          className="relative z-10 h-full w-full bg-transparent px-3.5 py-3 tracking-[0.4em] text-gray-900 outline-none placeholder:tracking-normal placeholder:text-gray-500 focus:border-primary/50 focus:ring-primary/20 font-semibold text-base"
        />
      </motion.div>

      {/* Box 2: Confirmation Input */}
      <motion.div
        className="h-14 w-full overflow-hidden rounded-2xl"
        animate={matchAnimation}
      >
        <motion.input
          className="h-full w-full rounded-2xl border-2 bg-white/90 px-3.5 py-3 tracking-[0.4em] text-gray-900 outline-none placeholder:tracking-normal placeholder:text-gray-500 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 font-semibold text-base transition-all"
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
