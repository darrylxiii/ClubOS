import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Lock, CheckCircle2, User, Building2, UserPlus, Crown, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ApplicantType = "talent" | "partner" | "referrer" | "vip";

interface WaitlistForm {
  // Common fields
  name: string;
  email: string;
  linkedin: string;
  phone?: string;
  location?: string;
  
  // Type-specific fields
  applicantType: ApplicantType;
  company?: string;
  jobTitle?: string;
  industry?: string;
  seniority?: string;
  expertise?: string;
  goals?: string;
  elevatorPitch?: string;
  referredByCode?: string;
}

export const EnhancedInviteGate = () => {
  const { t } = useTranslation('common');
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedReferralCode, setGeneratedReferralCode] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState<WaitlistForm>({
    name: "",
    email: "",
    linkedin: "",
    applicantType: "talent",
  });

  const applicantTypes = [
    {
      type: "talent" as ApplicantType,
      icon: User,
      label: t('landing.enhancedinvitegate.eliteTalent', 'Elite Talent'),
      description: t('landing.enhancedinvitegate.seekingCareerQuantumLeap', 'Seeking career quantum leap'),
      color: "from-blue-500 to-cyan-500",
    },
    {
      type: "partner" as ApplicantType,
      icon: Building2,
      label: t('landing.enhancedinvitegate.hiringPartner', 'Hiring Partner'),
      description: t('landing.enhancedinvitegate.connectWithTop1Talent', 'Connect with top 1% talent'),
      color: "from-purple-500 to-pink-500",
    },
    {
      type: "referrer" as ApplicantType,
      icon: UserPlus,
      label: t('landing.enhancedinvitegate.clubReferrer', 'Club Referrer'),
      description: t('landing.enhancedinvitegate.bringEliteTalentToTheClub', 'Bring elite talent to the club'),
      color: "from-green-500 to-emerald-500",
    },
    {
      type: "vip" as ApplicantType,
      icon: Crown,
      label: t('landing.enhancedinvitegate.vipFastTrack', 'VIP Fast Track'),
      description: t('landing.enhancedinvitegate.acceleratedClubAccess', 'Accelerated club access'),
      color: "from-amber-500 to-orange-500",
    },
  ];

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      if (code.toLowerCase() === "quantum2025" || code.toLowerCase() === "elite") {
        toast.success("Access granted! Welcome to The Quantum Club.", {
          icon: <Sparkles className="h-4 w-4" />,
        });
        navigate("/auth");
      } else {
        toast.error(t('landing.invalidAccessCodeRequestAnInviteToJoin'));
      }
      setIsLoading(false);
      setCode("");
    }, 1500);
  };

  const handleTypeSelection = (type: ApplicantType) => {
    setFormData({ ...formData, applicantType: type });
    setCurrentStep(2);
  };

  const handleNext = () => {
    if (currentStep === 2) {
      if (!formData.name || !formData.email) {
        toast.error(t('landing.pleaseFillInRequiredFields'));
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      setShowWaitlist(false);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.from("waitlist").insert([
        {
          name: formData.name,
          email: formData.email,
          linkedin_url: formData.linkedin || null,
          phone: formData.phone || null,
          location: formData.location || null,
          applicant_type: formData.applicantType,
          company: formData.company || null,
          job_title: formData.jobTitle || null,
          industry: formData.industry || null,
          seniority: formData.seniority || null,
          expertise: formData.expertise || null,
          goals: formData.goals || null,
          elevator_pitch: formData.elevatorPitch || null,
          referred_by_code: formData.referredByCode || null,
        },
      ]).select('id, referral_code').single();

      if (error) throw error;

      // Track engagement event
      if (data?.id) {
        setGeneratedReferralCode(data.referral_code);
        await supabase.from("waitlist_engagement").insert([
          {
            waitlist_id: data.id,
            event_type: "application_submitted",
            event_data: { type: formData.applicantType },
          },
        ]);
      }

      setIsSuccess(true);

      setTimeout(() => {
        toast.success("🎉 Application submitted! Check your email for next steps.", {
          icon: <CheckCircle2 className="h-4 w-4" />,
        });
      }, 1500);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : t('landing.enhancedinvitegate.somethingWentWrongPleaseTryAgain', 'Something went wrong. Please try again.'));
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight mb-2">{t('landing.chooseYourPath')}</h3>
              <p className="text-sm text-muted-foreground">{t('landing.selectTheCategoryThatBestDescribesYou')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {applicantTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.type}
                    onClick={() => handleTypeSelection(type.type)}
                    className={cn(
                      "group relative p-6 rounded-lg border-2 transition-all duration-300 hover-lift text-left",
                      "border-foreground/10 hover:border-foreground/30 bg-card/50 backdrop-blur-sm"
                    )}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-300`}></div>
                    <div className="relative">
                      <Icon className="h-8 w-8 mb-3 group-hover:scale-110 transition-transform duration-300" />
                      <h4 className="font-black uppercase text-sm mb-1">{type.label}</h4>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${applicantTypes.find(t => t.type === formData.applicantType)?.color} text-white text-xs font-bold uppercase mb-4`}>
                {applicantTypes.find(t => t.type === formData.applicantType)?.label}
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">{t('landing.basicInformation')}</h3>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold uppercase">{t('landing.fullName ')}</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('landing.janeSmith')}
                  className="border-2 transition-all duration-300"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase">{t('landing.email ')}</Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane@example.com"
                  className="border-2 transition-all duration-300"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase">{t('landing.linkedInProfile')}</Label>
                <Input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/janesmith"
                  className="border-2 transition-all duration-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase">{t('landing.phone')}</Label>
                  <Input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={t('landing.12345678900')}
                    className="border-2 transition-all duration-300"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase">{t('landing.location')}</Label>
                  <Input
                    value={formData.location || ""}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={t('landing.amsterdam')} NL
                    className="border-2 transition-all duration-300"
                  />
                </div>
              </div>

              {formData.referredByCode !== undefined && (
                <div>
                  <Label className="text-xs font-bold uppercase">{t('landing.referralCodeOptional')}</Label>
                  <Input
                    value={formData.referredByCode || ""}
                    onChange={(e) => setFormData({ ...formData, referredByCode: e.target.value.toUpperCase() })}
                    placeholder={t('landing.qCXXXXXX')}
                    className="border-2 transition-all duration-300"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1">{t('landing.back')}</Button>
              <Button type="submit" className="flex-1 hover-lift">{t('landing.continue')}</Button>
            </div>
          </form>
        );

      case 3:
        return (
          <form onSubmit={handleWaitlistSubmit} className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <h3 className="text-xl font-black uppercase tracking-tight">{t('landing.tellUsMore')}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('landing.helpUsUnderstandYourGoals')}</p>
            </div>

            <div className="space-y-3">
              {formData.applicantType !== "referrer" && (
                <>
                  <div>
                    <Label className="text-xs font-bold uppercase">
                      {formData.applicantType === "partner" ? t('landing.enhancedinvitegate.companyName', 'Company Name') : t('landing.enhancedinvitegate.currentCompany', 'Current Company')}
                    </Label>
                    <Input
                      value={formData.company || ""}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder={t('landing.acmeInc')}
                      className="border-2 transition-all duration-300"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase">
                      {formData.applicantType === "partner" ? t('landing.enhancedinvitegate.yourRole', 'Your Role') : t('landing.enhancedinvitegate.currentTitle', 'Current Title')}
                    </Label>
                    <Input
                      value={formData.jobTitle || ""}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      placeholder={t('landing.seniorProductManager')}
                      className="border-2 transition-all duration-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold uppercase">{t('landing.industry')}</Label>
                      <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
                        <SelectTrigger className="border-2">
                          <SelectValue placeholder={t('landing.select')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">{t('landing.enhancedinvitegate.technology', 'Technology')}</SelectItem>
                          <SelectItem value="finance">{t('landing.enhancedinvitegate.finance', 'Finance')}</SelectItem>
                          <SelectItem value="healthcare">{t('landing.enhancedinvitegate.healthcare', 'Healthcare')}</SelectItem>
                          <SelectItem value="consulting">{t('landing.enhancedinvitegate.consulting', 'Consulting')}</SelectItem>
                          <SelectItem value="other">{t('landing.enhancedinvitegate.other', 'Other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold uppercase">{t('landing.seniority')}</Label>
                      <Select value={formData.seniority} onValueChange={(value) => setFormData({ ...formData, seniority: value })}>
                        <SelectTrigger className="border-2">
                          <SelectValue placeholder={t('landing.select')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="senior">{t('landing.enhancedinvitegate.senior', 'Senior')}</SelectItem>
                          <SelectItem value="lead">{t('landing.enhancedinvitegate.lead', 'Lead')}</SelectItem>
                          <SelectItem value="manager">{t('landing.enhancedinvitegate.manager', 'Manager')}</SelectItem>
                          <SelectItem value="director">{t('landing.enhancedinvitegate.director', 'Director')}</SelectItem>
                          <SelectItem value="vp">{t('landing.enhancedinvitegate.vp', 'VP+')}</SelectItem>
                          <SelectItem value="c-level">{t('landing.enhancedinvitegate.clevel', 'C-Level')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label className="text-xs font-bold uppercase">
                  {formData.applicantType === "partner" ? "What You're Looking For" : 
                   formData.applicantType === "referrer" ? t('landing.enhancedinvitegate.yourNetworkFocus', 'Your Network Focus') : t('landing.enhancedinvitegate.yourGoals', 'Your Goals')}
                </Label>
                <Textarea
                  value={formData.goals || ""}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  placeholder={
                    formData.applicantType === "partner" 
                      ? t('landing.enhancedinvitegate.describeTheTalentYouWantTo', 'Describe the talent you want to hire...') : t('landing.enhancedinvitegate.whatAreYouLookingToAchieve', 'What are you looking to achieve?')
                  }
                  className="border-2 transition-all duration-300 min-h-[80px]"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase">
                  {formData.applicantType === "partner" ? t('landing.enhancedinvitegate.whyPartnerWithUs', 'Why Partner with Us?') : t('landing.enhancedinvitegate.elevatorPitch', 'Elevator Pitch')}
                </Label>
                <Textarea
                  value={formData.elevatorPitch || ""}
                  onChange={(e) => setFormData({ ...formData, elevatorPitch: e.target.value })}
                  placeholder={
                    formData.applicantType === "partner"
                      ? t('landing.enhancedinvitegate.tellUsAboutYourCompanyAnd', 'Tell us about your company and hiring needs...') : t('landing.enhancedinvitegate.tellUsYourStoryIn23', 'Tell us your story in 2-3 sentences...')
                  }
                  className="border-2 transition-all duration-300 min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleBack} className="flex-1">{t('landing.back')}</Button>
              <Button type="submit" disabled={isLoading} className="flex-1 hover-lift">
                {isLoading ? t('landing.enhancedinvitegate.submitting', 'Submitting...') : t('landing.enhancedinvitegate.submitApplication', 'Submit Application')}
              </Button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="relative animate-fade-in">
        <form onSubmit={handleCodeSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/10 to-foreground/5 blur-xl group-hover:blur-2xl transition-all duration-300 rounded-lg"></div>
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              type="text"
              placeholder={t('landing.eNTERACCESSCODE')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="relative pl-10 h-12 text-sm font-bold uppercase tracking-wider border-2 border-foreground/20 focus:border-foreground/40 bg-background/50 backdrop-blur-sm transition-all duration-300"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !code}
            className="h-12 px-8 text-sm font-black uppercase tracking-wider hover-lift"
          >
            {isLoading ? t('landing.enhancedinvitegate.verifying', 'VERIFYING...') : t('landing.enhancedinvitegate.unlock', 'UNLOCK')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setShowWaitlist(true);
              setCurrentStep(1);
              setIsSuccess(false);
            }}
            className="group relative text-sm text-muted-foreground hover:text-foreground transition-all duration-300 underline decoration-dotted underline-offset-4"
          >
            <span className="relative z-10">{t('landing.dontHaveAnInviteJoinTheWaitlist')}</span>
            <div className="absolute inset-0 bg-foreground/5 scale-0 group-hover:scale-100 transition-transform duration-300 rounded -mx-3 -my-2"></div>
          </button>
        </div>
      </div>

      <Dialog open={showWaitlist} onOpenChange={setShowWaitlist}>
        <DialogContent className="sm:max-w-2xl border-2 border-foreground glass-strong">
          {!isSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">{t('landing.joinTheQuantumClub')}</DialogTitle>
                <DialogDescription>
                  Step {currentStep} of 3: {currentStep === 1 ? "Select Path" : currentStep === 2 ? t('landing.enhancedinvitegate.contactInfo', 'Contact Info') : t('landing.enhancedinvitegate.yourStory', 'Your Story')}
                </DialogDescription>
              </DialogHeader>

              {renderStep()}
            </>
          ) : (
            <div className="text-center py-12 space-y-6 animate-fade-in">
              <div className="relative">
                <div className="text-8xl animate-bounce">🎉</div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-3xl opacity-20 animate-pulse"></div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">{t('landing.applicationSubmitted')}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('landing.wellReviewYourApplicationAndGetBackToYou')}</p>
              </div>

              {generatedReferralCode && (
                <div className="p-6 rounded-lg border-2 border-foreground/20 bg-card/50 backdrop-blur-sm space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('landing.yourReferralCode')}</p>
                  <div className="text-2xl font-black uppercase tracking-tight">
                    {generatedReferralCode}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('landing.shareThisCodeToEarnPriorityStatusAndRewa')}</p>
                </div>
              )}

              <Button
                onClick={() => {
                  setShowWaitlist(false);
                  setCurrentStep(1);
                  setIsSuccess(false);
                  setFormData({
                    name: "",
                    email: "",
                    linkedin: "",
                    applicantType: "talent",
                  });
                }}
                className="hover-lift"
              >
                {t('landing.enhancedinvitegate.close', 'Close')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
