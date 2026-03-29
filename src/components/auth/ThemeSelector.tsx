import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from '@/lib/motion';
import { SHADER_THEMES, type ShaderTheme } from './shaderThemes';
import { cn } from '@/lib/utils';

interface ThemeSelectorProps {
  activeThemeId: string;
  onSelect: (id: string) => void;
}

/**
 * Floating pill widget for choosing the auth-page shader backdrop.
 * Positioned bottom-left, opposite the language selector in bottom-right.
 */
export function ThemeSelector({ activeThemeId, onSelect }: ThemeSelectorProps) {
  const { t } = useTranslation('auth');
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const activeTheme = SHADER_THEMES.find(t => t.id === activeThemeId) || SHADER_THEMES[0];

  return (
    <div ref={panelRef} className="fixed bottom-5 left-5 z-50">
      {/* Toggle button */}
      <button
        id="theme-selector-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('themeSelector.label', 'Change background theme')}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2.5 rounded-full px-3.5 py-2.5',
          'bg-white/[0.08] backdrop-blur-xl border border-white/[0.12]',
          'text-white/70 text-[13px] font-medium tracking-wide',
          'hover:bg-white/[0.14] hover:text-white/90',
          'transition-all duration-300',
          'shadow-lg shadow-black/20',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
          open && 'bg-white/[0.14] text-white/90'
        )}
      >
        <div className={cn("h-3.5 w-3.5 rounded-full bg-gradient-to-tr shadow-inner shrink-0", activeTheme.colorGradient)} />
        <span className="hidden sm:inline">{t('themeSelector.label', 'Theme')}</span>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'absolute bottom-full left-0 mb-3',
              'w-64 rounded-2xl overflow-hidden',
              'bg-black/90 backdrop-blur-3xl',
              'border border-white/[0.1]',
              'shadow-2xl shadow-black/50',
              'p-2'
            )}
            role="listbox"
            aria-label={t('themeSelector.listLabel', 'Background themes')}
          >
            {SHADER_THEMES.map((theme: ShaderTheme) => {
              const isActive = theme.id === activeThemeId;
              return (
                <button
                  key={theme.id}
                  id={`theme-option-${theme.id}`}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onSelect(theme.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-between w-full rounded-xl px-4 py-3',
                    'text-left transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-inset',
                    isActive
                      ? 'bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'hover:bg-white/[0.04]'
                  )}
                >
                  <div className="flex flex-col gap-0.5 pr-4">
                    <span className={cn('text-[13px] font-medium tracking-wide', isActive ? 'text-white' : 'text-white/60')}>
                      {t(theme.labelKey, theme.labelKey.split('.').pop())}
                    </span>
                    <span className="text-[10px] text-white/40 tracking-wider uppercase font-semibold">
                      {t(theme.subtitleKey, theme.subtitleKey.split('.').pop())}
                    </span>
                  </div>
                  
                  <div className="shrink-0 flex items-center justify-center">
                    {isActive ? (
                      <motion.div
                        layoutId="theme-active-orb"
                        className={cn("h-3 w-3 rounded-full bg-gradient-to-tr shadow-[0_0_12px_rgba(255,255,255,0.3)]", theme.colorGradient)}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-white/20 transition-colors duration-300 hover:border-white/40" />
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
