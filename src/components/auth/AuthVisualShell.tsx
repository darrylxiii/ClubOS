import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MigrationBanner } from '@/components/auth/MigrationBanner';
import { ShaderAnimation } from '@/components/auth/ShaderAnimation';
import { ThemeSelector } from '@/components/auth/ThemeSelector';
import { getPersistedThemeId, persistThemeId } from '@/components/auth/shaderThemes';

interface AuthVisualShellProps {
  children: React.ReactNode;
  /** Applied to the inner wrapper above the shader (flex layout for children). */
  innerClassName?: string;
}

/**
 * Shared full-screen auth aesthetic: migration banner, WebGL shader backdrop,
 * theme selector, and flex slot for content.
 */
export function AuthVisualShell({ children, innerClassName }: AuthVisualShellProps) {
  const [themeId, setThemeId] = useState(getPersistedThemeId);

  const handleThemeSelect = useCallback((id: string) => {
    setThemeId(id);
    persistThemeId(id);
  }, []);

  return (
    <div className="min-h-screen relative flex flex-col">
      <MigrationBanner />
      <ShaderAnimation themeId={themeId} />
      <div className={cn('relative z-10 flex flex-1 flex-col', innerClassName)}>{children}</div>
      <ThemeSelector activeThemeId={themeId} onSelect={handleThemeSelect} />
    </div>
  );
}
