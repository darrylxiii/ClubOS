import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AboutRoleSectionProps {
  description?: string;
}

const estimateReadTime = (text: string) => {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

export function AboutRoleSection({ description }: AboutRoleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!description) return null;

  const readTime = estimateReadTime(description);
  const shouldTruncate = description.length > 500;
  const displayText = shouldTruncate && !isExpanded 
    ? description.substring(0, 500) + "..."
    : description;

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <span className="w-2 h-8 bg-gradient-to-b from-primary to-accent rounded-full" />
          About the Role
        </h3>
        
        {/* Read time badge */}
        <motion.div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50"
          whileHover={{ scale: 1.05 }}
        >
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            {readTime} min read
          </span>
        </motion.div>
      </motion.div>

      {/* Description with editorial styling */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <AnimatePresence mode="wait">
            <motion.p
              key={isExpanded ? "expanded" : "collapsed"}
              className="text-foreground/90 leading-relaxed text-lg font-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {displayText.split('\n').map((paragraph, index) => (
                <span key={index}>
                  {paragraph}
                  {index < displayText.split('\n').length - 1 && <><br /><br /></>}
                </span>
              ))}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Reading progress indicator (decorative) */}
        {isExpanded && (
          <motion.div
            className="absolute left-0 top-0 w-1 bg-gradient-to-b from-primary via-accent to-chart-2 rounded-full"
            initial={{ height: 0 }}
            animate={{ height: "100%" }}
            transition={{ duration: 0.5 }}
          />
        )}
      </motion.div>

      {/* Read More/Less button */}
      {shouldTruncate && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="group gap-2 text-accent hover:text-accent"
          >
            {isExpanded ? "Read Less" : "Read More"}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
