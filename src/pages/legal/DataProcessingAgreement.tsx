import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Download, FileText, Shield, Users, Clock, AlertTriangle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

export default function DataProcessingAgreement() {
  const lastUpdated = "January 15, 2025";

  const sections = [
    { id: "introduction", title: "Introduction" },
    { id: "definitions", title: "Definitions" },
    { id: "scope", title: "Scope of Processing" },
    { id: "data-categories", title: "Data Categories" },
    { id: "obligations", title: "Processor Obligations" },
    { id: "sub-processors", title: "Sub-Processors" },
    { id: "security", title: "Security Measures" },
    { id: "data-subject-rights", title: "Data Subject Rights" },
    { id: "breach-notification", title: "Breach Notification" },
    { id: "audits", title: "Audit Rights" },
    { id: "international-transfers", title: "International Transfers" },
    { id: "termination", title: "Term & Termination" },
    { id: "contact", title: "Contact" },
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
        title="Data Processing Agreement"
        lastUpdated={lastUpdated}
        sections={sections}
      >
        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <Building2 className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">GDPR Data Processing Agreement</h3>
                <p className="text-muted-foreground">
                  This Data Processing Agreement ("DPA") governs the processing of personal data by 
                  The Quantum Club B.V. on behalf of Partner companies using our platform. This DPA 
                  is incorporated into the Master Service Agreement between the parties.
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF Version
                </Button>
              </div>
            </div>
          </Card>

          <LegalSection id="introduction" title="Introduction">
            <p>
              This Data Processing Agreement ("DPA") is entered into between:
            </p>
            <div className="mt-4 space-y-4">
              <Card className="p-4 border-border/50">
                <p className="font-semibold">Data Controller ("Controller")</p>
                <p className="text-muted-foreground">
                  The Partner company using The Quantum Club platform for recruitment services.
                </p>
              </Card>
              <Card className="p-4 border-border/50">
                <p className="font-semibold">Data Processor ("Processor")</p>
                <p className="text-muted-foreground">
                  The Quantum Club B.V., a company registered in the Netherlands, with registered 
                  office in Amsterdam ("TQC").
                </p>
              </Card>
            </div>
            <p className="mt-4">
              This DPA supplements and forms part of the Master Service Agreement ("MSA") between 
              Controller and Processor and governs the processing of personal data by Processor on 
              behalf of Controller.
            </p>
          </LegalSection>

          <LegalSection id="definitions" title="Definitions">
            <div className="space-y-3">
              <p><strong>"Personal Data":</strong> Any information relating to an identified or identifiable natural person, as defined in Article 4(1) of GDPR.</p>
              <p><strong>"Processing":</strong> Any operation performed on Personal Data, including collection, storage, use, disclosure, or deletion.</p>
              <p><strong>"Data Subject":</strong> An identified or identifiable natural person whose Personal Data is processed.</p>
              <p><strong>"Sub-Processor":</strong> Any third party engaged by Processor to process Personal Data on behalf of Controller.</p>
              <p><strong>"GDPR":</strong> Regulation (EU) 2016/679 (General Data Protection Regulation).</p>
              <p><strong>"SCCs":</strong> EU Standard Contractual Clauses for international data transfers.</p>
              <p><strong>"Personal Data Breach":</strong> A breach of security leading to accidental or unlawful destruction, loss, alteration, or unauthorized disclosure of Personal Data.</p>
            </div>
          </LegalSection>

          <LegalSection id="scope" title="Scope of Processing">
            <div className="flex items-start gap-3 mb-4">
              <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <p>
                Processor shall process Personal Data only for the following purposes:
              </p>
            </div>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Providing recruitment and talent matching services</li>
              <li>Creating and managing candidate profiles and dossiers</li>
              <li>Facilitating communication between Controller and candidates</li>
              <li>Scheduling interviews and managing hiring workflows</li>
              <li>Analytics and reporting on hiring activities</li>
              <li>Maintaining the platform and providing technical support</li>
            </ul>
            <p className="mt-4">
              Processor shall not process Personal Data for any other purpose unless instructed 
              in writing by Controller or required by applicable law.
            </p>
          </LegalSection>

          <LegalSection id="data-categories" title="Data Categories">
            <p>The following categories of Personal Data may be processed:</p>
            
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Candidate Data</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Identification data (name, email, phone)</li>
                    <li>Professional data (CV, work history, education, skills)</li>
                    <li>Compensation data (current/expected salary, when consented)</li>
                    <li>Communication data (messages, interview notes)</li>
                    <li>Preference data (job preferences, location preferences)</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Controller Personnel Data</h4>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li>Account information (name, email, role)</li>
                    <li>Activity logs (login, actions taken)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Card className="mt-4 p-4 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">Special Categories of Data</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Processor does not intentionally collect special categories of personal data 
                    (e.g., health, religion, political opinions) unless explicitly required and 
                    properly consented for specific roles (e.g., security clearance verification).
                  </p>
                </div>
              </div>
            </Card>
          </LegalSection>

          <LegalSection id="obligations" title="Processor Obligations">
            <p>Processor agrees to:</p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Process Personal Data only on documented instructions from Controller</li>
              <li>Ensure personnel processing data are bound by confidentiality obligations</li>
              <li>Implement appropriate technical and organizational security measures</li>
              <li>Assist Controller in fulfilling data subject rights requests</li>
              <li>Assist Controller with data protection impact assessments when required</li>
              <li>Delete or return Personal Data upon termination (at Controller's choice)</li>
              <li>Make available all information necessary to demonstrate compliance</li>
              <li>Notify Controller of any legally binding requests for disclosure (unless prohibited)</li>
            </ul>
          </LegalSection>

          <LegalSection id="sub-processors" title="Sub-Processors">
            <p>
              Processor uses the following categories of Sub-Processors to deliver services:
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Category</th>
                    <th className="px-4 py-3 text-left font-semibold">Purpose</th>
                    <th className="px-4 py-3 text-left font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3">Cloud Infrastructure</td>
                    <td className="px-4 py-3 text-muted-foreground">Hosting, database, storage</td>
                    <td className="px-4 py-3">EU (Frankfurt)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Email Services</td>
                    <td className="px-4 py-3 text-muted-foreground">Transactional emails</td>
                    <td className="px-4 py-3">EU</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">AI Services</td>
                    <td className="px-4 py-3 text-muted-foreground">Matching, parsing</td>
                    <td className="px-4 py-3">EU/US (with SCCs)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Analytics</td>
                    <td className="px-4 py-3 text-muted-foreground">Platform usage analytics</td>
                    <td className="px-4 py-3">EU</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-muted-foreground">
              A complete list of Sub-Processors is available at{" "}
              <Link to="/compliance/subprocessors" className="text-primary hover:underline">
                /compliance/subprocessors
              </Link>
            </p>
            <p className="mt-2 text-muted-foreground">
              Controller hereby grants general authorization to engage Sub-Processors, provided 
              Processor notifies Controller of changes and allows objection within 30 days.
            </p>
          </LegalSection>

          <LegalSection id="security" title="Security Measures">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <p>
                Processor implements appropriate technical and organizational measures including:
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">Technical Measures</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  <li>Encryption at rest (AES-256)</li>
                  <li>Encryption in transit (TLS 1.3)</li>
                  <li>Access controls and authentication</li>
                  <li>Regular security testing</li>
                  <li>Automated backups</li>
                </ul>
              </Card>
              <Card className="p-4 border-border/50">
                <h4 className="font-semibold mb-2">Organizational Measures</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                  <li>Employee confidentiality obligations</li>
                  <li>Security awareness training</li>
                  <li>Access on need-to-know basis</li>
                  <li>Incident response procedures</li>
                  <li>Regular security reviews</li>
                </ul>
              </Card>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Full details of security measures are available in our{" "}
              <Link to="/legal/security" className="text-primary hover:underline">Security Policy</Link>.
            </p>
          </LegalSection>

          <LegalSection id="data-subject-rights" title="Data Subject Rights">
            <p>
              Processor shall assist Controller in responding to Data Subject requests including:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li><strong>Access:</strong> Providing copies of Personal Data</li>
              <li><strong>Rectification:</strong> Correcting inaccurate data</li>
              <li><strong>Erasure:</strong> Deleting data ("right to be forgotten")</li>
              <li><strong>Restriction:</strong> Limiting processing in certain circumstances</li>
              <li><strong>Portability:</strong> Providing data in machine-readable format</li>
              <li><strong>Objection:</strong> Facilitating objections to processing</li>
            </ul>
            <p className="mt-4">
              Processor shall respond to Controller requests within 10 business days. Additional 
              charges may apply for excessive or complex requests.
            </p>
          </LegalSection>

          <LegalSection id="breach-notification" title="Breach Notification">
            <div className="flex items-start gap-3 mb-4">
              <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
              <p>
                In the event of a Personal Data Breach, Processor shall:
              </p>
            </div>
            <ol className="list-decimal pl-6 space-y-3 text-muted-foreground">
              <li>
                <strong>Notify Controller without undue delay</strong> and in any event within 
                48 hours of becoming aware of the breach
              </li>
              <li>
                <strong>Provide details including:</strong>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Nature of the breach</li>
                  <li>Categories and approximate number of Data Subjects affected</li>
                  <li>Likely consequences of the breach</li>
                  <li>Measures taken or proposed to address the breach</li>
                </ul>
              </li>
              <li>
                <strong>Cooperate with Controller</strong> in investigating the breach and 
                fulfilling regulatory obligations
              </li>
              <li>
                <strong>Document the breach</strong> including facts, effects, and remedial action
              </li>
            </ol>
          </LegalSection>

          <LegalSection id="audits" title="Audit Rights">
            <p>
              Controller has the right to audit Processor's compliance with this DPA:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Audits may be conducted annually or following a security incident</li>
              <li>Controller shall provide 30 days' advance notice (except for incidents)</li>
              <li>Audits shall be conducted during normal business hours</li>
              <li>Controller shall bear audit costs unless audit reveals material non-compliance</li>
              <li>Processor shall provide access to relevant facilities, systems, and personnel</li>
              <li>Processor may engage an independent third-party auditor as an alternative</li>
            </ul>
          </LegalSection>

          <LegalSection id="international-transfers" title="International Transfers">
            <p>
              Personal Data is primarily processed within the European Economic Area (EEA). 
              Where transfers outside the EEA are necessary:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Processor ensures appropriate safeguards are in place</li>
              <li>Standard Contractual Clauses (SCCs) are used where required</li>
              <li>Adequacy decisions are relied upon where available</li>
              <li>Controller is notified of any new international transfers</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              The current list of Sub-Processors and their locations is maintained at{" "}
              <Link to="/compliance/subprocessors" className="text-primary hover:underline">
                /compliance/subprocessors
              </Link>
            </p>
          </LegalSection>

          <LegalSection id="termination" title="Term & Termination">
            <p>
              This DPA remains in effect for the duration of the MSA. Upon termination:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
              <li>Controller may request return of all Personal Data in a standard format</li>
              <li>Controller may request secure deletion of all Personal Data</li>
              <li>Processor shall comply within 30 days of the request</li>
              <li>Processor shall certify deletion in writing upon request</li>
              <li>
                Processor may retain data as required by law, subject to continued confidentiality
              </li>
            </ul>
          </LegalSection>

          <LegalSection id="contact" title="Contact">
            <p>
              For questions about this DPA or to exercise rights under this agreement:
            </p>
            <div className="mt-4 space-y-2">
              <p>
                <strong>Data Protection Officer:</strong>{" "}
                <a href="mailto:dpo@thequantumclub.com" className="text-primary hover:underline">
                  dpo@thequantumclub.com
                </a>
              </p>
              <p>
                <strong>Legal Department:</strong>{" "}
                <a href="mailto:legal@thequantumclub.com" className="text-primary hover:underline">
                  legal@thequantumclub.com
                </a>
              </p>
              <p><strong>Address:</strong> The Quantum Club B.V., Amsterdam, Netherlands</p>
            </div>
            <Card className="mt-6 p-4 border-primary/30 bg-primary/5">
              <p className="text-sm text-muted-foreground">
                To execute this DPA, Partners should contact their account manager or email{" "}
                <a href="mailto:legal@thequantumclub.com" className="text-primary hover:underline">
                  legal@thequantumclub.com
                </a>
                . A signed copy will be countersigned and returned within 5 business days.
              </p>
            </Card>
          </LegalSection>
        </div>
      </LegalPageLayout>
    </div>
  );
}
