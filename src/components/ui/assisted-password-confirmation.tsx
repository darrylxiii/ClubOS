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
    <div className="relative flex w-full flex-col items-start justify-center space-y-2">
      <span className="text-sm font-semibold text-white/80">→ Confirm Password</span>
      <motion.div
        className="h-[52px] w-full rounded-2xl border-2 bg-white/90 px-2 py-2"
        animate={{
          ...bounceAnimation,
          ...matchAnimation,
          ...borderAnimation,
        }}
      >
        <div className="relative h-full w-fit overflow-hidden rounded-lg">
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
              ></motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="h-[52px] w-full overflow-hidden rounded-2xl"
        animate={matchAnimation}
      >
        <motion.input
          className="h-full w-full rounded-2xl border-2 bg-white/90 px-3.5 py-3 tracking-[0.4em] text-gray-900 outline-none placeholder:tracking-normal placeholder:text-gray-500 focus:border-primary font-semibold text-base"
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
