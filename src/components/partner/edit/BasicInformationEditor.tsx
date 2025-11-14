import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Building, Briefcase, Globe, Github } from 'lucide-react';

interface BasicInformationEditorProps {
  candidate: any;
  onChange?: (data: any) => void;
}

export function BasicInformationEditor({ candidate, onChange }: BasicInformationEditorProps) {
  const [fullName, setFullName] = useState(candidate.full_name || '');
  const [email, setEmail] = useState(candidate.email || '');
  const [phone, setPhone] = useState(candidate.phone || '');
  const [currentTitle, setCurrentTitle] = useState(candidate.current_title || '');
  const [currentCompany, setCurrentCompany] = useState(candidate.current_company || '');
  const [linkedinUrl, setLinkedinUrl] = useState(candidate.linkedin_url || '');
  const [githubUrl, setGithubUrl] = useState(candidate.github_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState(candidate.portfolio_url || '');

  useEffect(() => {
    onChange?.({
      full_name: fullName,
      email,
      phone,
      current_title: currentTitle,
      current_company: currentCompany,
      linkedin_url: linkedinUrl,
      github_url: githubUrl,
      portfolio_url: portfolioUrl,
    });
  }, [fullName, email, phone, currentTitle, currentCompany, linkedinUrl, githubUrl, portfolioUrl]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="full_name" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Full Name
          </Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g., Lena Jude"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., lena@example.com"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., +1 234 567 8900"
          />
        </div>

        {/* Current Title */}
        <div className="space-y-2">
          <Label htmlFor="current_title" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Current Title
          </Label>
          <Input
            id="current_title"
            value={currentTitle}
            onChange={(e) => setCurrentTitle(e.target.value)}
            placeholder="e.g., Senior Product Manager"
          />
        </div>

        {/* Current Company */}
        <div className="space-y-2">
          <Label htmlFor="current_company" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Current Company
          </Label>
          <Input
            id="current_company"
            value={currentCompany}
            onChange={(e) => setCurrentCompany(e.target.value)}
            placeholder="e.g., Acme Corp"
          />
        </div>

        {/* LinkedIn URL */}
        <div className="space-y-2">
          <Label htmlFor="linkedin_url" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            LinkedIn URL
          </Label>
          <Input
            id="linkedin_url"
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />
        </div>

        {/* GitHub URL */}
        <div className="space-y-2">
          <Label htmlFor="github_url" className="flex items-center gap-2">
            <Github className="w-4 h-4" />
            GitHub URL
          </Label>
          <Input
            id="github_url"
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/..."
          />
        </div>

        {/* Portfolio URL */}
        <div className="space-y-2">
          <Label htmlFor="portfolio_url" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Portfolio URL
          </Label>
          <Input
            id="portfolio_url"
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  );
}
