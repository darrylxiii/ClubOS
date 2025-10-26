import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { InteractiveCard } from "./InteractiveCard";
import { cn } from "@/lib/utils";

interface SkillMatrixProps {
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
}

export function SkillMatrix({ mustHaveSkills = [], niceToHaveSkills = [] }: SkillMatrixProps) {
  if (mustHaveSkills.length === 0 && niceToHaveSkills.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Must-Have Skills */}
      {mustHaveSkills.length > 0 && (
        <div>
          <motion.h3 
            className="text-2xl font-bold mb-6 flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="w-2 h-8 bg-gradient-to-b from-chart-2 to-chart-2/50 rounded-full" />
            Must-Have Skills
          </motion.h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mustHaveSkills.map((skill, index) => (
              <InteractiveCard
                key={skill}
                delay={index * 0.05}
                className="relative overflow-hidden group"
              >
                <div className="flex items-start gap-3">
                  <motion.div
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-chart-2/20 flex items-center justify-center"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Check className="w-5 h-5 text-chart-2" />
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground mb-1 group-hover:text-chart-2 transition-colors">
                      {skill}
                    </h4>
                    
                    {/* Proficiency meter */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-chart-2 to-chart-1"
                        initial={{ width: 0 }}
                        whileInView={{ width: "100%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Hover glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-chart-2/0 via-chart-2/5 to-chart-2/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  initial={false}
                />
              </InteractiveCard>
            ))}
          </div>
        </div>
      )}

      {/* Nice-to-Have Skills */}
      {niceToHaveSkills.length > 0 && (
        <div>
          <motion.h3 
            className="text-2xl font-bold mb-6 flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="w-2 h-8 bg-gradient-to-b from-accent to-accent/50 rounded-full" />
            Nice-to-Have Skills
            <span className="ml-2 px-3 py-1 text-xs font-medium bg-accent/20 text-accent rounded-full">
              Bonus Points
            </span>
          </motion.h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {niceToHaveSkills.map((skill, index) => (
              <InteractiveCard
                key={skill}
                delay={index * 0.05}
                className="relative overflow-hidden group"
              >
                <div className="flex items-start gap-3">
                  <motion.div
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Star className="w-5 h-5 text-accent" />
                  </motion.div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">
                      {skill}
                    </h4>
                    
                    {/* Proficiency meter */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-accent to-accent/70"
                        initial={{ width: 0 }}
                        whileInView={{ width: "75%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Hover glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  initial={false}
                />
              </InteractiveCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
