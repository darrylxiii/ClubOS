import { memo } from 'react';
import { Badge } from '@/components/ui/badge';

interface Skill {
  skill_name: string;
  proficiency_level?: string;
  is_primary?: boolean;
}

interface SkillTagsDisplayProps {
  skills: Skill[];
  maxVisible?: number;
  onSkillClick?: (skillName: string) => void;
}

const proficiencyColors = {
  beginner: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20',
  intermediate: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20',
  advanced: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20',
};

export const SkillTagsDisplay = memo<SkillTagsDisplayProps>(({
  skills,
  maxVisible = 3,
  onSkillClick,
}) => {
  if (!skills || skills.length === 0) return null;

  const visibleSkills = skills.slice(0, maxVisible);
  const remainingCount = skills.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleSkills.map((skill, index) => {
        const colorClass = skill.proficiency_level
          ? proficiencyColors[skill.proficiency_level as keyof typeof proficiencyColors]
          : 'bg-accent text-accent-foreground hover:bg-accent/80';

        return (
          <Badge
            key={index}
            variant="secondary"
            className={`text-xs ${colorClass} ${onSkillClick ? 'cursor-pointer' : ''} ${
              skill.is_primary ? 'ring-1 ring-primary/50' : ''
            }`}
            onClick={() => onSkillClick?.(skill.skill_name)}
          >
            {skill.skill_name}
          </Badge>
        );
      })}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
});

SkillTagsDisplay.displayName = 'SkillTagsDisplay';
