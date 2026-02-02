import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Server, Eye, AlertTriangle, Mail, Key, Database, Globe } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

export default function SecurityPolicy() {
  const lastUpdated = "January 15, 2025";

  const sections = [
    { id: "commitment", title: "Our Commitment" },
    { id: "infrastructure", title: "Infrastructure Security" },
    { id: "data-protection", title: "Data Protection" },
    { id: "access-control", title: "Access Control" },
    { id: "encryption", title: "Encryption" },
    { id: "monitoring", title: "Monitoring & Logging" },
    { id: "incident-response", title: "Incident Response" },
    { id: "responsible-disclosure", title: "Responsible Disclosure" },
    { id: "certifications", title: "Certifications & Compliance" },
    { id: "contact", title: "Contact Security Team" },
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
        title="Security Policy"
        lastUpdated={lastUpdated}
        sections={sections}
      >
        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Enterprise-Grade Security</h3>
                <p className="text-muted-foreground">
                  At The Quantum Club, security is foundational. We implement enterprise-grade 
                  security measures to protect your data and maintain the trust you place in us.
                </p>
              </div>
            </div>
          </Card>

          <LegalSection id="commitment" title="Our Commitment">
            <p>
              We are committed to protecting the confidentiality, integrity, and availability of 
              all data entrusted to us. Our security program is designed around the following principles:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>Defense in Depth:</strong> Multiple layers of security controls</li>
              <li><strong>Least Privilege:</strong> Access only to what's necessary</li>
              <li><strong>Security by Design:</strong> Built into every feature from the start</li>
              <li><strong>Continuous Improvement:</strong> Regular security assessments and updates</li>
              <li><strong>Transparency:</strong> Open communication about our security practices</li>
            </ul>
          </LegalSection>

          <LegalSection id="infrastructure" title="Infrastructure Security">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Server className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Cloud Infrastructure</h4>
                  <p className="text-muted-foreground">
                    Our platform runs on Supabase, built on top of AWS infrastructure, with servers 
                    located in EU data centers (Frankfurt) to ensure GDPR compliance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Network Security</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>All traffic encrypted via TLS 1.3</li>
                    <li>Web Application Firewall (WAF) protection</li>
                    <li>DDoS mitigation through Cloudflare</li>
                    <li>Regular vulnerability scanning</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Database Security</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>PostgreSQL with Row-Level Security (RLS)</li>
                    <li>Automatic backups with point-in-time recovery</li>
                    <li>Encrypted connections required</li>
                    <li>Isolated tenant data</li>
                  </ul>
                </div>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="data-protection" title="Data Protection">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 border-border/50">
                <Lock className="w-5 h-5 text-primary mb-2" />
                <h4 className="font-semibold mb-1">Data at Rest</h4>
                <p className="text-sm text-muted-foreground">
                  All stored data is encrypted using AES-256 encryption. Database backups are 
                  encrypted and stored securely.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <Key className="w-5 h-5 text-primary mb-2" />
                <h4 className="font-semibold mb-1">Data in Transit</h4>
                <p className="text-sm text-muted-foreground">
                  All data transmitted between clients and servers uses TLS 1.3 encryption. 
                  HSTS is enforced.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <Eye className="w-5 h-5 text-primary mb-2" />
                <h4 className="font-semibold mb-1">Data Minimization</h4>
                <p className="text-sm text-muted-foreground">
                  We only collect data necessary for service delivery. Sensitive data is masked 
                  in logs and analytics.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <Database className="w-5 h-5 text-primary mb-2" />
                <h4 className="font-semibold mb-1">Data Retention</h4>
                <p className="text-sm text-muted-foreground">
                  Data is retained only as long as necessary. Users can request deletion at any time.
                </p>
              </Card>
            </div>
          </LegalSection>

          <LegalSection id="access-control" title="Access Control">
            <p>
              We implement strict access controls to ensure only authorized personnel can access 
              sensitive systems and data:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>Role-Based Access Control (RBAC):</strong> Users only access what they need</li>
              <li><strong>Row-Level Security (RLS):</strong> Database-enforced data isolation</li>
              <li><strong>Multi-Factor Authentication:</strong> Required for all admin access</li>
              <li><strong>Session Management:</strong> Automatic timeout and secure token handling</li>
              <li><strong>IP Whitelisting:</strong> Restricted access for sensitive operations</li>
              <li><strong>Audit Logging:</strong> All access attempts are logged and monitored</li>
            </ul>
            <p className="mt-4">
              For users, we offer optional 2FA/MFA and provide tools to manage your own data 
              visibility through our privacy settings.
            </p>
          </LegalSection>

          <LegalSection id="encryption" title="Encryption">
            <div className="space-y-4">
              <p>
                We use industry-standard encryption throughout our platform:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Purpose</th>
                      <th className="px-4 py-3 text-left font-semibold">Algorithm</th>
                      <th className="px-4 py-3 text-left font-semibold">Key Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-4 py-3">Data at Rest</td>
                      <td className="px-4 py-3">AES-256-GCM</td>
                      <td className="px-4 py-3">256-bit</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Data in Transit</td>
                      <td className="px-4 py-3">TLS 1.3</td>
                      <td className="px-4 py-3">256-bit</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Password Hashing</td>
                      <td className="px-4 py-3">bcrypt</td>
                      <td className="px-4 py-3">Cost factor 12</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">API Authentication</td>
                      <td className="px-4 py-3">JWT with RSA</td>
                      <td className="px-4 py-3">RS256</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="monitoring" title="Monitoring & Logging">
            <p>
              We maintain comprehensive monitoring to detect and respond to security events:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>Real-time Monitoring:</strong> 24/7 system and application monitoring</li>
              <li><strong>Security Alerts:</strong> Automated alerts for suspicious activities</li>
              <li><strong>Audit Logs:</strong> Comprehensive logs of all security-relevant events</li>
              <li><strong>Error Tracking:</strong> Sentry for real-time error monitoring</li>
              <li><strong>Performance Monitoring:</strong> Proactive identification of issues</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Logs are retained for security analysis and are protected from tampering.
            </p>
          </LegalSection>

          <LegalSection id="incident-response" title="Incident Response">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
              <p>
                We have a formal incident response plan to handle security events:
              </p>
            </div>
            <div className="space-y-4">
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">Detection & Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Security events are detected through monitoring systems and analyzed by our 
                  security team to assess scope and impact.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">Containment & Eradication</h4>
                <p className="text-sm text-muted-foreground">
                  Affected systems are isolated to prevent spread. The root cause is identified 
                  and eliminated.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">Notification</h4>
                <p className="text-sm text-muted-foreground">
                  Per GDPR, we notify affected users and authorities within 72 hours of a 
                  confirmed data breach.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">Recovery & Learning</h4>
                <p className="text-sm text-muted-foreground">
                  Systems are restored and we conduct post-incident reviews to improve our 
                  security posture.
                </p>
              </Card>
            </div>
          </LegalSection>

          <LegalSection id="responsible-disclosure" title="Responsible Disclosure">
            <p>
              We value the security research community and encourage responsible disclosure of 
              vulnerabilities. If you discover a security issue, please report it responsibly.
            </p>
            <div className="mt-4 space-y-4">
              <Card className="p-4 border-primary/30 bg-primary/5">
                <h4 className="font-semibold mb-2">How to Report</h4>
                <p className="text-muted-foreground mb-3">
                  Email security vulnerabilities to:{" "}
                  <a href="mailto:security@thequantumclub.com" className="text-primary hover:underline font-mono">
                    security@thequantumclub.com
                  </a>
                </p>
                <p className="text-sm text-muted-foreground">
                  Use our PGP key for encrypted communication if needed (available upon request).
                </p>
              </Card>
              <div>
                <h4 className="font-semibold mb-2">What to Include</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Description of the vulnerability</li>
                  <li>Steps to reproduce</li>
                  <li>Potential impact</li>
                  <li>Suggested remediation (if any)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Our Commitment</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Acknowledge receipt within 24 hours</li>
                  <li>Provide regular updates on remediation</li>
                  <li>Credit researchers who report valid vulnerabilities (with permission)</li>
                  <li>No legal action against good-faith security research</li>
                </ul>
              </div>
            </div>
          </LegalSection>

          <LegalSection id="certifications" title="Certifications & Compliance">
            <p>
              We adhere to industry standards and are working toward formal certifications:
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card className="p-4 border-green-500/30 bg-green-500/5">
                <h4 className="font-semibold text-green-600 dark:text-green-400">GDPR Compliant</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Full compliance with EU General Data Protection Regulation
                </p>
              </Card>
              <Card className="p-4 border-blue-500/30 bg-blue-500/5">
                <h4 className="font-semibold text-blue-600 dark:text-blue-400">ePrivacy Directive</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Cookie consent and electronic communication compliance
                </p>
              </Card>
              <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                <h4 className="font-semibold text-amber-600 dark:text-amber-400">SOC 2 Type II</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  In progress - Expected Q2 2025
                </p>
              </Card>
              <Card className="p-4 border-purple-500/30 bg-purple-500/5">
                <h4 className="font-semibold text-purple-600 dark:text-purple-400">ISO 27001</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Planned - Expected Q4 2025
                </p>
              </Card>
            </div>
          </LegalSection>

          <LegalSection id="contact" title="Contact Security Team">
            <div className="flex items-start gap-3 mb-4">
              <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <p>
                For security-related inquiries, please contact our security team:
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <p><strong>Security Issues:</strong> <a href="mailto:security@thequantumclub.com" className="text-primary hover:underline">security@thequantumclub.com</a></p>
              <p><strong>Privacy Inquiries:</strong> <a href="mailto:privacy@thequantumclub.com" className="text-primary hover:underline">privacy@thequantumclub.com</a></p>
              <p><strong>Data Protection Officer:</strong> <a href="mailto:dpo@thequantumclub.com" className="text-primary hover:underline">dpo@thequantumclub.com</a></p>
            </div>
          </LegalSection>
        </div>
      </LegalPageLayout>
    </div>
  );
}
