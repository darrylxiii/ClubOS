import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AssistedPasswordConfirmationProps {
  password: string;
  onConfirmPasswordChange: (value: string) => void;
  confirmPassword: string;
}

export function AssistedPasswordConfirmation({
  password,
  onConfirmPasswordChange,
  confirmPassword,
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
    <div className="space-y-2">
      <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
        Confirm Password
      </label>
      <div className="relative">
        <motion.div
          className="relative h-[52px] w-full rounded-lg border-2 bg-background/50 px-2 py-2 overflow-hidden"
          animate={{
            ...bounceAnimation,
            ...matchAnimation,
            ...borderAnimation,
          }}
        >
          {/* Background indicators for each character */}
          <div className="absolute bottom-0 left-2 top-0 z-0 flex h-full items-center justify-start pointer-events-none">
            {password.split('').map((letter, index) => (
              <motion.div
                key={index}
                className={`h-full w-[0.6rem] transition-all duration-300 ${getLetterStatus(
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
          
          {/* Input field */}
          <input
            id="confirmPassword"
            className="relative z-10 h-full w-full bg-transparent px-1.5 tracking-[0.4em] text-foreground outline-none placeholder:tracking-normal placeholder:text-muted-foreground font-medium"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
          />
        </motion.div>
      </div>
    </div>
  );
}
