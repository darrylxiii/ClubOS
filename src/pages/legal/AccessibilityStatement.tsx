import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Accessibility, Check, AlertCircle, MessageSquare, Keyboard, Eye, Volume2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

export default function AccessibilityStatement() {
  const lastUpdated = "January 15, 2025";

  const sections = [
    { id: "commitment", title: "Our Commitment" },
    { id: "conformance", title: "Conformance Status" },
    { id: "features", title: "Accessibility Features" },
    { id: "known-limitations", title: "Known Limitations" },
    { id: "testing", title: "Testing & Evaluation" },
    { id: "feedback", title: "Feedback & Support" },
    { id: "enforcement", title: "Enforcement Procedure" },
    { id: "contact", title: "Contact Information" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/legal" className="flex items-center">
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

      <LegalPageLayout
        title="Accessibility Statement"
        lastUpdated={lastUpdated}
        sections={sections}
      >
        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Accessibility className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Accessibility for Everyone</h3>
                <p className="text-muted-foreground">
                  The Quantum Club is committed to ensuring digital accessibility for people with 
                  disabilities. We continually improve the user experience for everyone and apply 
                  relevant accessibility standards.
                </p>
              </div>
            </div>
          </Card>

          <LegalSection id="commitment" title="Our Commitment">
            <p>
              We believe that everyone deserves equal access to career opportunities. The Quantum Club 
              is committed to providing a website and platform that is accessible to the widest possible 
              audience, regardless of technology or ability.
            </p>
            <p className="mt-4">
              We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA and 
              comply with the EU Web Accessibility Directive (2016/2102) and the European Accessibility 
              Act (EAA).
            </p>
          </LegalSection>

          <LegalSection id="conformance" title="Conformance Status">
            <p>
              The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and 
              developers to improve accessibility for people with disabilities.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="p-4 border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <h4 className="font-semibold text-green-600 dark:text-green-400">WCAG 2.1 Level A</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fully conformant - Essential accessibility requirements met
                </p>
              </Card>
              <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400">WCAG 2.1 Level AA</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Partially conformant - Most requirements met, ongoing improvements
                </p>
              </Card>
            </div>
          </LegalSection>

          <LegalSection id="features" title="Accessibility Features">
            <p>We have implemented the following accessibility features:</p>
            
            <div className="mt-4 space-y-6">
              <div className="flex items-start gap-3">
                <Keyboard className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Keyboard Navigation</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>All interactive elements are keyboard accessible</li>
                    <li>Skip-to-main-content links on every page</li>
                    <li>Visible focus indicators throughout</li>
                    <li>Logical tab order following visual layout</li>
                    <li>Keyboard shortcuts for common actions</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Visual Accessibility</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Color contrast ratio of at least 4.5:1 for text</li>
                    <li>Dark mode support for reduced eye strain</li>
                    <li>Resizable text up to 200% without loss of functionality</li>
                    <li>No content that flashes more than 3 times per second</li>
                    <li>Motion preferences respected (reduced-motion support)</li>
                    <li>Clear visual hierarchy and consistent layouts</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Volume2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Screen Reader Support</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Semantic HTML structure throughout</li>
                    <li>ARIA labels and descriptions where needed</li>
                    <li>Alternative text for all meaningful images</li>
                    <li>Form labels properly associated with inputs</li>
                    <li>Error messages announced to screen readers</li>
                    <li>Live regions for dynamic content updates</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Content & Language</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Clear, simple language</li>
                    <li>Consistent navigation and page structure</li>
                    <li>Language attributes set correctly</li>
                    <li>Abbreviations and jargon explained</li>
                    <li>Multi-language support (English, Dutch)</li>
                  </ul>
                </div>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="known-limitations" title="Known Limitations">
            <p>
              Despite our best efforts, some content may not yet be fully accessible. We are actively 
              working to address these limitations:
            </p>
            <div className="mt-4 space-y-4">
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">Third-Party Content</h4>
                <p className="text-sm text-muted-foreground">
                  Some embedded content from third parties (e.g., calendar widgets, video calls) may 
                  not fully meet accessibility standards. We are working with vendors to improve this.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">Complex Data Visualizations</h4>
                <p className="text-sm text-muted-foreground">
                  Some charts and analytics dashboards may be challenging for screen reader users. 
                  We provide alternative text descriptions where possible.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">PDF Documents</h4>
                <p className="text-sm text-muted-foreground">
                  Some older PDF documents may not be fully accessible. We are working to make all 
                  downloadable documents accessible.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">Video Content</h4>
                <p className="text-sm text-muted-foreground">
                  Not all video content has captions. We are adding captions to all new video content 
                  and retroactively to existing videos.
                </p>
              </Card>
            </div>
          </LegalSection>

          <LegalSection id="testing" title="Testing & Evaluation">
            <p>
              We regularly test our platform for accessibility using:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>Automated Testing:</strong> axe-core, Lighthouse, WAVE</li>
              <li><strong>Manual Testing:</strong> Keyboard navigation, screen reader testing (NVDA, VoiceOver)</li>
              <li><strong>User Testing:</strong> Feedback from users with disabilities</li>
              <li><strong>Browser Testing:</strong> Chrome, Firefox, Safari, Edge</li>
              <li><strong>Device Testing:</strong> Desktop, tablet, mobile</li>
            </ul>
            <p className="mt-4">
              Our last comprehensive accessibility audit was conducted in December 2024.
            </p>
          </LegalSection>

          <LegalSection id="feedback" title="Feedback & Support">
            <p>
              We welcome your feedback on the accessibility of The Quantum Club. If you encounter 
              accessibility barriers, please let us know:
            </p>
            <div className="mt-4 space-y-4">
              <Card className="p-4 border-primary/30 bg-primary/5">
                <h4 className="font-semibold mb-2">Report an Accessibility Issue</h4>
                <p className="text-muted-foreground mb-3">
                  Email us at:{" "}
                  <a href="mailto:accessibility@thequantumclub.com" className="text-primary hover:underline">
                    accessibility@thequantumclub.com
                  </a>
                </p>
                <p className="text-sm text-muted-foreground">Please include:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>Description of the problem</li>
                  <li>URL of the page where you encountered the issue</li>
                  <li>Browser and assistive technology you're using</li>
                  <li>Screenshots if helpful</li>
                </ul>
              </Card>
              <div>
                <h4 className="font-semibold mb-2">Response Time</h4>
                <p className="text-muted-foreground">
                  We aim to respond to accessibility feedback within 5 business days and resolve 
                  issues as quickly as possible.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Alternative Formats</h4>
                <p className="text-muted-foreground">
                  If you need information in an alternative format (e.g., large print, audio, Braille), 
                  please contact us and we will do our best to accommodate your request.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="enforcement" title="Enforcement Procedure">
            <p>
              In accordance with the EU Web Accessibility Directive, you have the right to request 
              accessible content or to file a complaint if we do not adequately respond to your 
              feedback.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Step 1: Contact Us</h4>
                <p className="text-muted-foreground">
                  First, please contact us directly at{" "}
                  <a href="mailto:accessibility@thequantumclub.com" className="text-primary hover:underline">
                    accessibility@thequantumclub.com
                  </a>
                  . We will work to resolve your concern.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Step 2: Escalation</h4>
                <p className="text-muted-foreground">
                  If you are not satisfied with our response, you may escalate the complaint to 
                  the relevant national enforcement body in your EU member state.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Netherlands (Our Jurisdiction)</h4>
                <p className="text-muted-foreground">
                  In the Netherlands, complaints can be filed with the{" "}
                  <a 
                    href="https://www.digitoegankelijk.nl/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    Digital Accessibility
                  </a>{" "}
                  website maintained by Logius.
                </p>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="contact" title="Contact Information">
            <p>
              For accessibility-related inquiries:
            </p>
            <div className="mt-4 space-y-2">
              <p>
                <strong>Email:</strong>{" "}
                <a href="mailto:accessibility@thequantumclub.com" className="text-primary hover:underline">
                  accessibility@thequantumclub.com
                </a>
              </p>
              <p><strong>Address:</strong> The Quantum Club B.V., Amsterdam, Netherlands</p>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              This statement was last reviewed on {lastUpdated} and will be updated as we 
              continue to improve accessibility.
            </p>
          </LegalSection>
        </div>
      </LegalPageLayout>
    </div>
  );
}
