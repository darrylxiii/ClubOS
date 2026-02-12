import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

const FULL_CIRCLE = 360;
const START_ANGLE = -90;

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function polarToCartesian(radius: number, angleDeg: number) {
  const rad = degToRad(angleDeg);
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

function slicePath(
  index: number,
  total: number,
  wedgeRadius: number,
  innerRadius: number
) {
  if (total <= 0) return "";
  if (total === 1) {
    return `
      M ${wedgeRadius} 0 A ${wedgeRadius} ${wedgeRadius} 0 1 1 ${-wedgeRadius} 0
      A ${wedgeRadius} ${wedgeRadius} 0 1 1 ${wedgeRadius} 0
      M ${innerRadius} 0 A ${innerRadius} ${innerRadius} 0 1 0 ${-innerRadius} 0
      A ${innerRadius} ${innerRadius} 0 1 0 ${innerRadius} 0
    `;
  }
  const anglePerSlice = FULL_CIRCLE / total;
  const midDeg = START_ANGLE + anglePerSlice * index;
  const halfSlice = anglePerSlice / 2;
  const startDeg = midDeg - halfSlice;
  const endDeg = midDeg + halfSlice;
  const outerStart = polarToCartesian(wedgeRadius, startDeg);
  const outerEnd = polarToCartesian(wedgeRadius, endDeg);
  const innerStart = polarToCartesian(innerRadius, startDeg);
  const innerEnd = polarToCartesian(innerRadius, endDeg);
  const largeArc = anglePerSlice > 180 ? 1 : 0;

  return `
    M ${outerStart.x} ${outerStart.y}
    A ${wedgeRadius} ${wedgeRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}
    L ${innerEnd.x} ${innerEnd.y}
    A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}
    Z
  `;
}

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
}

interface RadialMenuProps {
  items: RadialMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  size?: number;
  iconSize?: number;
  bandWidth?: number;
  innerGap?: number;
  outerGap?: number;
  outerRingWidth?: number;
}

const menuTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 1,
};

export const RadialMenu = ({
  items,
  position,
  onClose,
  size = 240,
  iconSize = 18,
  bandWidth = 50,
  innerGap = 8,
  outerGap = 8,
  outerRingWidth = 12,
}: RadialMenuProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const radius = size / 2;
  const outerRingOuterRadius = radius;
  const outerRingInnerRadius = outerRingOuterRadius - outerRingWidth;
  const wedgeOuterRadius = outerRingInnerRadius - outerGap;
  const wedgeInnerRadius = wedgeOuterRadius - bandWidth;
  const iconRingRadius = (wedgeOuterRadius + wedgeInnerRadius) / 2;
  const centerRadius = Math.max(wedgeInnerRadius - innerGap, 0);
  const slice = 360 / items.length;
  const ICON_BOX = iconSize * 2;

  const handleSelect = useCallback(
    (item: RadialMenuItem) => {
      onClose();
      // Small delay so the menu animates out before action fires
      setTimeout(() => item.action(), 150);
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = activeIndex === null ? 0 : (activeIndex + 1) % items.length;
        setActiveIndex(next);
        itemRefs.current[next]?.focus();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev =
          activeIndex === null
            ? items.length - 1
            : (activeIndex - 1 + items.length) % items.length;
        setActiveIndex(prev);
        itemRefs.current[prev]?.focus();
      }
      if (e.key === "Enter" && activeIndex !== null) {
        handleSelect(items[activeIndex]);
      }
    },
    [activeIndex, items, handleSelect, onClose]
  );

  // Clamp position so menu doesn't overflow viewport
  const clampedX = Math.min(
    Math.max(position.x, radius + 8),
    window.innerWidth - radius - 8
  );
  const clampedY = Math.min(
    Math.max(position.y, radius + 8),
    window.innerHeight - radius - 8
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[9998]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Menu */}
      <motion.div
        className="fixed z-[9999] outline-none"
        style={{
          left: clampedX,
          top: clampedY,
          transform: "translate(-50%, -50%)",
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={menuTransition}
        onKeyDown={handleKeyDown}
        role="menu"
        aria-label="Quick actions"
        tabIndex={-1}
      >
        <svg
          width={size}
          height={size}
          viewBox={`${-radius} ${-radius} ${size} ${size}`}
          className="drop-shadow-2xl"
        >
          {/* Outer ring */}
          <circle
            r={outerRingOuterRadius}
            fill="none"
            stroke="hsl(var(--border) / 0.15)"
            strokeWidth={outerRingWidth}
            className="opacity-60"
          />

          {/* Wedges */}
          {items.map((item, index) => {
            const isActive = activeIndex === index;
            return (
              <g key={item.id}>
                <path
                  d={slicePath(index, items.length, wedgeOuterRadius, wedgeInnerRadius)}
                  className={cn(
                    "transition-colors duration-100 cursor-pointer",
                    isActive
                      ? "fill-[hsl(var(--accent)_/_0.25)]"
                      : "fill-[hsl(var(--card)_/_0.85)]"
                  )}
                  stroke="hsl(var(--border) / 0.2)"
                  strokeWidth={0.5}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => {
                    setActiveIndex(index);
                    itemRefs.current[index]?.focus();
                  }}
                  onMouseLeave={() => setActiveIndex(null)}
                />
              </g>
            );
          })}

          {/* Icons */}
          {items.map((item, index) => {
            const Icon = item.icon;
            const midDeg = START_ANGLE + slice * index;
            const { x: iconX, y: iconY } = polarToCartesian(iconRingRadius, midDeg);
            const isActive = activeIndex === index;

            return (
              <foreignObject
                key={`icon-${item.id}`}
                x={iconX - ICON_BOX / 2}
                y={iconY - ICON_BOX / 2}
                width={ICON_BOX}
                height={ICON_BOX}
                className="pointer-events-none"
              >
                <button
                  ref={(el) => { itemRefs.current[index] = el; }}
                  onFocus={() => setActiveIndex(index)}
                  onClick={() => handleSelect(item)}
                  aria-label={item.label}
                  role="menuitem"
                  className={cn(
                    "size-full flex items-center justify-center rounded-full outline-none pointer-events-auto",
                    "text-muted-foreground transition-colors duration-100",
                    isActive && "text-foreground"
                  )}
                >
                  <Icon size={iconSize} />
                </button>
              </foreignObject>
            );
          })}

          {/* Center circle with label */}
          <circle
            r={centerRadius}
            className="fill-[hsl(var(--card)_/_0.95)]"
            stroke="hsl(var(--border) / 0.15)"
            strokeWidth={0.5}
          />
          {activeIndex !== null && items[activeIndex] && (
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground text-[11px] font-medium select-none"
            >
              {items[activeIndex].label}
            </text>
          )}
        </svg>

        {/* Glass backdrop filter overlay */}
        <div
          className="absolute inset-0 rounded-full -z-10"
          style={{
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            width: size,
            height: size,
          }}
        />
      </motion.div>
    </>
  );
};
