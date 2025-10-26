import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagCloudProps {
  tags?: string[];
}

const getTagSize = (index: number, total: number) => {
  // Weighted sizing - first tags are more important
  if (index < 3) return "lg";
  if (index < 6) return "default";
  return "sm";
};

const getTagColor = (tag: string) => {
  const lower = tag.toLowerCase();
  
  // Programming languages
  if (['javascript', 'typescript', 'python', 'java', 'rust', 'go'].some(lang => lower.includes(lang))) {
    return { bg: 'bg-blue-500/10 hover:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' };
  }
  
  // Frameworks
  if (['react', 'vue', 'angular', 'next', 'svelte', 'django', 'flask'].some(fw => lower.includes(fw))) {
    return { bg: 'bg-purple-500/10 hover:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' };
  }
  
  // Tools & Platforms
  if (['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git'].some(tool => lower.includes(tool))) {
    return { bg: 'bg-green-500/10 hover:bg-green-500/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/30' };
  }
  
  // Soft skills
  if (['leadership', 'communication', 'teamwork', 'agile', 'scrum'].some(skill => lower.includes(skill))) {
    return { bg: 'bg-accent/10 hover:bg-accent/20', text: 'text-accent', border: 'border-accent/30' };
  }
  
  // Default
  return { bg: 'bg-muted hover:bg-muted/80', text: 'text-foreground', border: 'border-border' };
};

export function TagCloud({ tags = [] }: TagCloudProps) {
  if (tags.length === 0) return null;

  return (
    <div className="space-y-6">
      <motion.h3 
        className="text-2xl font-bold flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <span className="w-2 h-8 bg-gradient-to-b from-accent to-primary rounded-full" />
        Skills & Technologies
      </motion.h3>

      <motion.div
        className="flex flex-wrap gap-3"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {tags.map((tag, index) => {
          const size = getTagSize(index, tags.length);
          const colors = getTagColor(tag);
          
          return (
            <motion.div
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ 
                delay: index * 0.03,
                type: "spring",
                stiffness: 200
              }}
              whileHover={{ 
                scale: 1.1,
                rotate: Math.random() * 10 - 5,
              }}
            >
              <Badge
                variant="outline"
                className={cn(
                  "cursor-default transition-all duration-300 border",
                  colors.bg,
                  colors.text,
                  colors.border,
                  size === "lg" && "text-base px-4 py-2 font-semibold",
                  size === "default" && "text-sm px-3 py-1.5",
                  size === "sm" && "text-xs px-2 py-1"
                )}
              >
                {tag}
              </Badge>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Category legend (optional) */}
      <motion.div
        className="flex flex-wrap gap-4 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500/30" />
          <span>Languages</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-500/30" />
          <span>Frameworks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500/30" />
          <span>Tools</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-accent/30" />
          <span>Soft Skills</span>
        </div>
      </motion.div>
    </div>
  );
}
