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
  const shouldTruncate = description.length > 800;
  const displayText = shouldTruncate && !isExpanded 
    ? description.substring(0, 800) + "..."
    : description;

  return (
    <motion.div
      className="glass-card p-6 rounded-xl border-2 border-border/50 hover:border-primary transition-all space-y-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <span className="w-2 h-8 bg-gradient-to-b from-primary to-accent rounded-full" />
          About the Role
        </h3>
        
        {/* Read time badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            {readTime} min read
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-foreground/90 leading-relaxed">
          {displayText.split('\n').map((paragraph, index) => (
            <span key={index}>
              {paragraph}
              {index < displayText.split('\n').length - 1 && <><br /><br /></>}
            </span>
          ))}
        </p>
      </div>

      {/* Read More/Less button */}
      {shouldTruncate && (
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2 text-accent hover:text-accent"
        >
          {isExpanded ? "Read Less" : "Read More"}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </Button>
      )}
    </motion.div>
  );
}
