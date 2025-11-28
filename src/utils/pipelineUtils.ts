import { FileText, Video, Users, CheckCircle2, ClipboardCheck, UserCheck, Briefcase } from "lucide-react";

/**
 * Get appropriate icon for a pipeline stage based on name
 */
export const getStageIcon = (stageName: string) => {
  const lowerName = stageName.toLowerCase();
  
  if (lowerName.includes('applied') || lowerName.includes('review') || lowerName.includes('application')) {
    return FileText;
  }
  if (lowerName.includes('screen') || lowerName.includes('phone') || lowerName.includes('call')) {
    return Video;
  }
  if (lowerName.includes('interview') || lowerName.includes('assessment') || lowerName.includes('technical')) {
    return Users;
  }
  if (lowerName.includes('final') || lowerName.includes('panel')) {
    return Users;
  }
  if (lowerName.includes('offer') || lowerName.includes('proposal')) {
    return CheckCircle2;
  }
  if (lowerName.includes('hired') || lowerName.includes('onboard')) {
    return UserCheck;
  }
  if (lowerName.includes('assignment') || lowerName.includes('task')) {
    return ClipboardCheck;
  }
  
  // Default icon
  return Briefcase;
};

/**
 * Get default tip for a pipeline stage
 */
export const getDefaultStageTip = (stageName: string): string => {
  const lowerName = stageName.toLowerCase();
  
  if (lowerName.includes('applied') || lowerName.includes('review')) {
    return 'Your application is being reviewed by the hiring team';
  }
  if (lowerName.includes('screen') || lowerName.includes('phone')) {
    return 'Prepare to discuss your background, motivations, and key qualifications';
  }
  if (lowerName.includes('technical') || lowerName.includes('assessment')) {
    return 'Review job requirements and prepare examples of your technical work';
  }
  if (lowerName.includes('interview')) {
    return 'Be ready to discuss your experience and how you approach problem-solving';
  }
  if (lowerName.includes('final') || lowerName.includes('panel')) {
    return 'Meet the team and discuss culture fit, expectations, and your questions';
  }
  if (lowerName.includes('offer')) {
    return 'Review the compensation package carefully and negotiate if needed';
  }
  if (lowerName.includes('hired') || lowerName.includes('onboard')) {
    return 'Congratulations! Prepare for your first day and onboarding';
  }
  
  return 'Stay prepared and responsive during this stage';
};

/**
 * Convert job pipeline stages to application stages format
 */
export const convertToApplicationStages = (
  pipelineStages: any[],
  currentIndex: number = 0
) => {
  if (!pipelineStages || pipelineStages.length === 0) {
    // Fallback to default stages
    return [
      {
        id: 'stage-0',
        name: 'Applied',
        order: 0,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      }
    ];
  }

  return pipelineStages.map((stage: any, index: number) => ({
    id: stage.id || `stage-${index}`,
    name: stage.name,
    title: stage.name, // For backwards compatibility
    order: stage.order ?? index,
    status: index < currentIndex ? 'completed' : index === currentIndex ? 'in_progress' : 'pending',
    started_at: index === currentIndex ? new Date().toISOString() : null,
    completed_at: index < currentIndex ? null : null,
    description: stage.description,
    duration_minutes: stage.duration_minutes,
    format: stage.format,
    owner: stage.owner,
    resources: stage.resources,
    location: stage.location,
    meeting_link: stage.meeting_link,
    preparation: stage.resources ? {
      title: 'Preparation Guide',
      content: stage.description || '',
      resources: stage.resources
    } : undefined,
  }));
};

/**
 * Format stage duration for display
 */
export const formatStageDuration = (stage: any): string => {
  if (stage.duration_minutes) {
    const hours = Math.floor(stage.duration_minutes / 60);
    const minutes = stage.duration_minutes % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} min`;
    }
  }
  
  if (stage.duration) {
    return stage.duration;
  }
  
  return 'TBD';
};

/**
 * Get default pipeline stages as fallback
 */
export const getDefaultPipelineStages = () => [
  { name: 'Applied', order: 0, description: 'Application submitted' },
  { name: 'Screening', order: 1, description: 'Initial screening call', duration_minutes: 30 },
  { name: 'Interview', order: 2, description: 'Technical interview', duration_minutes: 60 },
  { name: 'Final Round', order: 3, description: 'Final interview with team', duration_minutes: 60 },
  { name: 'Offer', order: 4, description: 'Offer extended' },
];
