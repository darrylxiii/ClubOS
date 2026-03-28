import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import {
  FileText,
  Shield,
  Cookie,
  Scale,
  Lock,
  Gift,
  Accessibility,
  Building2,
  ExternalLink,
  Download,
  Sparkles,
  MapPin,
  Users,
  AlertCircle,
  BadgeCheck,
  Globe,
  Bot,
  ShieldCheck,
  Landmark,
  Heart,
  Flag,
  Server
} from "lucide-react";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

interface LegalDocumentCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  lastUpdated?: string;
  downloadable?: boolean;
  version?: string;
}

const LegalDocumentCard = ({
  icon,
  title,
  description,
  href,
  lastUpdated,
  downloadable,
  version
}: LegalDocumentCardProps) => (
  <Card className="group relative p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:border-primary/30 hover:scale-[1.02] hover:-translate-y-0.5 bg-card/80 backdrop-blur-sm border-border/60">
    {version && (
      <Badge variant="secondary" className="absolute top-3 right-3 text-[10px] font-mono px-1.5 py-0.5 bg-muted/80 text-muted-foreground">
        {version}
      </Badge>
    )}
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300 ring-1 ring-primary/10 group-hover:ring-primary/20">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {description}
        </p>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground/60 mb-3">
            {lastUpdated}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="group-hover:border-primary/40 group-hover:text-primary transition-colors">
            <Link to={href}>
              Read
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </Button>
          {downloadable && (
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  </Card>
);

interface TrustBadgeProps {
  icon: React.ReactNode;
  label: string;
}

const TrustBadge = ({ icon, label }: TrustBadgeProps) => (
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/60 text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all duration-200">
    {icon}
    {label}
  </div>
);

interface DocumentCategory {
  title: string;
  description: string;
  icon: React.ReactNode;
  documents: LegalDocumentCardProps[];
}

export default function LegalHub() {
  const { t } = useTranslation('common');

  const categories: DocumentCategory[] = [
    {
      title: t('legalHub.corePolicies', 'Core Policies'),
      description: t('legalHub.corePoliciesDesc', 'Foundational agreements governing platform use'),
      icon: <Landmark className="w-5 h-5" />,
      documents: [
        {
          icon: <FileText className="w-5 h-5" />,
          title: t('legalHub.termsOfService', 'Terms of Service'),
          description: t('legalHub.termsOfServiceDesc', 'The rules and guidelines for using The Quantum Club platform.'),
          href: "/legal/terms",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: true,
          version: "v3.2",
        },
        {
          icon: <Scale className="w-5 h-5" />,
          title: t('legalHub.acceptableUse', 'Acceptable Use Policy'),
          description: t('legalHub.acceptableUseDesc', "What's allowed and prohibited when using our platform."),
          href: "/legal/acceptable-use",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: false,
          version: "v2.1",
        },
        {
          icon: <Gift className="w-5 h-5" />,
          title: t('legalHub.referralTerms', 'Referral Terms'),
          description: t('legalHub.referralTermsDesc', 'Terms and conditions for our referral rewards program.'),
          href: "/legal/referral-terms",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: false,
          version: "v1.4",
        },
        {
          icon: <AlertCircle className="w-5 h-5" />,
          title: t('legalHub.disclaimer', 'Disclaimer Policy'),
          description: t('legalHub.disclaimerDesc', 'Important limitations and disclaimers for platform use.'),
          href: "/legal/disclaimer",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 1, 2026'),
          downloadable: false,
          version: "v1.0",
        },
      ],
    },
    {
      title: t('legalHub.dataPrivacy', 'Data & Privacy'),
      description: t('legalHub.dataPrivacyDesc', 'How we handle, protect, and process your data'),
      icon: <Lock className="w-5 h-5" />,
      documents: [
        {
          icon: <Shield className="w-5 h-5" />,
          title: t('legalHub.privacyPolicy', 'Privacy Policy'),
          description: t('legalHub.privacyPolicyDesc', 'How we collect, use, and protect your personal information.'),
          href: "/legal/privacy",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: true,
          version: "v3.0",
        },
        {
          icon: <Cookie className="w-5 h-5" />,
          title: t('legalHub.cookiePolicy', 'Cookie Policy'),
          description: t('legalHub.cookiePolicyDesc', 'Information about the cookies we use and how to manage them.'),
          href: "/legal/cookies",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: true,
          version: "v2.3",
        },
        {
          icon: <Lock className="w-5 h-5" />,
          title: t('legalHub.securityPolicy', 'Security Policy'),
          description: t('legalHub.securityPolicyDesc', 'How we protect your data with enterprise-grade security.'),
          href: "/legal/security",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: false,
          version: "v2.5",
        },
        {
          icon: <Building2 className="w-5 h-5" />,
          title: t('legalHub.dpa', 'Data Processing Agreement'),
          description: t('legalHub.dpaDesc', 'GDPR-compliant DPA for partners processing personal data.'),
          href: "/legal/dpa",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: true,
          version: "v2.0",
        },
        {
          icon: <MapPin className="w-5 h-5" />,
          title: t('legalHub.ccpaNotice', 'CCPA Notice'),
          description: t('legalHub.ccpaNoticeDesc', 'California Consumer Privacy Act rights and disclosures.'),
          href: "/legal/ccpa",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 1, 2026'),
          downloadable: true,
          version: "v1.0",
        },
        {
          icon: <Server className="w-5 h-5" />,
          title: t('legalHub.thirdPartyRegistry', 'Third-Party Integrations Registry'),
          description: t('legalHub.thirdPartyRegistryDesc', 'Complete disclosure of all third-party services and sub-processors.'),
          href: "/legal/third-party",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 1, 2026'),
          downloadable: false,
          version: "v1.0",
        },
        {
          icon: <Globe className="w-5 h-5" />,
          title: t('legalHub.dataTransfers', 'Cross-Border Data Transfers'),
          description: t('legalHub.dataTransfersDesc', 'Post-Schrems II transfer mechanisms, impact assessments, and safeguards.'),
          href: "/legal/data-transfers",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 1, 2026'),
          downloadable: true,
          version: "v1.0",
        },
        {
          icon: <MapPin className="w-5 h-5" />,
          title: t('legalHub.lgpdNotice', 'LGPD Notice (Brazil)'),
          description: t('legalHub.lgpdNoticeDesc', 'Brazilian data protection rights under Lei Geral de Proteção de Dados.'),
          href: "/legal/lgpd",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: true,
          version: "v1.0",
        },
        {
          icon: <MapPin className="w-5 h-5" />,
          title: t('legalHub.popiaNotice', 'POPIA Notice (South Africa)'),
          description: t('legalHub.popiaNoticeDesc', 'South African data protection rights under the Protection of Personal Information Act.'),
          href: "/legal/popia",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: true,
          version: "v1.0",
        },
      ],
    },
    {
      title: t('legalHub.complianceEthics', 'Compliance & Ethics'),
      description: t('legalHub.complianceEthicsDesc', 'Our ethical commitments and regulatory compliance'),
      icon: <Heart className="w-5 h-5" />,
      documents: [
        {
          icon: <Accessibility className="w-5 h-5" />,
          title: t('legalHub.accessibility', 'Accessibility Statement'),
          description: t('legalHub.accessibilityDesc', 'Our commitment to making the platform accessible to everyone.'),
          href: "/legal/accessibility",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 28, 2026'),
          downloadable: false,
          version: "v1.2",
        },
        {
          icon: <Sparkles className="w-5 h-5" />,
          title: t('legalHub.aiTransparency', 'AI Transparency Policy'),
          description: t('legalHub.aiTransparencyDesc', 'Our commitment to transparent, ethical AI under the EU AI Act.'),
          href: "/legal/ai-transparency",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 1, 2026'),
          downloadable: true,
          version: "v1.0",
        },
        {
          icon: <Users className="w-5 h-5" />,
          title: t('legalHub.modernSlavery', 'Modern Slavery Statement'),
          description: t('legalHub.modernSlaveryDesc', 'Our commitment to ethical business practices and human rights.'),
          href: "/legal/modern-slavery",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 1, 2026'),
          downloadable: true,
          version: "v1.0",
        },
        {
          icon: <Flag className="w-5 h-5" />,
          title: t('legalHub.whistleblower', 'Whistleblower Policy'),
          description: t('legalHub.whistleblowerDesc', 'EU-compliant ethics reporting and whistleblower protection.'),
          href: "/legal/whistleblower",
          lastUpdated: t('legalHub.updatedMar2026', 'Updated Mar 1, 2026'),
          downloadable: false,
          version: "v1.0",
        },
      ],
    },
  ];

  const trustBadges = [
    { icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, label: t('legalHub.gdprCompliant', 'GDPR Compliant') },
    { icon: <Bot className="w-4 h-4 text-violet-500" />, label: t('legalHub.euAiActReady', 'EU AI Act Ready') },
    { icon: <BadgeCheck className="w-4 h-4 text-blue-500" />, label: t('legalHub.soc2', 'SOC 2 Type II (In Progress)') },
    { icon: <Shield className="w-4 h-4 text-amber-500" />, label: t('legalHub.iso27001', 'ISO 27001 (In Progress)') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t('legalHub.title', 'Legal Center')} | The Quantum Club</title>
        <meta name="description" content={t('legalHub.subtitle', 'Your rights and our commitments, clearly documented. We believe in transparency and want you to understand how we operate.')} />
      </Helmet>
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img
              src={quantumLogoDark}
              alt="Quantum Club"
              className="h-12 w-auto dark:hidden"
            />
            <img
              src={quantumLogoLight}
              alt="Quantum Club"
              className="h-12 w-auto hidden dark:block"
            />
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Hero with premium gradient background */}
      <div className="relative overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/2 w-[500px] h-64 bg-emerald-500/3 rounded-full blur-3xl" />
          {/* Subtle dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 pt-16 pb-12 max-w-6xl mx-auto">
          {/* Hero content */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6 ring-1 ring-primary/20">
              <Shield className="w-3.5 h-3.5" />
              {t('legalHub.badge', '17 Legal Documents')}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 tracking-tight">
              {t('legalHub.title', 'Legal Center')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('legalHub.subtitle', 'Your rights and our commitments, clearly documented. We believe in transparency and want you to understand how we operate.')}
            </p>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {trustBadges.map((badge) => (
              <TrustBadge key={badge.label} {...badge} />
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-6xl mx-auto">
        {/* Category Sections */}
        {categories.map((category, idx) => (
          <section key={category.title} className={idx > 0 ? 'mt-16' : ''}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {category.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  {category.title}
                </h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6 ml-[52px]">
              {category.description}
            </p>
            {/* Separator line */}
            <div className="h-px bg-gradient-to-r from-border via-border/60 to-transparent mb-6" />

            {/* Document grid */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {category.documents.map((doc) => (
                <LegalDocumentCard key={doc.href} {...doc} />
              ))}
            </div>
          </section>
        ))}

        {/* Additional Resources */}
        <div className="mt-20 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('legalHub.additionalResources', 'Additional Resources')}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t('legalHub.additionalResourcesDesc', 'Need more information or have a specific request?')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild variant="outline">
              <Link to="/legal/third-party">
                {t('legalHub.viewSubprocessors', 'View Third-Party Registry')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:info@thequantumclub.com">
                {t('legalHub.contactPrivacyTeam', 'Contact Privacy Team')}
              </a>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
            {/* Language note */}
            <div className="flex items-center gap-2 text-xs">
              <Globe className="w-3.5 h-3.5" />
              <span>{t('legalHub.languageNote', 'Legal documents available in 10 languages. Use the platform language selector to switch.')}</span>
            </div>

            {/* Legal review timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>{t('legalHub.lastReviewed', 'Last reviewed by legal team: March 2026')}</span>
            </div>

            <div className="h-px w-24 bg-border/50 my-2" />

            <p>{t('legalHub.copyright', '© {{year}} The Quantum Club B.V. \u2022 Pieter Cornelisz. Hooftstraat 41-2, 1071BM, Amsterdam, The Netherlands | KvK: 93498871', { year: new Date().getFullYear() })}</p>
            <p>
              {t('legalHub.questionsPrefix', 'Questions about our legal documents?')}{" "}
              <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">
                info@thequantumclub.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
