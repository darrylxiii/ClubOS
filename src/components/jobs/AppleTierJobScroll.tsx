import { motion, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AboutRoleSection } from "@/components/jobs/AboutRoleSection";
import { SkillMatrix } from "@/components/jobs/SkillMatrix";
import { ToolsShowcase } from "@/components/jobs/ToolsShowcase";
import { ResponsibilityGrid } from "@/components/jobs/ResponsibilityGrid";
import { BenefitsShowcase } from "@/components/jobs/BenefitsShowcase";
import { CompanyShowcase } from "@/components/jobs/CompanyShowcase";
import { JobReferralSection } from "@/components/jobs/JobReferralSection";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface AppleTierJobScrollProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  job: any;
  isApplied: boolean;
  onApply: () => void;
}

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring" as const, stiffness: 100, damping: 20 }
  }
};

export function AppleTierJobScroll({ job, isApplied, onApply }: AppleTierJobScrollProps) {
  const { t } = useTranslation('jobs');
  return (
    <div className="w-full relative pb-32">
      <div className="max-w-4xl mx-auto space-y-24 pt-12">
        
        {/* The Mission */}
        {job.description && (
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={revealVariants}
            className="prose prose-lg dark:prose-invert max-w-none"
          >
            <h2 className="text-heading-xl font-display tracking-tight text-foreground/90 mb-8">{t('appleTier.theMission', 'The Mission')}</h2>
            <AboutRoleSection description={job.description} />
          </motion.section>
        )}

        {/* The Stack & Skills */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={revealVariants}
          className="space-y-12"
        >
          <h2 className="text-heading-xl font-display tracking-tight text-foreground/90">{t('appleTier.theStack', 'The Stack')}</h2>
          <div className="grid grid-cols-1 gap-12">
            <SkillMatrix
              mustHaveSkills={job.requirements}
              niceToHaveSkills={job.nice_to_have}
            />
            {job.job_tools && job.job_tools.length > 0 && (
              <ToolsShowcase
                requiredTools={job.job_tools.filter((jt: any) => jt.is_required).map((jt: any) => jt.tools_and_skills)}
                niceToHaveTools={job.job_tools.filter((jt: any) => !jt.is_required).map((jt: any) => jt.tools_and_skills)}
              />
            )}
          </div>
        </motion.section>

        {/* Responsibilities */}
        {job.responsibilities && job.responsibilities.length > 0 && (
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={revealVariants}
          >
            <h2 className="text-heading-xl font-display tracking-tight text-foreground/90 mb-8">{t('appleTier.yourImpact', 'Your Impact')}</h2>
            <ResponsibilityGrid responsibilities={job.responsibilities} />
          </motion.section>
        )}

        {/* Benefits */}
        {job.benefits && job.benefits.length > 0 && (
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={revealVariants}
          >
            <h2 className="text-heading-xl font-display tracking-tight text-foreground/90 mb-8">{t('appleTier.theRewards', 'The Rewards')}</h2>
            <BenefitsShowcase benefits={job.benefits} />
          </motion.section>
        )}

        {/* Company Showcase */}
        {job.companies && (
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={revealVariants}
          >
            <h2 className="text-heading-xl font-display tracking-tight text-foreground/90 mb-8">{t('appleTier.theEnvironment', 'The Environment')}</h2>
            <CompanyShowcase company={job.companies} />
          </motion.section>
        )}

        {/* Referral Bounty */}
        {job.show_referral_bonus !== false && (
          <motion.section 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={revealVariants}
          >
            <JobReferralSection
              jobId={job.id}
              jobTitle={job.title}
              companyName={job.companies?.name || 'Company'}
              salaryMin={job.salary_min}
              salaryMax={job.salary_max}
              referralBonusPercentage={job.referral_bonus_percentage || 10}
              showReferralBonus={true}
            />
          </motion.section>
        )}
      </div>

      {/* Sticky Magnet Application Button */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
        className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-50 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto flex justify-center pointer-events-auto">
          {!isApplied ? (
            <Button 
              size="lg" 
              onClick={onApply}
              className="group h-16 px-12 rounded-full text-lg font-bold shadow-glow hover:shadow-glow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <span className="mr-2">{t('appleTier.securePosition', 'Secure This Position')}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <Button 
              size="lg" 
              variant="outline"
              disabled
              className="h-16 px-12 rounded-full text-lg font-bold border-primary text-primary opacity-100 bg-background/50 backdrop-blur-md"
            >
              {t('appleTier.applicationUnderReview', 'Application Under Review')}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

