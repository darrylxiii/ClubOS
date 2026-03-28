import { Helmet } from 'react-helmet-async';
import { useTranslation } from "react-i18next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Server,
  Database,
  Brain,
  BarChart3,
  CreditCard,
  KeyRound,
  Mail,
  Video,
  ExternalLink,
  Globe,
  MapPin,
  BadgeCheck,
  Mic,
  Linkedin,
  Bug,
  ShieldCheck,
} from "lucide-react";

interface Integration {
  name: string;
  icon: React.ReactNode;
  category: string;
  description: string;
  dataAccessed: string[];
  privacyPolicyUrl: string;
  dataLocation: string;
  certifications: string[];
  euTransfer: boolean;
}

interface IntegrationCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  integrations: Integration[];
}

function IntegrationCard({ integration, t }: { integration: Integration; t: (key: string, fallback: string) => string }) {
  return (
    <Card className="p-5 hover:shadow-md transition-shadow border-border/60">
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary flex-shrink-0">
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-base">{integration.name}</h3>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {integration.category}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {integration.description}
          </p>

          {/* Data accessed */}
          <div className="mb-3">
            <p className="text-xs font-medium text-foreground mb-1">
              {t("thirdParty.dataAccessed", "Data Accessed")}
            </p>
            <div className="flex flex-wrap gap-1">
              {integration.dataAccessed.map((item) => (
                <Badge key={item} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {/* Data location & EU transfer */}
          <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {integration.dataLocation}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {integration.euTransfer
                ? t("thirdParty.euTransferYes", "EU transfer: Yes")
                : t("thirdParty.euTransferNo", "EU transfer: No")}
            </span>
          </div>

          {/* Certifications */}
          {integration.certifications.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {integration.certifications.map((cert) => (
                  <Badge key={cert} variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <BadgeCheck className="w-2.5 h-2.5 mr-0.5" />
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Privacy policy link */}
          <a
            href={integration.privacyPolicyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t("thirdParty.privacyPolicy", "Privacy Policy")}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Card>
  );
}

export default function ThirdPartyRegistry() {
  const { t } = useTranslation("common");
  const lastUpdated = "March 28, 2026";

  const sections = [
    { id: "infrastructure", title: t("thirdParty.sectionInfrastructure", "1. Infrastructure") },
    { id: "ai-ml", title: t("thirdParty.sectionAiMl", "2. AI & Machine Learning") },
    { id: "analytics", title: t("thirdParty.sectionAnalytics", "3. Analytics & Monitoring") },
    { id: "payments", title: t("thirdParty.sectionPayments", "4. Payments") },
    { id: "authentication", title: t("thirdParty.sectionAuth", "5. Authentication") },
    { id: "communication", title: t("thirdParty.sectionComm", "6. Communication") },
    { id: "meeting", title: t("thirdParty.sectionMeeting", "7. Meetings & Video") },
    { id: "data-import", title: t("thirdParty.sectionDataImport", "8. Data Import") },
  ];

  const categories: IntegrationCategory[] = [
    {
      id: "infrastructure",
      title: t("thirdParty.sectionInfrastructure", "1. Infrastructure"),
      icon: <Database className="w-5 h-5" />,
      integrations: [
        {
          name: "Supabase",
          icon: <Database className="w-5 h-5" />,
          category: t("thirdParty.catInfrastructure", "Infrastructure"),
          description: t(
            "thirdParty.supabaseDesc",
            "Backend-as-a-Service providing PostgreSQL database, authentication, real-time subscriptions, edge functions, and file storage."
          ),
          dataAccessed: [
            t("thirdParty.userProfiles", "User profiles"),
            t("thirdParty.authCredentials", "Auth credentials"),
            t("thirdParty.applicationData", "Application data"),
            t("thirdParty.fileUploads", "File uploads"),
            t("thirdParty.realtimeEvents", "Realtime events"),
          ],
          privacyPolicyUrl: "https://supabase.com/privacy",
          dataLocation: t("thirdParty.euFrankfurt", "EU (Frankfurt)"),
          certifications: ["SOC 2 Type II", "ISO 27001", "HIPAA"],
          euTransfer: false,
        },
      ],
    },
    {
      id: "ai-ml",
      title: t("thirdParty.sectionAiMl", "2. AI & Machine Learning"),
      icon: <Brain className="w-5 h-5" />,
      integrations: [
        {
          name: "OpenAI",
          icon: <Brain className="w-5 h-5" />,
          category: t("thirdParty.catAiMl", "AI/ML"),
          description: t(
            "thirdParty.openaiDesc",
            "Large language models powering Club AI chat, candidate-job matching, resume analysis, and career coaching features."
          ),
          dataAccessed: [
            t("thirdParty.chatMessages", "Chat messages"),
            t("thirdParty.resumeData", "Resume data"),
            t("thirdParty.jobDescriptions", "Job descriptions"),
            t("thirdParty.matchingCriteria", "Matching criteria"),
          ],
          privacyPolicyUrl: "https://openai.com/policies/privacy-policy",
          dataLocation: t("thirdParty.us", "US"),
          certifications: ["SOC 2 Type II", "CSA STAR"],
          euTransfer: true,
        },
        {
          name: "ElevenLabs",
          icon: <Mic className="w-5 h-5" />,
          category: t("thirdParty.catAiMl", "AI/ML"),
          description: t(
            "thirdParty.elevenlabsDesc",
            "AI voice synthesis and speech-to-text transcription for voice-based booking, interview sessions, and Club AI voice interactions."
          ),
          dataAccessed: [
            t("thirdParty.voiceAudio", "Voice audio"),
            t("thirdParty.transcriptions", "Transcriptions"),
            t("thirdParty.sessionMetadata", "Session metadata"),
          ],
          privacyPolicyUrl: "https://elevenlabs.io/privacy-policy",
          dataLocation: t("thirdParty.us", "US"),
          certifications: ["SOC 2 Type II"],
          euTransfer: true,
        },
      ],
    },
    {
      id: "analytics",
      title: t("thirdParty.sectionAnalytics", "3. Analytics & Monitoring"),
      icon: <BarChart3 className="w-5 h-5" />,
      integrations: [
        {
          name: "PostHog",
          icon: <BarChart3 className="w-5 h-5" />,
          category: t("thirdParty.catAnalytics", "Analytics"),
          description: t(
            "thirdParty.posthogDesc",
            "Product analytics platform for understanding user behavior, feature adoption, A/B testing, and session recording."
          ),
          dataAccessed: [
            t("thirdParty.pageViews", "Page views"),
            t("thirdParty.featureUsage", "Feature usage"),
            t("thirdParty.sessionData", "Session data"),
            t("thirdParty.deviceInfo", "Device info"),
          ],
          privacyPolicyUrl: "https://posthog.com/privacy",
          dataLocation: t("thirdParty.euFrankfurt", "EU (Frankfurt)"),
          certifications: ["SOC 2 Type II"],
          euTransfer: false,
        },
        {
          name: "Sentry",
          icon: <Bug className="w-5 h-5" />,
          category: t("thirdParty.catMonitoring", "Monitoring"),
          description: t(
            "thirdParty.sentryDesc",
            "Error tracking and performance monitoring to detect, diagnose, and resolve application issues in real time."
          ),
          dataAccessed: [
            t("thirdParty.errorLogs", "Error logs"),
            t("thirdParty.stackTraces", "Stack traces"),
            t("thirdParty.browserMetadata", "Browser metadata"),
            t("thirdParty.performanceData", "Performance data"),
          ],
          privacyPolicyUrl: "https://sentry.io/privacy/",
          dataLocation: t("thirdParty.us", "US"),
          certifications: ["SOC 2 Type II", "GDPR DPA"],
          euTransfer: true,
        },
      ],
    },
    {
      id: "payments",
      title: t("thirdParty.sectionPayments", "4. Payments"),
      icon: <CreditCard className="w-5 h-5" />,
      integrations: [
        {
          name: "Stripe",
          icon: <CreditCard className="w-5 h-5" />,
          category: t("thirdParty.catPayments", "Payments"),
          description: t(
            "thirdParty.stripeDesc",
            "Payment processing for subscriptions, invoicing, and billing. Handles all payment card data directly -- ClubOS never stores card numbers."
          ),
          dataAccessed: [
            t("thirdParty.paymentInfo", "Payment information"),
            t("thirdParty.billingAddress", "Billing address"),
            t("thirdParty.subscriptionStatus", "Subscription status"),
            t("thirdParty.invoiceHistory", "Invoice history"),
          ],
          privacyPolicyUrl: "https://stripe.com/privacy",
          dataLocation: t("thirdParty.usEu", "US / EU"),
          certifications: ["PCI DSS Level 1", "SOC 2 Type II", "ISO 27001"],
          euTransfer: false,
        },
      ],
    },
    {
      id: "authentication",
      title: t("thirdParty.sectionAuth", "5. Authentication"),
      icon: <KeyRound className="w-5 h-5" />,
      integrations: [
        {
          name: "Google",
          icon: <KeyRound className="w-5 h-5" />,
          category: t("thirdParty.catAuth", "Authentication"),
          description: t(
            "thirdParty.googleDesc",
            "OAuth 2.0 social sign-in, Google Calendar integration for meeting scheduling, and reCAPTCHA v3 for bot protection."
          ),
          dataAccessed: [
            t("thirdParty.emailAddress", "Email address"),
            t("thirdParty.profileName", "Profile name"),
            t("thirdParty.profilePhoto", "Profile photo"),
            t("thirdParty.calendarEvents", "Calendar events"),
          ],
          privacyPolicyUrl: "https://policies.google.com/privacy",
          dataLocation: t("thirdParty.global", "Global"),
          certifications: ["SOC 2 Type II", "ISO 27001", "ISO 27017", "ISO 27018"],
          euTransfer: true,
        },
      ],
    },
    {
      id: "communication",
      title: t("thirdParty.sectionComm", "6. Communication"),
      icon: <Mail className="w-5 h-5" />,
      integrations: [
        {
          name: "Resend",
          icon: <Mail className="w-5 h-5" />,
          category: t("thirdParty.catComm", "Communication"),
          description: t(
            "thirdParty.resendDesc",
            "Transactional email delivery service for sending system notifications, meeting summaries, security alerts, and onboarding emails."
          ),
          dataAccessed: [
            t("thirdParty.recipientEmail", "Recipient email"),
            t("thirdParty.emailContent", "Email content"),
            t("thirdParty.deliveryStatus", "Delivery status"),
          ],
          privacyPolicyUrl: "https://resend.com/legal/privacy-policy",
          dataLocation: t("thirdParty.us", "US"),
          certifications: ["SOC 2 Type II"],
          euTransfer: true,
        },
      ],
    },
    {
      id: "meeting",
      title: t("thirdParty.sectionMeeting", "7. Meetings & Video"),
      icon: <Video className="w-5 h-5" />,
      integrations: [
        {
          name: "LiveKit",
          icon: <Video className="w-5 h-5" />,
          category: t("thirdParty.catMeeting", "Meeting"),
          description: t(
            "thirdParty.livekitDesc",
            "Real-time video and audio infrastructure for in-platform meetings, interviews, and the Club DJ live streaming feature."
          ),
          dataAccessed: [
            t("thirdParty.videoAudioStreams", "Video/audio streams"),
            t("thirdParty.participantInfo", "Participant info"),
            t("thirdParty.roomMetadata", "Room metadata"),
          ],
          privacyPolicyUrl: "https://livekit.io/privacy",
          dataLocation: t("thirdParty.usEu", "US / EU"),
          certifications: ["SOC 2 Type II"],
          euTransfer: false,
        },
        {
          name: "Fathom",
          icon: <Video className="w-5 h-5" />,
          category: t("thirdParty.catMeeting", "Meeting"),
          description: t(
            "thirdParty.fathomDesc",
            "AI meeting assistant that records, transcribes, and summarizes meetings to generate actionable insights."
          ),
          dataAccessed: [
            t("thirdParty.meetingRecordings", "Meeting recordings"),
            t("thirdParty.transcriptions", "Transcriptions"),
            t("thirdParty.meetingSummaries", "Meeting summaries"),
          ],
          privacyPolicyUrl: "https://fathom.video/privacy",
          dataLocation: t("thirdParty.us", "US"),
          certifications: ["SOC 2 Type II"],
          euTransfer: true,
        },
        {
          name: "Fireflies.ai",
          icon: <Video className="w-5 h-5" />,
          category: t("thirdParty.catMeeting", "Meeting"),
          description: t(
            "thirdParty.firefliesDesc",
            "Meeting intelligence platform for recording sync and automated transcription of external meeting recordings."
          ),
          dataAccessed: [
            t("thirdParty.meetingRecordings", "Meeting recordings"),
            t("thirdParty.transcriptions", "Transcriptions"),
            t("thirdParty.participantNames", "Participant names"),
          ],
          privacyPolicyUrl: "https://fireflies.ai/privacy-policy",
          dataLocation: t("thirdParty.us", "US"),
          certifications: ["SOC 2 Type II", "GDPR DPA"],
          euTransfer: true,
        },
      ],
    },
    {
      id: "data-import",
      title: t("thirdParty.sectionDataImport", "8. Data Import"),
      icon: <Linkedin className="w-5 h-5" />,
      integrations: [
        {
          name: "LinkedIn",
          icon: <Linkedin className="w-5 h-5" />,
          category: t("thirdParty.catDataImport", "Data Import"),
          description: t(
            "thirdParty.linkedinDesc",
            "Profile data import for candidates and pipeline sync for partners. Used to pre-fill profiles and import candidate information."
          ),
          dataAccessed: [
            t("thirdParty.profileData", "Profile data"),
            t("thirdParty.workHistory", "Work history"),
            t("thirdParty.skills", "Skills"),
            t("thirdParty.educationHistory", "Education history"),
          ],
          privacyPolicyUrl: "https://www.linkedin.com/legal/privacy-policy",
          dataLocation: t("thirdParty.us", "US"),
          certifications: ["SOC 2 Type II", "ISO 27001"],
          euTransfer: true,
        },
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>{t("thirdParty.title", "Third-Party Integrations Registry")} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.thirdPartyRegistryDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
        title={t("thirdParty.title", "Third-Party Integrations Registry")}
        lastUpdated={lastUpdated}
        sections={sections}
      >
      <div className="space-y-8">
        {/* Intro card */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <Server className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {t("thirdParty.introTitle", "Transparency Disclosure")}
              </h3>
              <p className="text-muted-foreground">
                {t(
                  "thirdParty.introDesc",
                  "Club OS uses carefully selected third-party services to deliver a secure, performant, and feature-rich platform. This registry discloses every external service that processes user data, what data they access, where it is stored, and their security certifications. We review all sub-processors annually and require GDPR-compliant Data Processing Agreements with each provider."
                )}
              </p>
            </div>
          </div>
        </Card>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {categories.reduce((acc, c) => acc + c.integrations.length, 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("thirdParty.totalIntegrations", "Total Integrations")}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {categories.reduce(
                (acc, c) =>
                  acc + c.integrations.filter((i) => !i.euTransfer).length,
                0
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("thirdParty.euHosted", "EU-Hosted Services")}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">100%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("thirdParty.dpaCompliance", "DPA Compliant")}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {new Set(
                categories.flatMap((c) =>
                  c.integrations.flatMap((i) => i.certifications)
                )
              ).size}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("thirdParty.uniqueCerts", "Unique Certifications")}
            </p>
          </Card>
        </div>

        {/* Category sections */}
        {categories.map((category) => (
          <LegalSection
            key={category.id}
            id={category.id}
            title={category.title}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {category.integrations.map((integration) => (
                <IntegrationCard
                  key={integration.name}
                  integration={integration}
                  t={t}
                />
              ))}
            </div>
          </LegalSection>
        ))}

        {/* Data transfer safeguards */}
        <Card className="p-6 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-base mb-2">
                {t("thirdParty.transferSafeguardsTitle", "International Data Transfer Safeguards")}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t(
                  "thirdParty.transferSafeguardsDesc",
                  "Where data is transferred outside the EU/EEA, we rely on the following legal mechanisms to ensure adequate protection:"
                )}
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>{t("thirdParty.safeguardScc", "EU Standard Contractual Clauses (SCCs) with all US-based processors")}</li>
                <li>{t("thirdParty.safeguardDpf", "EU-US Data Privacy Framework certification where applicable")}</li>
                <li>{t("thirdParty.safeguardDpa", "Binding Data Processing Agreements (DPAs) with every sub-processor")}</li>
                <li>{t("thirdParty.safeguardTia", "Transfer Impact Assessments conducted for all non-EU transfers")}</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-12 p-6 bg-muted/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {t(
              "thirdParty.footerUpdate",
              "This registry is reviewed and updated quarterly. Last audit: Q1 2026."
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("thirdParty.footerQuestions", "Questions about our sub-processors?")}{" "}
            <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">
              info@thequantumclub.com
            </a>
            {" | "}
            <a href="/legal/dpa" className="text-primary hover:underline">
              {t("thirdParty.viewDpa", "View our Data Processing Agreement")}
            </a>
          </p>
        </div>
      </div>
    </LegalPageLayout>
    </>
  );
}
