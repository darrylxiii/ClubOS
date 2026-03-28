import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cookie, Settings, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

export default function CookiePolicy() {
  const { t } = useTranslation('common');
  const lastUpdated = "March 28, 2026";

  const sections = [
    { id: "introduction", title: "Introduction" },
    { id: "what-are-cookies", title: "What Are Cookies?" },
    { id: "types-of-cookies", title: "Types of Cookies We Use" },
    { id: "essential-cookies", title: "Essential Cookies" },
    { id: "functional-cookies", title: "Functional Cookies" },
    { id: "analytics-cookies", title: "Analytics Cookies" },
    { id: "third-party", title: "Third-Party Cookies" },
    { id: "managing-cookies", title: "Managing Your Cookies" },
    { id: "cookie-list", title: "Cookie List" },
    { id: "updates", title: "Updates to This Policy" },
    { id: "contact", title: "Contact Us" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/legal" className="flex items-center">
            <img 
              src={quantumLogoDark} 
              alt={"Quantum Club"} 
              className="h-12 w-auto dark:hidden"
            />
            <img 
              src={quantumLogoLight} 
              alt={"Quantum Club"} 
              className="h-12 w-auto hidden dark:block"
            />
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <Helmet>
        <title>{t('legalPages.cookiePolicy', 'Cookie Policy')} | The Quantum Club</title>
        <meta name="description" content={t('legalPages.cookiePolicyDesc', 'Legal documentation for The Quantum Club recruitment platform.')} />
      </Helmet>
      <LegalPageLayout
        title={t('legalPages.cookiePolicy', 'Cookie Policy')}
        lastUpdated={lastUpdated}
        sections={sections}
      >
        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Cookie className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">{"About Cookies"}</h3>
                <p className="text-muted-foreground">
                  This Cookie Policy explains how The Quantum Club B.V. uses cookies and similar 
                  technologies when you visit our platform. We respect your privacy and give you 
                  control over your cookie preferences.
                </p>
              </div>
            </div>
          </Card>

          <LegalSection id="introduction" title={"Introduction"}>
            <p>
              The Quantum Club ("we", "us", "our") uses cookies and similar tracking technologies 
              to provide, improve, and secure our platform. This policy explains what cookies are, 
              how we use them, and your choices regarding their use.
            </p>
            <p className="mt-4">
              By using our platform with cookie consent enabled, you agree to the use of cookies 
              as described in this policy. You can withdraw or modify your consent at any time 
              through our cookie preference center.
            </p>
          </LegalSection>

          <LegalSection id="what-are-cookies" title={"What Are Cookies?"}>
            <p>
              Cookies are small text files that are stored on your device (computer, tablet, or 
              mobile phone) when you visit a website. They are widely used to make websites work 
              more efficiently, provide a better user experience, and give site owners useful 
              analytics information.
            </p>
            <div className="mt-4 space-y-3">
              <p><strong>{"Session Cookies:"}</strong>{"Temporary cookies that expire when you close your browser."}</p>
              <p><strong>{"Persistent Cookies:"}</strong>{"Cookies that remain on your device for a set period or until you delete them."}</p>
              <p><strong>{"First-Party Cookies:"}</strong>{"Set by the website you're visiting (thequantumclub.com)."}</p>
              <p><strong>{"Third-Party Cookies:"}</strong>{"Set by other domains, typically for analytics or integrations."}</p>
            </div>
          </LegalSection>

          <LegalSection id="types-of-cookies" title={"Types of Cookies We Use"}>
            <p>{"We categorize our cookies into four main types:"}</p>
            <div className="mt-4 grid gap-4">
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold text-green-600 dark:text-green-400">{"Essential (Strictly Necessary)"}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Required for the platform to function. Cannot be disabled.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold text-blue-600 dark:text-blue-400">{"Functional"}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Enable enhanced features like language preferences and theme settings.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold text-amber-600 dark:text-amber-400">{"Analytics"}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Help us understand how visitors use our platform to improve it.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold text-purple-600 dark:text-purple-400">{"Marketing (Not Used)"}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  We do not use advertising or marketing cookies.
                </p>
              </Card>
            </div>
          </LegalSection>

          <LegalSection id="essential-cookies" title={"Essential Cookies"}>
            <p>
              These cookies are strictly necessary for the platform to function properly. 
              They enable core features like authentication, security, and session management.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>{"Authentication:"}</strong>{"Keep you logged in securely"}</li>
              <li><strong>{"Session Management:"}</strong>{"Maintain your session state"}</li>
              <li><strong>{"Security:"}</strong>{"Protect against CSRF and other attacks"}</li>
              <li><strong>{"Cookie Consent:"}</strong>{"Remember your cookie preferences"}</li>
              <li><strong>{"Load Balancing:"}</strong>{"Ensure consistent server routing"}</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              <strong>{"Note:"}</strong> Essential cookies cannot be disabled as they are required 
              for the platform to work correctly.
            </p>
          </LegalSection>

          <LegalSection id="functional-cookies" title={"Functional Cookies"}>
            <p>
              Functional cookies enable enhanced features and personalization. While not strictly 
              necessary, they improve your experience.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>{"Language Preference:"}</strong>{"Remember your preferred language (EN/NL)"}</li>
              <li><strong>{"Theme Setting:"}</strong>{"Remember dark/light mode preference"}</li>
              <li><strong>{"Sidebar State:"}</strong>{"Remember collapsed/expanded sidebar"}</li>
              <li><strong>{"Form Data:"}</strong>{"Preserve form progress during onboarding"}</li>
              <li><strong>{"Notification Settings:"}</strong>{"Remember notification preferences"}</li>
            </ul>
          </LegalSection>

          <LegalSection id="analytics-cookies" title={"Analytics Cookies"}>
            <p>
              We use analytics cookies to understand how visitors interact with our platform. 
              This helps us improve the user experience and identify issues.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{"PostHog (Self-Hosted Analytics)"}</h4>
                <p className="text-muted-foreground text-sm">
                  We use PostHog for product analytics. Data is processed in accordance with GDPR.
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground text-sm">
                  <li>{"Page views and navigation patterns"}</li>
                  <li>{"Feature usage and engagement"}</li>
                  <li>{"Error tracking and performance metrics"}</li>
                  <li>{"Session recordings (with consent)"}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">{"Sentry (Error Monitoring)"}</h4>
                <p className="text-muted-foreground text-sm">
                  We use Sentry to track and fix errors. No personal data is stored beyond error context.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="third-party" title={"Third-Party Cookies"}>
            <p>
              We integrate with certain third-party services that may set their own cookies:
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{"Supabase (Authentication & Database)"}</h4>
                <p className="text-muted-foreground text-sm">
                  Session management and authentication tokens.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">{"Google (OAuth & Calendar)"}</h4>
                <p className="text-muted-foreground text-sm">
                  If you use Google Sign-In or connect Google Calendar. Subject to Google's Privacy Policy.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">{"Microsoft (OAuth & Calendar)"}</h4>
                <p className="text-muted-foreground text-sm">
                  If you connect Microsoft/Outlook Calendar. Subject to Microsoft's Privacy Policy.
                </p>
              </div>
            </div>
            <p className="mt-4 font-semibold text-sm">
              We do NOT use advertising cookies, social media tracking pixels, or third-party 
              marketing trackers.
            </p>
          </LegalSection>

          <LegalSection id="managing-cookies" title={"Managing Your Cookies"}>
            <p>
              You have several options for managing cookies:
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{"Cookie Preference Center"}</h4>
                <p className="text-muted-foreground text-sm">
                  Use our cookie banner to manage your preferences. You can access it anytime 
                  from the footer or by clearing your browser cookies.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Cookie Preferences
                </Button>
              </div>
              <div>
                <h4 className="font-semibold mb-2">{"Browser Settings"}</h4>
                <p className="text-muted-foreground text-sm">
                  Most browsers allow you to block or delete cookies through their settings. 
                  Note that blocking all cookies may affect platform functionality.
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground text-sm">
                  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener" className="text-primary hover:underline">{"Chrome Cookie Settings"}</a></li>
                  <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener" className="text-primary hover:underline">{"Firefox Cookie Settings"}</a></li>
                  <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener" className="text-primary hover:underline">{"Safari Cookie Settings"}</a></li>
                  <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener" className="text-primary hover:underline">{"Edge Cookie Settings"}</a></li>
                </ul>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="cookie-list" title={t('legalPages.cookieList', 'Cookie List')}>
            <p className="mb-4">
              {t('legalPages.cookieListDescription', 'The following table lists the specific cookies and similar technologies used on our platform, organized by category:')}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/70 border-b border-border">
                    <th className="px-4 py-3 text-left font-semibold">{t('legalPages.cookieName', 'Cookie Name')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('legalPages.category', 'Category')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('legalPages.provider', 'Provider')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('legalPages.purpose', 'Purpose')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('legalPages.duration', 'Duration')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="bg-background">
                    <td className="px-4 py-3 font-mono text-xs">{"sb-*-auth-token"}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                        {t('legalPages.necessary', 'Necessary')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{"Supabase"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.authSessionPurpose', 'Authentication session')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.session', 'Session')}</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{"i18nextLng"}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                        {t('legalPages.necessary', 'Necessary')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{"i18next"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.langPrefPurpose', 'Language preference')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.oneYear', '1 year')}</td>
                  </tr>
                  <tr className="bg-background">
                    <td className="px-4 py-3 font-mono text-xs">{"theme"}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                        {t('legalPages.functional', 'Functional')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{"ClubOS"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.themePurpose', 'Dark/light mode preference')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.oneYear', '1 year')}</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{"cookie_consent"}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                        {t('legalPages.necessary', 'Necessary')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{"ClubOS"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.consentPurpose', 'Cookie consent preferences')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.twelveMonths', '12 months')}</td>
                  </tr>
                  <tr className="bg-background">
                    <td className="px-4 py-3 font-mono text-xs">{"ph_*"}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                        {t('legalPages.analyticsLabel', 'Analytics')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{"PostHog"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.posthogPurpose', 'Product analytics and usage')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.oneYear', '1 year')}</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{"_ga, _gid"}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                        {t('legalPages.analyticsLabel', 'Analytics')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{"Google"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.gaPurpose', 'Google Analytics tracking')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.gaDuration', '2 years / 24h')}</td>
                  </tr>
                  <tr className="bg-background">
                    <td className="px-4 py-3 font-mono text-xs">{"__stripe_mid"}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                        {t('legalPages.functional', 'Functional')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{"Stripe"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.stripePurpose', 'Payment fraud prevention')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.oneYear', '1 year')}</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{"li_*"}</td>
                    <td className="px-4 py-3">
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30">
                        {t('legalPages.marketingLabel', 'Marketing')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{"LinkedIn"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.linkedinPurpose', 'LinkedIn tracking pixel')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t('legalPages.thirtyDays', '30 days')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Card className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {t('legalPages.cookieManageNote', 'To manage your cookie preferences at any time, visit Settings > Privacy > Manage Cookies or click the cookie icon in the footer.')}
                </p>
              </div>
            </Card>
          </LegalSection>

          <LegalSection id="updates" title={"Updates to This Policy"}>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our 
              practices or for legal, regulatory, or operational reasons.
            </p>
            <p className="mt-4">
              We will notify you of significant changes by displaying a notice on our platform 
              or by updating the "Last Updated" date at the top of this policy.
            </p>
          </LegalSection>

          <LegalSection id="contact" title={"Contact Us"}>
            <p>
              If you have questions about our use of cookies, please contact us:
            </p>
            <div className="mt-4 space-y-2">
              <p><strong>{"Email:"}</strong> <a href="mailto:info@thequantumclub.com" className="text-primary hover:underline">{"info@thequantumclub.com"}</a></p>
              <p><strong>{"Address:"}</strong>{"The Quantum Club B.V., Pieter Cornelisz. Hooftstraat 41-2, 1071BM, Amsterdam, The Netherlands"}</p>
            </div>
          </LegalSection>
        </div>
      </LegalPageLayout>
    </div>
  );
}
