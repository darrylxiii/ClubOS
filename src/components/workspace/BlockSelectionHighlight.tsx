import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlockSelection {
  userId: string;
  userName: string;
  color: string;
  blockId: string;
}

interface BlockSelectionHighlightProps {
  selections: BlockSelection[];
}

export function BlockSelectionHighlight({ selections }: BlockSelectionHighlightProps) {
  const [blockElements, setBlockElements] = useState<Map<string, DOMRect>>(new Map());

  useEffect(() => {
    // Find block elements and their positions
    const updateBlockPositions = () => {
      const newPositions = new Map<string, DOMRect>();
      
      selections.forEach(selection => {
        const element = document.querySelector(`[data-block-id="${selection.blockId}"]`);
        if (element) {
          newPositions.set(selection.blockId, element.getBoundingClientRect());
        }
      });
      
      setBlockElements(newPositions);
    };

    updateBlockPositions();
    
    // Update positions on scroll/resize
    window.addEventListener('scroll', updateBlockPositions);
    window.addEventListener('resize', updateBlockPositions);
    
    return () => {
      window.removeEventListener('scroll', updateBlockPositions);
      window.removeEventListener('resize', updateBlockPositions);
    };
  }, [selections]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <AnimatePresence>
        {selections.map(selection => {
          const rect = blockElements.get(selection.blockId);
          if (!rect) return null;

          return (
            <motion.div
              key={`${selection.userId}-${selection.blockId}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute rounded-md"
              style={{
                left: rect.left - 4,
                top: rect.top - 2,
                width: rect.width + 8,
                height: rect.height + 4,
                backgroundColor: `${selection.color}15`,
                border: `2px solid ${selection.color}`,
                boxShadow: `0 0 0 1px ${selection.color}20`
              }}
            >
              {/* User label */}
              <div
                className="absolute -top-5 left-0 px-2 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap"
                style={{ backgroundColor: selection.color }}
              >
                {selection.userName}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
