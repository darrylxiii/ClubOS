import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

interface GlobalFooterProps {
  variant?: "full" | "compact" | "minimal";
  className?: string;
}

const legalLinks = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Cookie Policy", href: "/legal/cookies" },
  { label: "Acceptable Use", href: "/legal/acceptable-use" },
  { label: "Security", href: "/legal/security" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Press", href: "/press" },
];

const supportLinks = [
  { label: "Help Center", href: "/help" },
  { label: "Contact", href: "mailto:support@thequantumclub.com" },
  { label: "Status", href: "https://status.thequantumclub.com", external: true },
];

export function GlobalFooter({ variant = "full", className }: GlobalFooterProps) {
  const currentYear = new Date().getFullYear();

  if (variant === "minimal") {
    return (
      <footer className={cn("border-t border-border/50 bg-background/95 backdrop-blur", className)}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {currentYear} The Quantum Club B.V.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/legal/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
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
                alt="Quantum Club" 
                className="h-8 w-auto dark:hidden"
              />
              <img 
                src={quantumLogoLight} 
                alt="Quantum Club" 
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
                All Legal
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
                alt="Quantum Club" 
                className="h-10 w-auto dark:hidden"
              />
              <img 
                src={quantumLogoLight} 
                alt="Quantum Club" 
                className="h-10 w-auto hidden dark:block"
              />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              The invite-only talent platform connecting exceptional professionals 
              with leading companies.
            </p>
            <p className="text-xs text-muted-foreground">
              Amsterdam, Netherlands
            </p>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              Legal
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
                  View All →
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              Company
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
              Support
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
              © {currentYear} The Quantum Club B.V. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/legal/accessibility" className="hover:text-foreground transition-colors">
                Accessibility
              </Link>
              <span>•</span>
              <Link to="/compliance/subprocessors" className="hover:text-foreground transition-colors">
                Subprocessors
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
