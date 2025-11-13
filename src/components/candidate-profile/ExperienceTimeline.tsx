import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, GraduationCap, Award } from "lucide-react";
import { motion } from "framer-motion";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";
import { useState } from "react";

interface Experience {
  id: string;
  title: string;
  company: string;
  location?: string;
  start_date: string;
  end_date?: string;
  current: boolean;
  description?: string;
  skills?: string[];
}

interface Props {
  experiences: Experience[];
  education: any[];
  certifications: any[];
}

export const ExperienceTimeline = ({ experiences, education, certifications }: Props) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const calculateDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) return `${remainingMonths} mo`;
    if (remainingMonths === 0) return `${years} yr`;
    return `${years} yr ${remainingMonths} mo`;
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Work Experience */}
      {experiences && experiences.length > 0 && (
        <Card className={candidateProfileTokens.glass.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Work Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-6 before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-border">
              {experiences.map((exp, idx) => (
                <motion.div
                  key={exp.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative pl-8"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                  
                  <div
                    className={`${candidateProfileTokens.glass.strong} rounded-xl p-4 cursor-pointer transition-all hover:shadow-md`}
                    onClick={() => toggleExpand(exp.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{exp.title}</h4>
                        <p className="text-muted-foreground">{exp.company}</p>
                      </div>
                      {exp.current && (
                        <Badge className={candidateProfileTokens.badges.success}>
                          Current
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                      <span>{formatDate(exp.start_date)} - {exp.current ? 'Present' : formatDate(exp.end_date!)}</span>
                      <span>•</span>
                      <span>{calculateDuration(exp.start_date, exp.end_date)}</span>
                      {exp.location && (
                        <>
                          <span>•</span>
                          <span>{exp.location}</span>
                        </>
                      )}
                    </div>

                    {expandedItems.has(exp.id) && exp.description && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="text-sm text-muted-foreground mb-3"
                      >
                        {exp.description}
                      </motion.div>
                    )}

                    {exp.skills && exp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {exp.skills.slice(0, expandedItems.has(exp.id) ? undefined : 5).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {!expandedItems.has(exp.id) && exp.skills.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{exp.skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education & Certifications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Education */}
        {education && education.length > 0 && (
          <Card className={candidateProfileTokens.glass.card}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="w-5 h-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {education.map((edu, idx) => (
                <motion.div
                  key={edu.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`${candidateProfileTokens.glass.strong} rounded-lg p-3`}
                >
                  <h4 className="font-semibold">{edu.degree}</h4>
                  <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                  </p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <Card className={candidateProfileTokens.glass.card}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5" />
                Certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {certifications.map((cert, idx) => (
                <motion.div
                  key={cert.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`${candidateProfileTokens.glass.strong} rounded-lg p-3`}
                >
                  <h4 className="font-semibold">{cert.name}</h4>
                  <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                  {cert.issued_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Issued {formatDate(cert.issued_date)}
                    </p>
                  )}
                </motion.div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
