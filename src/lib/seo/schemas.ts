/**
 * JSON-LD Schema Generators for SEO
 * Provides structured data for search engines
 */

export interface OrganizationSchema {
  name: string;
  description: string;
  url: string;
  logo?: string;
  sameAs?: string[];
}

export interface JobPostingSchema {
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  employmentType?: string;
  hiringOrganization: {
    name: string;
    sameAs?: string;
    logo?: string;
  };
  jobLocation?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
  baseSalary?: {
    currency: string;
    minValue?: number;
    maxValue?: number;
    unitText?: string;
  };
  remote?: boolean;
}

export interface PersonSchema {
  name: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  url?: string;
  sameAs?: string[];
}

export interface CourseSchema {
  name: string;
  description: string;
  provider: string;
  url?: string;
  image?: string;
  instructor?: string;
  duration?: string;
  difficulty?: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generate Organization JSON-LD schema
 */
export function generateOrganizationSchema(org: OrganizationSchema): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    description: org.description,
    url: org.url,
    ...(org.logo && { logo: org.logo }),
    ...(org.sameAs && org.sameAs.length > 0 && { sameAs: org.sameAs }),
  };
}

/**
 * Generate JobPosting JSON-LD schema
 */
export function generateJobPostingSchema(job: JobPostingSchema): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.datePosted,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.hiringOrganization.name,
      ...(job.hiringOrganization.sameAs && { sameAs: job.hiringOrganization.sameAs }),
      ...(job.hiringOrganization.logo && { logo: job.hiringOrganization.logo }),
    },
  };

  if (job.validThrough) {
    schema.validThrough = job.validThrough;
  }

  if (job.employmentType) {
    schema.employmentType = job.employmentType;
  }

  if (job.jobLocation) {
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(job.jobLocation.addressLocality && { addressLocality: job.jobLocation.addressLocality }),
        ...(job.jobLocation.addressRegion && { addressRegion: job.jobLocation.addressRegion }),
        ...(job.jobLocation.addressCountry && { addressCountry: job.jobLocation.addressCountry }),
      },
    };
  }

  if (job.remote) {
    schema.jobLocationType = 'TELECOMMUTE';
  }

  if (job.baseSalary) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.baseSalary.currency,
      value: {
        '@type': 'QuantitativeValue',
        ...(job.baseSalary.minValue && { minValue: job.baseSalary.minValue }),
        ...(job.baseSalary.maxValue && { maxValue: job.baseSalary.maxValue }),
        unitText: job.baseSalary.unitText || 'YEAR',
      },
    };
  }

  return schema;
}

/**
 * Generate Person JSON-LD schema
 */
export function generatePersonSchema(person: PersonSchema): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    ...(person.jobTitle && { jobTitle: person.jobTitle }),
    ...(person.description && { description: person.description }),
    ...(person.image && { image: person.image }),
    ...(person.url && { url: person.url }),
    ...(person.sameAs && person.sameAs.length > 0 && { sameAs: person.sameAs }),
  };
}

/**
 * Generate Course JSON-LD schema
 */
export function generateCourseSchema(course: CourseSchema): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: course.provider,
    },
    ...(course.url && { url: course.url }),
    ...(course.image && { image: course.image }),
    ...(course.instructor && {
      instructor: {
        '@type': 'Person',
        name: course.instructor,
      },
    }),
    ...(course.duration && { timeRequired: course.duration }),
    ...(course.difficulty && { educationalLevel: course.difficulty }),
  };
}

/**
 * Generate BreadcrumbList JSON-LD schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate WebSite JSON-LD schema with search action
 */
export function generateWebSiteSchema(
  name: string,
  url: string,
  searchUrl?: string
): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
  };

  if (searchUrl) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchUrl,
      },
      'query-input': 'required name=search_term_string',
    };
  }

  return schema;
}

/**
 * Default organization schema for The Quantum Club
 */
export const DEFAULT_ORGANIZATION_SCHEMA = generateOrganizationSchema({
  name: 'The Quantum Club',
  description: 'An invite-only executive members club. Elite career management for high-impact professionals.',
  url: 'https://app.thequantumclub.com',
  logo: 'https://app.thequantumclub.com/quantum-logo.svg',
  sameAs: [
    'https://www.linkedin.com/company/thequantumclub',
  ],
});
