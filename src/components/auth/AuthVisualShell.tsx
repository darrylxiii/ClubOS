import { cn } from '@/lib/utils';
import { MigrationBanner } from '@/components/auth/MigrationBanner';
import { ShaderAnimation } from '@/components/auth/ShaderAnimation';

interface AuthVisualShellProps {
  children: React.ReactNode;
  /** Applied to the inner wrapper above the shader (flex layout for children). */
  innerClassName?: string;
}

/**
 * Shared full-screen auth aesthetic: migration banner, WebGL shader backdrop, flex slot for content.
 */
export function AuthVisualShell({ children, innerClassName }: AuthVisualShellProps) {
  return (
    <div className="min-h-screen relative flex flex-col">
      <MigrationBanner />
      <ShaderAnimation />
      <div className={cn('relative z-10 flex flex-1 flex-col', innerClassName)}>{children}</div>
    </div>
  );
}
