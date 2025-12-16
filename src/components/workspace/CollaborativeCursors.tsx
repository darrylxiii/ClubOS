import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CursorPosition {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  color: string;
  x: number;
  y: number;
  blockId: string | null;
  isTyping: boolean;
  lastSeen: number;
}

interface CollaborativeCursorsProps {
  cursors: CursorPosition[];
  containerRef: React.RefObject<HTMLElement>;
}

export function CollaborativeCursors({ cursors, containerRef }: CollaborativeCursorsProps) {
  if (!containerRef.current) return null;

  const containerRect = containerRef.current.getBoundingClientRect();

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {cursors.map((cursor) => (
          <motion.div
            key={cursor.userId}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: cursor.x - containerRect.left,
              y: cursor.y - containerRect.top
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ 
              type: 'spring', 
              stiffness: 500, 
              damping: 30,
              mass: 0.5
            }}
            className="absolute"
            style={{ left: containerRect.left, top: containerRect.top }}
          >
            {/* Cursor pointer */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-md"
            >
              <path
                d="M5 3L19 12L12 13L9 20L5 3Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            
            {/* Name label */}
            <div
              className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-white shadow-lg whitespace-nowrap"
              style={{ backgroundColor: cursor.color }}
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={cursor.avatarUrl || undefined} />
                <AvatarFallback className="text-[8px]" style={{ backgroundColor: cursor.color }}>
                  {cursor.userName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{cursor.userName}</span>
              {cursor.isTyping && (
                <span className="flex gap-0.5 ml-1">
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
