import { motion, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star } from "lucide-react";

interface CandidateData {
  ai_summary?: string;
  skills?: (string | { name: string })[];
  languages?: (string | { language: string; proficiency: string })[];
  work_history?: { title?: string; position?: string; company?: string; location?: string; start_date?: string; end_date?: string; description?: string }[];
  education?: { institution?: string; school?: string; degree?: string; field_of_study?: string; start_year?: string; end_year?: string }[];
  certifications?: (string | { name?: string; issuer?: string; issue_date?: string })[];
}

interface CandidateConsumerViewProps {
  candidate: CandidateData;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring" as const, 
      stiffness: 100, 
      damping: 15 
    } 
  }
};

export function CandidateConsumerView({ candidate }: CandidateConsumerViewProps) {
  const { t } = useTranslation('candidates');

  const calculateDuration = (startDate?: string, endDate?: string): string | null => {
    if (!startDate) return null;
    try {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (months < 0) return null;
      const years = Math.floor(months / 12);
      months = months % 12;
      const parts: string[] = [];
      if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
      if (months > 0) parts.push(`${months} mo${months > 1 ? 's' : ''}`);
      return parts.length > 0 ? parts.join(' ') : 'Less than a month';
    } catch {
      return null;
    }
  };

  return (
    <motion.div 
      className="container mx-auto px-4 py-12 max-w-4xl space-y-16"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Bio / AI Summary */}
      {candidate.ai_summary && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-heading-xl font-display tracking-tight text-foreground/90">{t("about_me", "About Me")}</h2>
          <div className="p-8 rounded-2xl bg-card/40 backdrop-blur-xl border border-white/10 shadow-glass-md">
            <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {candidate.ai_summary}
            </p>
          </div>
        </motion.div>
      )}

      {/* Skills Grid */}
      {((candidate.skills && candidate.skills.length > 0) || (candidate.languages && candidate.languages.length > 0)) && (
        <motion.div variants={itemVariants} className="space-y-6">
          <h2 className="text-heading-xl font-display tracking-tight text-foreground/90">{t("core_capabilities", "Core Capabilities")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="p-6 rounded-2xl bg-card/40 backdrop-blur-md border border-white/10 shadow-glass-sm flex flex-col gap-4">
                <h3 className="font-semibold text-lg">{t("technical_expertise", "Technical Expertise")}</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill: string | { name: string }, index: number) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 transition-colors">
                      {typeof skill === 'string' ? skill : skill.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {candidate.languages && candidate.languages.length > 0 && (
              <div className="p-6 rounded-2xl bg-card/40 backdrop-blur-md border border-white/10 shadow-glass-sm flex flex-col gap-4">
                <h3 className="font-semibold text-lg">{t("languages", "Languages")}</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.languages.map((lang: string | { language: string; proficiency: string }, index: number) => (
                    <Badge key={index} variant="outline" className="px-3 py-1.5 text-sm border-primary/20">
                      {typeof lang === 'string' ? lang : `${lang.language} - ${lang.proficiency}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Experience Timeline */}
      {candidate.work_history && candidate.work_history.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-8">
          <h2 className="text-heading-xl font-display tracking-tight text-foreground/90">{t("professional_experience", "Professional Experience")}</h2>
          <div className="space-y-6">
            {candidate.work_history.map((job: { title?: string; position?: string; company?: string; location?: string; start_date?: string; end_date?: string; description?: string }, index: number) => {
              const duration = calculateDuration(job.start_date, job.end_date);
              const companyInitial = (job.company || '?')[0].toUpperCase();
              
              return (
                <motion.div 
                  key={index}
                  whileHover={{ y: -4 }}
                  className="group relative p-6 sm:p-8 rounded-3xl bg-card/30 backdrop-blur-xl border border-white/5 shadow-glass-sm hover:shadow-glass-md transition-all duration-300 flex flex-col sm:flex-row gap-6"
                >
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl font-display text-primary shadow-glow">
                      {companyInitial}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div>
                        <h4 className="text-xl font-bold tracking-tight text-foreground/95">{job.title || job.position}</h4>
                        <p className="text-lg text-primary/80 font-medium">{job.company}</p>
                        {job.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-start sm:items-end gap-1">
                        <Badge variant="outline" className="text-xs bg-background/50 backdrop-blur-md">
                          {job.start_date || '?'} – {job.end_date || 'Present'}
                        </Badge>
                        {duration && (
                          <span className="text-xs font-medium text-muted-foreground/80">{duration}</span>
                        )}
                      </div>
                    </div>
                    {job.description && (
                      <p className="text-base text-muted-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {job.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Education & Certifications */}
      {((candidate.education && candidate.education.length > 0) || (candidate.certifications && candidate.certifications.length > 0)) && (
        <motion.div variants={itemVariants} className="space-y-8">
          <h2 className="text-heading-xl font-display tracking-tight text-foreground/90">{t("education_accolades", "Education & Accolades")}</h2>
          <div className="grid grid-cols-1 gap-6">
            
            {candidate.education && candidate.education.length > 0 && candidate.education.map((edu: { institution?: string; school?: string; degree?: string; field_of_study?: string; start_year?: string; end_year?: string }, index: number) => {
              const schoolInitial = (edu.institution || edu.school || '?')[0].toUpperCase();
              const degreeLine = [edu.degree, edu.field_of_study].filter(Boolean).join(' in ');
              return (
                <div key={index} className="flex gap-4 p-6 rounded-2xl bg-card/20 border border-white/5">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {schoolInitial}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold">{degreeLine || 'Degree'}</h4>
                    <p className="text-primary/80">{edu.institution || edu.school}</p>
                    {(edu.start_year || edu.end_year) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {edu.start_year || '?'} – {edu.end_year || 'Present'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {candidate.certifications && candidate.certifications.length > 0 && (
              <div className="mt-8 flex flex-col gap-4">
                <h3 className="font-semibold text-lg text-muted-foreground">{t("certifications", "Certifications")}</h3>
                <div className="flex flex-wrap gap-4">
                  {candidate.certifications.map((cert: string | { name?: string; issuer?: string; issue_date?: string }, index: number) => (
                    <div key={index} className="flex items-center gap-3 px-5 py-3 rounded-xl bg-primary/5 border border-primary/10">
                      <Star className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{cert.name || cert}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cert.issuer && <span>{cert.issuer}</span>}
                          {cert.issue_date && <span> · {cert.issue_date}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
