import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Download
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
}

const LegalDocumentCard = ({ 
  icon, 
  title, 
  description, 
  href, 
  lastUpdated,
  downloadable 
}: LegalDocumentCardProps) => (
  <Card className="p-6 hover:shadow-lg transition-all duration-300 hover:border-primary/30 group">
    <div className="flex items-start gap-4">
      <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {description}
        </p>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground/70 mb-3">
            Last updated: {lastUpdated}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={href}>
              Read
              <ExternalLink className="w-3 h-3 ml-1" />
            </Link>
          </Button>
          {downloadable && (
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  </Card>
);

export default function LegalHub() {
  const documents = [
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Terms of Service",
      description: "The rules and guidelines for using The Quantum Club platform.",
      href: "/legal/terms",
      lastUpdated: "January 15, 2025",
      downloadable: true,
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Privacy Policy",
      description: "How we collect, use, and protect your personal information.",
      href: "/legal/privacy",
      lastUpdated: "January 15, 2025",
      downloadable: true,
    },
    {
      icon: <Cookie className="w-5 h-5" />,
      title: "Cookie Policy",
      description: "Information about the cookies we use and how to manage them.",
      href: "/legal/cookies",
      lastUpdated: "January 15, 2025",
      downloadable: true,
    },
    {
      icon: <Scale className="w-5 h-5" />,
      title: "Acceptable Use Policy",
      description: "What's allowed and prohibited when using our platform.",
      href: "/legal/acceptable-use",
      lastUpdated: "January 15, 2025",
      downloadable: false,
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "Security Policy",
      description: "How we protect your data with enterprise-grade security.",
      href: "/legal/security",
      lastUpdated: "January 15, 2025",
      downloadable: false,
    },
    {
      icon: <Building2 className="w-5 h-5" />,
      title: "Data Processing Agreement",
      description: "GDPR-compliant DPA for partners processing personal data.",
      href: "/legal/dpa",
      lastUpdated: "January 15, 2025",
      downloadable: true,
    },
    {
      icon: <Gift className="w-5 h-5" />,
      title: "Referral Terms",
      description: "Terms and conditions for our referral rewards program.",
      href: "/legal/referral-terms",
      lastUpdated: "January 15, 2025",
      downloadable: false,
    },
    {
      icon: <Accessibility className="w-5 h-5" />,
      title: "Accessibility Statement",
      description: "Our commitment to making the platform accessible to everyone.",
      href: "/legal/accessibility",
      lastUpdated: "January 15, 2025",
      downloadable: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
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

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Legal Center
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your rights and our commitments, clearly documented. We believe in transparency 
            and want you to understand how we operate.
          </p>
        </div>

        {/* Document Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <LegalDocumentCard key={doc.href} {...doc} />
          ))}
        </div>

        {/* Additional Resources */}
        <div className="mt-12 text-center">
          <h2 className="text-xl font-semibold mb-4">Additional Resources</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild variant="outline">
              <Link to="/compliance/subprocessors">
                View Subprocessors
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:privacy@thequantumclub.com">
                Contact Privacy Team
              </a>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} The Quantum Club B.V. • Amsterdam, Netherlands</p>
          <p className="mt-2">
            Questions about our legal documents?{" "}
            <a href="mailto:legal@thequantumclub.com" className="text-primary hover:underline">
              legal@thequantumclub.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
