import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, GraduationCap, Award } from "lucide-react";
import { motion } from "framer-motion";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Experience {
  id: string;
  title: string;
  company: string;
  company_logo?: string | null;
  location?: string;
  start_date: string;
  end_date?: string;
  current: boolean;
  description?: string;
  skills?: string[];
}

interface CompanyGroup {
  company: string;
  company_logo?: string | null;
  roles: Experience[];
  totalDuration: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
}

interface Props {
  experiences: Experience[];
  education: any[];
  certifications: any[];
}

function groupExperiencesByCompany(experiences: Experience[]): CompanyGroup[] {
  if (!experiences.length) return [];

  const groups: CompanyGroup[] = [];
  let currentGroup: Experience[] = [experiences[0]];

  for (let i = 1; i < experiences.length; i++) {
    const prev = experiences[i - 1];
    const curr = experiences[i];
    if (prev.company.toLowerCase().trim() === curr.company.toLowerCase().trim()) {
      currentGroup.push(curr);
    } else {
      groups.push(buildGroup(currentGroup));
      currentGroup = [curr];
    }
  }
  groups.push(buildGroup(currentGroup));
  return groups;
}

function buildGroup(roles: Experience[]): CompanyGroup {
  const earliest = roles[roles.length - 1];
  const latest = roles[0];
  return {
    company: latest.company,
    company_logo: roles.find(r => r.company_logo)?.company_logo || null,
    roles,
    totalDuration: calculateDuration(earliest.start_date, latest.end_date),
    startDate: earliest.start_date,
    endDate: latest.end_date,
    isCurrent: latest.current,
  };
}

function calculateDuration(start: string, end?: string): string {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const months = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${remainingMonths} mos`;
  if (remainingMonths === 0) return `${years} yrs`;
  return `${years} yrs ${remainingMonths} mos`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getCompanyDomain(company: string): string {
  const cleaned = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleaned}.com`;
}

function OrgLogo({ name, logoUrl, size = 'md' }: { name: string; logoUrl?: string | null; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const domain = getCompanyDomain(name);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  return (
    <Avatar className={`${sizeClass} rounded-lg border border-border/50 bg-muted/30 flex-shrink-0`}>
      <AvatarImage src={logoUrl || faviconUrl} alt={name} className="object-contain p-0.5" />
      <AvatarFallback className={`rounded-lg ${textSize} font-semibold bg-muted/50 text-muted-foreground`}>
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

export const ExperienceTimeline = ({ experiences, education, certifications }: Props) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const companyGroups = groupExperiencesByCompany(experiences || []);

  return (
    <div className="space-y-6">
      {/* Empty state for work experience */}
      {(!experiences || experiences.length === 0) && (
        <Card className={candidateProfileTokens.glass.card}>
          <CardContent className="py-8 text-center">
            <Briefcase className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No work experience recorded</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Sync from LinkedIn or add manually</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state for education */}
      {(!education || education.length === 0) && (
        <Card className={candidateProfileTokens.glass.card}>
          <CardContent className="py-8 text-center">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No education recorded</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Sync from LinkedIn or add manually</p>
          </CardContent>
        </Card>
      )}

      {/* Work Experience - Grouped by Company */}
      {companyGroups.length > 0 && (
        <Card className={candidateProfileTokens.glass.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Work Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {companyGroups.map((group, groupIdx) => (
                <motion.div
                  key={`group-${groupIdx}`}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: groupIdx * 0.08 }}
                >
                  {group.roles.length === 1 ? (
                    /* Single role at company — flat layout */
                    <SingleRoleCard
                      exp={group.roles[0]}
                      expandedItems={expandedItems}
                      toggleExpand={toggleExpand}
                    />
                  ) : (
                    /* Multiple roles at same company — grouped stack */
                    <div className={`${candidateProfileTokens.glass.strong} rounded-xl p-4`}>
                      {/* Company header */}
                      <div className="flex items-center gap-3 mb-4">
                        <OrgLogo name={group.company} logoUrl={group.company_logo} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base truncate">{group.company}</h4>
                          <p className="text-sm text-muted-foreground">
                            {group.totalDuration}
                          </p>
                        </div>
                        {group.isCurrent && (
                          <Badge className={candidateProfileTokens.badges.success}>Current</Badge>
                        )}
                      </div>

                      {/* Nested roles with vertical line */}
                      <div className="relative ml-5 pl-5 border-l-2 border-border/50 space-y-4">
                        {group.roles.map((role, roleIdx) => (
                          <div
                            key={role.id}
                            className="relative cursor-pointer"
                            onClick={() => toggleExpand(role.id)}
                          >
                            {/* Connector dot */}
                            <div className="absolute -left-[1.4rem] top-1.5 w-2.5 h-2.5 rounded-full bg-primary/60 ring-2 ring-background" />

                            <div className="hover:bg-muted/30 rounded-lg p-2 -ml-1 transition-colors">
                              <h5 className="font-medium text-sm">{role.title}</h5>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>
                                  {formatDate(role.start_date)} – {role.current ? 'Present' : formatDate(role.end_date!)}
                                </span>
                                <span>·</span>
                                <span>{calculateDuration(role.start_date, role.end_date)}</span>
                                {role.location && (
                                  <>
                                    <span>·</span>
                                    <span>{role.location}</span>
                                  </>
                                )}
                              </div>

                              {expandedItems.has(role.id) && role.description && (
                                <motion.p
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  className="text-xs text-muted-foreground mt-2"
                                >
                                  {role.description}
                                </motion.p>
                              )}

                              {role.skills && role.skills.length > 0 && expandedItems.has(role.id) && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {role.skills.map((skill, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Education - Full Width */}
      {education && education.length > 0 && (
        <Card className={candidateProfileTokens.glass.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Education
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {education.map((edu, idx) => (
                <motion.div
                  key={edu.id}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`${candidateProfileTokens.glass.strong} rounded-xl p-4`}
                >
                  <div className="flex items-start gap-3">
                    <OrgLogo
                      name={edu.institution || 'School'}
                      logoUrl={edu.school_logo}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base">{edu.institution}</h4>
                      <p className="text-sm text-muted-foreground">
                        {edu.degree}
                        {edu.field && `, ${edu.field}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(edu.start_date)} – {edu.end_date ? formatDate(edu.end_date) : 'Present'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
  );
};

/* Single-role card with company logo */
function SingleRoleCard({
  exp,
  expandedItems,
  toggleExpand,
}: {
  exp: Experience;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  return (
    <div
      className={`${candidateProfileTokens.glass.strong} rounded-xl p-4 cursor-pointer transition-all hover:shadow-md`}
      onClick={() => toggleExpand(exp.id)}
    >
      <div className="flex items-start gap-3">
        <OrgLogo name={exp.company} logoUrl={exp.company_logo} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h4 className="font-semibold text-base">{exp.title}</h4>
              <p className="text-sm text-muted-foreground">{exp.company}</p>
            </div>
            {exp.current && (
              <Badge className={candidateProfileTokens.badges.success}>Current</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{formatDate(exp.start_date)} – {exp.current ? 'Present' : formatDate(exp.end_date!)}</span>
            <span>·</span>
            <span>{calculateDuration(exp.start_date, exp.end_date)}</span>
            {exp.location && (
              <>
                <span>·</span>
                <span>{exp.location}</span>
              </>
            )}
          </div>

          {expandedItems.has(exp.id) && exp.description && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="text-sm text-muted-foreground mt-3"
            >
              {exp.description}
            </motion.div>
          )}

          {exp.skills && exp.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
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
      </div>
    </div>
  );
}
