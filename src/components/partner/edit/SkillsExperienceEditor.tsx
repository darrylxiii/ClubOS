import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Code, Award, Languages, X } from 'lucide-react';

interface SkillsExperienceEditorProps {
  candidate: any;
  onChange?: (data: any) => void;
}

export function SkillsExperienceEditor({ candidate, onChange }: SkillsExperienceEditorProps) {
  const [yearsExperience, setYearsExperience] = useState(candidate.years_of_experience || 0);
  const [skills, setSkills] = useState<string[]>(
    Array.isArray(candidate.skills) ? candidate.skills.map((s: any) => typeof s === 'string' ? s : s.name || s) : []
  );
  const [certifications, setCertifications] = useState<string[]>(
    Array.isArray(candidate.certifications) ? candidate.certifications : []
  );
  const [languages, setLanguages] = useState<string[]>(
    Array.isArray(candidate.languages) ? candidate.languages.map((l: any) => typeof l === 'string' ? l : l.name || l) : []
  );
  
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  useEffect(() => {
    onChange?.({
      years_of_experience: yearsExperience,
      skills,
      certifications,
      languages,
    });
  }, [yearsExperience, skills, certifications, languages]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleAddCert = () => {
    if (newCert.trim() && !certifications.includes(newCert.trim())) {
      setCertifications([...certifications, newCert.trim()]);
      setNewCert('');
    }
  };

  const handleRemoveCert = (cert: string) => {
    setCertifications(certifications.filter(c => c !== cert));
  };

  const handleAddLanguage = () => {
    if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
      setLanguages([...languages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    setLanguages(languages.filter(l => l !== lang));
  };

  return (
    <div className="space-y-6">
      {/* Years of Experience */}
      <div className="space-y-2">
        <Label htmlFor="years_experience">Years of Experience</Label>
        <Input
          id="years_experience"
          type="number"
          min="0"
          value={yearsExperience}
          onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
          placeholder="e.g., 5"
        />
      </div>

      {/* Skills */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Code className="w-4 h-4" />
          Skills
        </Label>
        <div className="flex gap-2">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="e.g., React, Python, Project Management"
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
          />
          <Button onClick={handleAddSkill} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="flex items-center gap-1">
              {skill}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveSkill(skill)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Certifications */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Award className="w-4 h-4" />
          Certifications
        </Label>
        <div className="flex gap-2">
          <Input
            value={newCert}
            onChange={(e) => setNewCert(e.target.value)}
            placeholder="e.g., PMP, AWS Certified, Scrum Master"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCert()}
          />
          <Button onClick={handleAddCert} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {certifications.map((cert) => (
            <Badge key={cert} variant="secondary" className="flex items-center gap-1">
              {cert}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveCert(cert)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Languages className="w-4 h-4" />
          Languages
        </Label>
        <div className="flex gap-2">
          <Input
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
            placeholder="e.g., English (Native), Spanish (Fluent)"
            onKeyDown={(e) => e.key === 'Enter' && handleAddLanguage()}
          />
          <Button onClick={handleAddLanguage} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {languages.map((lang) => (
            <Badge key={lang} variant="secondary" className="flex items-center gap-1">
              {lang}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveLanguage(lang)}
              />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
