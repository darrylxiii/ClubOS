import type { Transition, Variants } from "framer-motion";

interface AuthMotionPreset {
  panel: Variants;
  header: Variants;
  content: Variants;
  footer: Variants;
  aura: Variants;
  panelTransition: Transition;
}

const premiumPanelTransition: Transition = {
  type: "spring",
  stiffness: 240,
  damping: 28,
  mass: 0.85,
};

const reducedPanelTransition: Transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};

export function getAuthMotionPreset(reduced: boolean): AuthMotionPreset {
  if (reduced) {
    return {
      panelTransition: reducedPanelTransition,
      panel: {
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 4 },
      },
      header: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.16 } },
        exit: { opacity: 0 },
      },
      content: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.16 } },
        exit: { opacity: 0 },
      },
      footer: {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.16 } },
        exit: { opacity: 0 },
      },
      aura: {
        hidden: { opacity: 0 },
        visible: { opacity: 0.3, transition: { duration: 0.2 } },
        exit: { opacity: 0, transition: { duration: 0.12 } },
      },
    };
  }

  return {
    panelTransition: premiumPanelTransition,
    panel: {
      hidden: {
        opacity: 0,
        y: 26,
        scale: 0.965,
        rotateX: 4,
        filter: "blur(10px)",
      },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        filter: "blur(0px)",
      },
      exit: {
        opacity: 0,
        y: 16,
        scale: 0.985,
        filter: "blur(6px)",
        transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
      },
    },
    header: {
      hidden: { opacity: 0, y: 14 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { delay: 0.12, duration: 0.34, ease: [0.22, 1, 0.36, 1] },
      },
      exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
    },
    content: {
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { delay: 0.18, duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      },
      exit: { opacity: 0, y: 6, transition: { duration: 0.1 } },
    },
    footer: {
      hidden: { opacity: 0, y: 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { delay: 0.24, duration: 0.24, ease: [0.22, 1, 0.36, 1] },
      },
      exit: { opacity: 0, y: 6, transition: { duration: 0.1 } },
    },
    aura: {
      hidden: { opacity: 0, scale: 0.96 },
      visible: {
        opacity: 0.7,
        scale: 1,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
      },
      exit: {
        opacity: 0,
        scale: 0.98,
        transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
      },
    },
  };
}
