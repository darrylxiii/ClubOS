import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

interface GlobalFooterProps {
  variant?: "full" | "compact" | "minimal";
  className?: string;
}

export function GlobalFooter({ variant = "full", className }: GlobalFooterProps) {
  const { t } = useTranslation('common');
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { label: t("footer.terms_of_service", "Terms of Service"), href: "/legal/terms" },
    { label: t("footer.privacy_policy", "Privacy Policy"), href: "/legal/privacy" },
    { label: t("footer.cookie_policy", "Cookie Policy"), href: "/legal/cookies" },
    { label: t("footer.data_processing", "Data Processing"), href: "/legal/dpa" },
    { label: t("footer.ai_transparency", "AI Transparency"), href: "/legal/ai-transparency" },
    { label: t("footer.acceptable_use", "Acceptable Use"), href: "/legal/acceptable-use" },
  ];

  const secondaryLegalLinks = [
    { label: t("footer.ccpa_notice", "CCPA Notice"), href: "/legal/ccpa" },
    { label: t("footer.modern_slavery", "Modern Slavery"), href: "/legal/modern-slavery" },
    { label: t("footer.security", "Security"), href: "/legal/security" },
  ];

  const companyLinks = [
    { label: t("footer.about_us", "About Us"), href: "/about" },
    { label: t("footer.careers", "Careers"), href: "/careers" },
    { label: t("footer.press", "Press"), href: "/press" },
  ];

  const supportLinks = [
    { label: t("footer.help_center", "Help Center"), href: "/help" },
    { label: t("footer.contact", "Contact"), href: "mailto:info@thequantumclub.com" },
    { label: t("footer.status", "Status"), href: "https://status.thequantumclub.com", external: true },
  ];

  if (variant === "minimal") {
    return (
      <footer className={cn("border-t border-border/50 bg-background/95 backdrop-blur", className)}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {currentYear} The Quantum Club B.V.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/legal/terms" className="hover:text-foreground transition-colors">{t("terms", "Terms")}</Link>
              <Link to="/legal/privacy" className="hover:text-foreground transition-colors">{t("privacy", "Privacy")}</Link>
              <Link to="/legal/cookies" className="hover:text-foreground transition-colors">{t("cookies", "Cookies")}</Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  if (variant === "compact") {
    return (
      <footer className={cn("border-t border-border/50 bg-background/95 backdrop-blur", className)}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <img
                src={quantumLogoDark}
                alt={t("quantum_club", "Quantum Club")}
                className="h-8 w-auto dark:hidden"
              />
              <img
                src={quantumLogoLight}
                alt={t("quantum_club", "Quantum Club")}
                className="h-8 w-auto hidden dark:block"
              />
              <span className="text-sm text-muted-foreground">
                © {currentYear} The Quantum Club B.V.
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              {legalLinks.slice(0, 3).map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/legal"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                {t("footer.all_legal", "All Legal")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Full variant
  return (
    <footer className={cn("border-t border-border/50 bg-background", className)}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img
                src={quantumLogoDark}
                alt={t("quantum_club", "Quantum Club")}
                className="h-10 w-auto dark:hidden"
              />
              <img
                src={quantumLogoLight}
                alt={t("quantum_club", "Quantum Club")}
                className="h-10 w-auto hidden dark:block"
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              {t("footer.company_description", "The invite-only talent platform connecting exceptional professionals with leading companies.")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("footer.location", "Amsterdam, Netherlands")}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t("footer.compliance_badge", "GDPR Compliant \u2022 EU AI Act Ready")}
            </p>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              {t("footer.legal", "Legal")}
            </h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/legal"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  {t("footer.view_all", "View All \u2192")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              {t("footer.company", "Company")}
            </h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              {t("footer.support", "Support")}
            </h3>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : link.href.startsWith("mailto:") ? (
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {currentYear} The Quantum Club B.V. {t("footer.all_rights_reserved", "All rights reserved.")}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/legal/accessibility" className="hover:text-foreground transition-colors">
                {t("footer.accessibility", "Accessibility")}
              </Link>
              <span>•</span>
              <Link to="/compliance/subprocessors" className="hover:text-foreground transition-colors">
                {t("footer.subprocessors", "Subprocessors")}
              </Link>
            </div>
          </div>
          {/* Secondary legal links row */}
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-muted-foreground">
            {secondaryLegalLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
