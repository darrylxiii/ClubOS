import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { DJControlState } from '@/hooks/useWebMIDI';

/**
 * Visual overlay showing the DJ's real-time hardware controls.
 * Listeners see faders, EQ, crossfader, and filter positions
 * animated in real-time via MIDI → Supabase broadcast.
 */

// ── Vertical Fader ─────────────────────────────────────────────────────────────

function Fader({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-3 h-16 bg-white/5 rounded-full relative overflow-hidden border border-white/10">
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{ backgroundColor: color }}
          animate={{ height: `${value * 100}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
        {/* Fader knob */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-5 h-2 rounded-sm bg-white/80 shadow-md"
          animate={{ bottom: `calc(${value * 100}% - 4px)` }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
      </div>
      <span className="text-[8px] text-white/40 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── EQ Knob (visual-only) ──────────────────────────────────────────────────────

function Knob({ value, label, color }: { value: number; label: string; color: string }) {
  // Map 0-1 to rotation: -135° to +135°
  const rotation = -135 + value * 270;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-8 h-8">
        {/* Track */}
        <svg className="w-full h-full" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <motion.circle
            cx="16" cy="16" r="12"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={`${value * 75.4} 75.4`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(-90 16 16)"
            animate={{ strokeDasharray: `${value * 75.4} 75.4` }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        </svg>
        {/* Indicator */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="w-0.5 h-3 rounded-full bg-white/80" style={{ marginBottom: '8px' }} />
        </motion.div>
      </div>
      <span className="text-[8px] text-white/40 uppercase">{label}</span>
    </div>
  );
}

// ── Crossfader ─────────────────────────────────────────────────────────────────

function Crossfader({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-32 h-3 bg-white/5 rounded-full relative border border-white/10">
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-4 rounded-sm bg-white/80 shadow-md"
          animate={{ left: `calc(${value * 100}% - 12px)` }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />
        {/* A/B labels */}
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[7px] text-white/30 font-bold">A</span>
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[7px] text-white/30 font-bold">B</span>
      </div>
      <span className="text-[8px] text-white/40 uppercase tracking-wider">Crossfader</span>
    </div>
  );
}

// ── Main Overlay ───────────────────────────────────────────────────────────────

interface DJControlsOverlayProps {
  controls: DJControlState;
  className?: string;
}

export const DJControlsOverlay = memo(function DJControlsOverlay({ controls, className = '' }: DJControlsOverlayProps) {
  const { t } = useTranslation('common');
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-4 ${className}`}
    >
      <div className="flex items-center justify-center gap-1 mb-3">
        <div className={`h-1.5 w-1.5 rounded-full ${controls.isPlayingA ? 'bg-blue-400' : 'bg-white/20'}`} />
        <span className="text-[9px] text-white/40 uppercase tracking-widest font-medium">{t('djControls.liveDJControls', 'Live DJ Controls')}</span>
        <div className={`h-1.5 w-1.5 rounded-full ${controls.isPlayingB ? 'bg-orange-400' : 'bg-white/20'}`} />
      </div>

      <div className="flex items-end justify-center gap-4">
        {/* Deck A */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] font-bold text-blue-400/70">{t('djControls.deckA', 'DECK A')}</span>
          <div className="flex items-end gap-2">
            <Knob value={controls.eqHighA} label="Hi" color="rgba(96,165,250,0.7)" />
            <Knob value={controls.eqMidA} label="Mid" color="rgba(96,165,250,0.5)" />
            <Knob value={controls.eqLowA} label="Lo" color="rgba(96,165,250,0.3)" />
          </div>
          <div className="flex items-end gap-2">
            <Fader value={controls.volumeA} label="Vol" color="rgba(96,165,250,0.6)" />
            <Fader value={controls.filterA} label="Flt" color="rgba(96,165,250,0.4)" />
          </div>
        </div>

        {/* Center: Crossfader */}
        <div className="flex flex-col items-center gap-3 pb-1">
          <Crossfader value={controls.crossfader} />
        </div>

        {/* Deck B */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[9px] font-bold text-orange-400/70">{t('djControls.deckB', 'DECK B')}</span>
          <div className="flex items-end gap-2">
            <Knob value={controls.eqHighB} label="Hi" color="rgba(251,146,60,0.7)" />
            <Knob value={controls.eqMidB} label="Mid" color="rgba(251,146,60,0.5)" />
            <Knob value={controls.eqLowB} label="Lo" color="rgba(251,146,60,0.3)" />
          </div>
          <div className="flex items-end gap-2">
            <Fader value={controls.volumeB} label="Vol" color="rgba(251,146,60,0.6)" />
            <Fader value={controls.filterB} label="Flt" color="rgba(251,146,60,0.4)" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});
