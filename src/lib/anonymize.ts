/**
 * Anonymization utilities for Stealth Mode
 */

interface AnonymizedProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  current_title: string | null;
  resume_url: string | null;
}

/**
 * Generate a random candidate ID for anonymization
 */
const generateCandidateId = (userId: string): string => {
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return `QC${Math.abs(hash).toString().slice(0, 6)}`;
};

/**
 * Generalize location to region level
 */
const generalizeLocation = (location: string | null): string | null => {
  if (!location) return null;
  
  // Extract city/state patterns
  const patterns = [
    { regex: /San Francisco/i, replacement: 'San Francisco Bay Area' },
    { regex: /New York/i, replacement: 'New York Metropolitan Area' },
    { regex: /Los Angeles/i, replacement: 'Greater Los Angeles Area' },
    { regex: /Seattle/i, replacement: 'Seattle Metropolitan Area' },
    { regex: /Austin/i, replacement: 'Austin Metro Area' },
    { regex: /Boston/i, replacement: 'Greater Boston Area' },
    { regex: /Chicago/i, replacement: 'Chicagoland Area' },
    { regex: /Denver/i, replacement: 'Denver Metro Area' },
    { regex: /Atlanta/i, replacement: 'Metro Atlanta' },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(location)) {
      return pattern.replacement;
    }
  }
  
  // If no pattern matches, just return the state/country if present
  const parts = location.split(',').map(p => p.trim());
  if (parts.length > 1) {
    return parts[parts.length - 1]; // Return last part (usually state/country)
  }
  
  return location;
};

/**
 * Generalize job title to broader category
 */
const generalizeTitle = (title: string | null, level: number): string | null => {
  if (!title || level < 2) return title;
  
  const titleLower = title.toLowerCase();
  
  // Software Engineering
  if (titleLower.includes('software') || titleLower.includes('engineer') || titleLower.includes('developer')) {
    if (titleLower.includes('senior') || titleLower.includes('sr')) return 'Senior Software Engineer';
    if (titleLower.includes('lead') || titleLower.includes('principal') || titleLower.includes('staff')) return 'Lead Software Engineer';
    return 'Software Engineer';
  }
  
  // Product Management
  if (titleLower.includes('product')) {
    if (titleLower.includes('senior') || titleLower.includes('sr')) return 'Senior Product Manager';
    if (titleLower.includes('director') || titleLower.includes('vp')) return 'Product Leadership';
    return 'Product Manager';
  }
  
  // Design
  if (titleLower.includes('design')) {
    if (titleLower.includes('senior') || titleLower.includes('sr')) return 'Senior Designer';
    if (titleLower.includes('lead') || titleLower.includes('principal')) return 'Lead Designer';
    return 'Designer';
  }
  
  // Data
  if (titleLower.includes('data')) {
    if (titleLower.includes('scientist')) return 'Data Scientist';
    if (titleLower.includes('engineer')) return 'Data Engineer';
    if (titleLower.includes('analyst')) return 'Data Analyst';
    return 'Data Professional';
  }
  
  // Marketing
  if (titleLower.includes('marketing')) {
    if (titleLower.includes('director') || titleLower.includes('vp')) return 'Marketing Leadership';
    return 'Marketing Professional';
  }
  
  return title;
};

/**
 * Anonymize profile data based on stealth mode level
 * Level 1: Basic - Hide name, email, phone
 * Level 2: Enhanced - + Hide LinkedIn, generalize location, title
 * Level 3: Full - + Maximum anonymization
 */
export const anonymizeProfile = (
  profile: any,
  level: number = 1,
  userId: string
): AnonymizedProfile => {
  const candidateId = generateCandidateId(userId);
  
  const anonymized: AnonymizedProfile = {
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin_url: profile.linkedin_url,
    avatar_url: profile.avatar_url,
    current_title: profile.current_title,
    resume_url: profile.resume_url,
  };
  
  // Level 1: Basic Stealth
  if (level >= 1) {
    anonymized.full_name = `Candidate ${candidateId}`;
    anonymized.email = null;
    anonymized.phone = null;
    anonymized.avatar_url = null;
  }
  
  // Level 2: Enhanced Stealth
  if (level >= 2) {
    anonymized.linkedin_url = null;
    anonymized.location = generalizeLocation(profile.location);
    anonymized.current_title = generalizeTitle(profile.current_title, level);
  }
  
  // Level 3: Full Stealth
  if (level >= 3) {
    anonymized.resume_url = null;
    // Further generalize location to just country/region
    if (anonymized.location) {
      const parts = anonymized.location.split(',').map(p => p.trim());
      anonymized.location = parts.length > 0 ? parts[parts.length - 1] : null;
    }
  }
  
  return anonymized;
};

/**
 * Check if a profile should be shown in stealth mode
 */
export const shouldUseStealthMode = (profile: any): boolean => {
  return profile?.stealth_mode_enabled === true;
};

/**
 * Get the display name based on stealth mode
 */
export const getDisplayName = (profile: any, userId: string): string => {
  if (!shouldUseStealthMode(profile)) {
    return profile?.full_name || 'User';
  }
  
  const candidateId = generateCandidateId(userId);
  return `Candidate ${candidateId}`;
};
