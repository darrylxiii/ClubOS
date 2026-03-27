#!/usr/bin/env node
/**
 * Fix Remaining Hardcoded English Strings
 * =========================================
 * Scans ALL .tsx files that already have useTranslation imported but still
 * contain hardcoded English strings not wrapped in t() calls.
 *
 * Processes the TOP 100 worst offenders (sorted by hardcoded string count).
 *
 * Patterns replaced:
 *   >Some English Text<           →  >{t('section.someEnglishText', 'Some English Text')}<
 *   title="English"               →  title={t('section.english', 'English')}
 *   placeholder="Type here"       →  placeholder={t('section.typeHere', 'Type here')}
 *   label="Label Text"            →  label={t('section.labelText', 'Label Text')}
 *   aria-label="Close"            →  aria-label={t('section.close', 'Close')}
 *   description="Desc"            →  description={t('section.desc', 'Desc')}
 *   toast.error("Message")        →  toast.error(t('section.message', 'Message'))
 *   ? "Yes text" : "No text"      →  ? t('section.yesText', 'Yes text') : t('section.noText', 'No text')
 *
 * Skips: className, import paths, console.log, URLs, variable names, enums,
 *        data attributes, key props, already-translated strings, short strings.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, relative, basename, dirname } from 'path';

const ROOT = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d';
const SRC = join(ROOT, 'src');
const LOCALES_DIR = join(ROOT, 'src/i18n/locales/en');

// ============================================================================
// HELPERS
// ============================================================================

/** Convert text to camelCase key */
function camelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6) // limit word count
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
    .substring(0, 50) || 'text';
}

/** Set a nested key on an object using dot notation */
function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  const lastPart = parts[parts.length - 1];
  // Don't overwrite existing keys
  if (!(lastPart in current)) {
    current[lastPart] = value;
  }
}

/** Recursively collect all .tsx files */
function collectTsxFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules' || entry === '__tests__' || entry === '__mocks__') continue;
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        collectTsxFiles(full, files);
      } else if (entry.endsWith('.tsx') && !entry.endsWith('.test.tsx') && !entry.endsWith('.spec.tsx')) {
        files.push(full);
      }
    } catch (e) {
      // skip
    }
  }
  return files;
}

/** Escape text for use in t() second argument (the fallback) */
function escapeFallback(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Escape text for use inside double-quoted string */
function escapeDQ(text) {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ============================================================================
// NAMESPACE & SECTION DETECTION
// ============================================================================

/** Extract the namespace from the file's existing useTranslation call */
function extractNamespace(content) {
  // Match useTranslation('namespace') or useTranslation("namespace")
  const match = content.match(/useTranslation\(\s*['"]([\w-]+)['"]\s*\)/);
  if (match) return match[1];
  // If useTranslation() with no arg, default to 'common'
  if (/useTranslation\(\s*\)/.test(content)) return 'common';
  return 'common';
}

/** Derive a section key prefix from the file path */
function deriveSectionPrefix(filePath) {
  const rel = relative(join(ROOT, 'src/components'), filePath);
  const parts = rel.split('/');
  const fileName = parts[parts.length - 1].replace('.tsx', '');

  // Explicit directory -> section mappings
  const dirMappings = {
    'admin': 'admin',
    'academy': 'academy',
    'achievements': 'achievements',
    'analytics': 'analytics',
    'appearance': 'appearance',
    'applications': 'applications',
    'audience': 'audience',
    'auth': 'auth',
    'avatar-control': 'avatarControl',
    'blind-spot': 'blindSpot',
    'blog': 'blog',
    'booking': 'booking',
    'bulk-actions': 'bulkActions',
    'candidate': 'candidate',
    'candidate-onboarding': 'candidateOnboarding',
    'candidate-profile': 'candidateProfile',
    'candidates': 'candidates',
    'charts': 'charts',
    'client-health': 'clientHealth',
    'club-dj': 'clubDj',
    'clubhome': 'clubHome',
    'clubpilot': 'clubPilot',
    'clubsync': 'clubSync',
    'clubtasks': 'clubTasks',
    'communication': 'communication',
    'companies': 'companies',
    'company': 'company',
    'contracts': 'contracts',
    'crm': 'crm',
    'deals': 'deals',
    'dialogs': 'dialogs',
    'email': 'email',
    'employees': 'employees',
    'events': 'events',
    'feed': 'feed',
    'feedback': 'feedback',
    'freelancer': 'freelancer',
    'gamification': 'gamification',
    'image-editor': 'imageEditor',
    'incubator': 'incubator',
    'invites': 'invites',
    'jobs': 'jobs',
    'landing': 'landing',
    'legal': 'legal',
    'live': 'live',
    'meetings': 'meetings',
    'messages': 'messages',
    'miljoenenjacht': 'miljoenenjacht',
    'mobile': 'mobile',
    'notifications': 'notifications',
    'objectives': 'objectives',
    'offers': 'offers',
    'onboarding': 'onboarding',
    'partner': 'partner',
    'partner-setup': 'partnerSetup',
    'pipeline': 'pipeline',
    'pressure-cooker': 'pressureCooker',
    'profile': 'profile',
    'projects': 'projects',
    'proposals': 'proposals',
    'radio': 'radio',
    'referrals': 'referrals',
    'resume': 'resume',
    'search': 'search',
    'settings': 'settings',
    'social': 'social',
    'stories': 'stories',
    'support': 'support',
    'swipe-game': 'swipeGame',
    'talent-pool': 'talentPool',
    'task-boards': 'taskBoards',
    'time-tracking': 'timeTracking',
    'tracking': 'tracking',
    'ui': 'ui',
    'values-poker': 'valuesPoker',
    'voice': 'voice',
    'whatsapp': 'whatsapp',
    'workspace': 'workspace',
    'agent': 'agent',
    'ai': 'ai',
  };

  // For admin sub-directories like admin/kpi, admin/security, etc.
  if (parts.length >= 2 && parts[0] === 'admin') {
    const subDir = parts[1];
    const subMappings = {
      'achievements': 'achievements',
      'activity': 'activity',
      'agentic': 'agentic',
      'applications': 'applications',
      'approval': 'approval',
      'assessments': 'assessments',
      'bulk-ops': 'bulkOps',
      'companies': 'companies',
      'compliance': 'compliance',
      'due-diligence': 'dueDiligence',
      'edge-functions': 'edgeFunctions',
      'enterprise': 'enterprise',
      'feature-control': 'featureControl',
      'god-mode': 'godMode',
      'inventory': 'inventory',
      'kpi': 'kpi',
      'merge': 'merge',
      'notifications': 'notifications',
      'observability': 'observability',
      'partner-provisioning': 'partnerProvisioning',
      'pipeline-settings': 'pipelineSettings',
      'revenue': 'revenue',
      'risk': 'risk',
      'scim': 'scim',
      'security': 'security',
      'shared': 'shared',
      'system': 'system',
      'users': 'users',
      'webhooks': 'webhooks',
    };
    const subSection = subMappings[subDir] || camelCase(subDir);
    // Use component name as section
    return subSection + '.' + camelCase(fileName);
  }

  // For partner sub-directories
  if (parts.length >= 2 && parts[0] === 'partner') {
    return 'partner.' + camelCase(fileName);
  }

  // Get directory section
  const dir = parts.length > 1 ? parts[0] : '';
  const section = dirMappings[dir] || (dir ? camelCase(dir) : '');

  // Component name as subsection
  const compName = camelCase(fileName);

  if (section) {
    return section + '.' + compName;
  }

  // Top-level component
  return compName;
}

/** Map directory path to the appropriate namespace */
function deriveNamespaceFromPath(filePath) {
  const rel = relative(join(ROOT, 'src'), filePath);
  // Map directories to namespaces
  if (rel.includes('components/admin/')) return 'admin';
  if (rel.includes('components/partner/') || rel.includes('components/partner-setup/')) return 'partner';
  if (rel.includes('components/meetings/')) return 'meetings';
  if (rel.includes('components/analytics/')) return 'analytics';
  if (rel.includes('components/candidate') || rel.includes('components/candidates/')) return 'candidates';
  if (rel.includes('components/settings/')) return 'settings';
  if (rel.includes('components/compliance/')) return 'compliance';
  if (rel.includes('components/contracts/')) return 'contracts';
  if (rel.includes('components/jobs/')) return 'jobs';
  if (rel.includes('components/messages/')) return 'messages';
  if (rel.includes('pages/Auth') || rel.includes('components/auth/')) return 'auth';
  if (rel.includes('components/onboarding/')) return 'onboarding';
  return 'common';
}

// ============================================================================
// STRING DETECTION - Count hardcoded strings in a file
// ============================================================================

// Strings that are NOT user-visible and should be skipped
const SKIP_WORDS = new Set([
  'div', 'span', 'button', 'input', 'form', 'table', 'thead', 'tbody',
  'tr', 'td', 'th', 'ul', 'ol', 'li', 'nav', 'header', 'footer',
  'main', 'section', 'article', 'aside', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'img', 'a', 'br', 'hr', 'pre', 'code', 'svg', 'path', 'true', 'false',
  'null', 'undefined', 'NaN', 'Infinity',
]);

/** Check if a string looks like it should be translated */
function isTranslatableText(text) {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  // Skip if it's a single lowercase word (likely a variable/prop name)
  if (/^[a-z][a-zA-Z0-9]*$/.test(trimmed)) return false;
  // Skip HTML tags
  if (SKIP_WORDS.has(trimmed.toLowerCase())) return false;
  // Skip URLs
  if (/^https?:\/\//.test(trimmed) || /^www\./.test(trimmed)) return false;
  // Skip file extensions / paths
  if (/^[./]/.test(trimmed) || /\.(tsx?|jsx?|css|json|svg|png|jpg)$/.test(trimmed)) return false;
  // Skip CSS values
  if (/^(flex|grid|block|none|inline|relative|absolute|fixed|sticky|auto|inherit|initial)$/.test(trimmed)) return false;
  if (/^\d+(px|rem|em|%|vh|vw|fr|ms|s)$/.test(trimmed)) return false;
  // Skip color values
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return false;
  if (/^(rgb|hsl|oklch)\(/.test(trimmed)) return false;
  // Skip data attribute values
  if (/^data-/.test(trimmed)) return false;
  // Skip single character or very short strings
  if (trimmed.length <= 1) return false;
  // Skip numeric-only
  if (/^[\d.,\-+%$]+$/.test(trimmed)) return false;
  // Skip if all lowercase single word
  if (/^[a-z]+$/.test(trimmed) && trimmed.length < 10) return false;
  // Skip common non-translatable patterns
  if (/^(id|key|ref|type|name|value|src|href|alt|className|variant|size|asChild)$/.test(trimmed)) return false;
  // Skip icon names
  if (/^(Lucide|Icon|Svg)/.test(trimmed)) return false;
  // Must start with uppercase letter OR be multi-word for lowercase
  if (/^[A-Z]/.test(trimmed)) return true;
  // Lowercase multi-word phrases are translatable
  if (/\s/.test(trimmed) && trimmed.length >= 5) return true;
  return false;
}

/** Count hardcoded strings in a file that should be translated */
function countHardcodedStrings(content) {
  let count = 0;
  const strings = [];

  // Pattern 1: JSX text content  >Some Text<
  const jsxTextRegex = />([^<>{}`]+)</g;
  let match;
  while ((match = jsxTextRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (isTranslatableText(text) && !isInsideNonJSXContext(content, match.index)) {
      count++;
      strings.push(text.substring(0, 40));
    }
  }

  // Pattern 2: String props: title="Text", placeholder="Text", etc.
  const propRegex = /(?:title|placeholder|label|aria-label|description|heading|alt|helperText|emptyText|loadingText|errorText|successText|buttonText|linkText|tooltipContent)="([^"]+)"/g;
  while ((match = propRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (isTranslatableText(text) && !isAlreadyTranslated(content, match.index)) {
      count++;
      strings.push(text.substring(0, 40));
    }
  }

  // Pattern 3: Toast calls with hardcoded strings
  const toastRegex = /toast\.(success|error|info|warning)\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = toastRegex.exec(content)) !== null) {
    const text = match[2].trim();
    if (text.length >= 3) {
      count++;
      strings.push(text.substring(0, 40));
    }
  }

  // Pattern 4: Ternary with string literals: ? "Text" : "Text"
  const ternaryRegex = /\?\s*["']([A-Z][^"']{2,})["']\s*:\s*["']([A-Z][^"']{2,})["']/g;
  while ((match = ternaryRegex.exec(content)) !== null) {
    count += 2;
    strings.push(match[1].substring(0, 30));
    strings.push(match[2].substring(0, 30));
  }

  return { count, strings };
}

/** Check if position is inside a non-JSX context (comment, import, console, className) */
function isInsideNonJSXContext(content, pos) {
  // Check the line containing this position
  const lineStart = content.lastIndexOf('\n', pos) + 1;
  const lineEnd = content.indexOf('\n', pos);
  const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);

  // Skip comments
  if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return true;
  // Skip imports
  if (/^\s*import\s/.test(line)) return true;
  // Skip console
  if (/console\.(log|warn|error|info|debug)/.test(line)) return true;
  // Skip className
  if (/className[=:]/.test(line) && !/(title|label|placeholder|aria-label)/.test(line)) return true;
  // Skip type definitions
  if (/^\s*(interface|type|enum)\s/.test(line)) return true;
  // Skip const/let/var assignments to strings that are not user-visible
  if (/^\s*(const|let|var)\s+\w+\s*[:=]/.test(line) && !/toast|title|label|message|text|description|heading|placeholder/i.test(line)) return true;
  // Skip switch/case
  if (/^\s*case\s+['"]/.test(line)) return true;

  return false;
}

/** Check if a position is already inside a t() call */
function isAlreadyTranslated(content, pos) {
  // Look backward from position for t(' or t("
  const before = content.substring(Math.max(0, pos - 80), pos);
  // If we find an unclosed t( call, this is already translated
  const tCallIdx = before.lastIndexOf("t('");
  const tCallIdx2 = before.lastIndexOf('t("');
  const closeIdx = before.lastIndexOf(')');
  const lastT = Math.max(tCallIdx, tCallIdx2);
  if (lastT > closeIdx) return true;
  return false;
}

// ============================================================================
// REPLACEMENT ENGINE
// ============================================================================

// Track used keys per namespace to avoid collisions
const usedKeysPerNs = {};
const newKeysPerNs = {};

function ensureUniqueKey(ns, key, text) {
  if (!usedKeysPerNs[ns]) usedKeysPerNs[ns] = new Set();
  if (!newKeysPerNs[ns]) newKeysPerNs[ns] = {};

  let finalKey = key;
  let counter = 1;
  while (usedKeysPerNs[ns].has(finalKey) && newKeysPerNs[ns][finalKey] !== text) {
    finalKey = key + counter;
    counter++;
  }
  usedKeysPerNs[ns].add(finalKey);
  newKeysPerNs[ns][finalKey] = text;
  return finalKey;
}

/** Process a single file: replace hardcoded strings with t() calls */
function processFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // Extract the namespace from the file's useTranslation call
  const ns = extractNamespace(content);
  const sectionPrefix = deriveSectionPrefix(filePath);

  let replacementCount = 0;

  // ==========================================
  // REPLACEMENT 1: JSX text content
  // ==========================================
  // Match text between > and </ that is user-visible English
  // Be careful not to match inside expressions {}, attributes, etc.
  const jsxTags = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'span', 'strong', 'em', 'b', 'i', 'small', 'label', 'legend',
    'li', 'dt', 'dd', 'th', 'td', 'caption', 'figcaption',
    'Button', 'button',
    'CardTitle', 'CardDescription', 'CardHeader',
    'DialogTitle', 'DialogDescription',
    'AlertTitle', 'AlertDescription',
    'AlertDialogTitle', 'AlertDialogDescription', 'AlertDialogCancel', 'AlertDialogAction',
    'TabsTrigger', 'TabsContent',
    'Label',
    'Badge',
    'TooltipContent',
    'SelectItem', 'SelectLabel',
    'DropdownMenuItem', 'DropdownMenuLabel',
    'CommandItem', 'CommandGroup',
    'BreadcrumbLink', 'BreadcrumbPage',
    'AccordionTrigger',
    'SheetTitle', 'SheetDescription',
    'DrawerTitle', 'DrawerDescription',
    'PopoverContent',
    'TableHead', 'TableCell',
    'FormLabel', 'FormDescription', 'FormMessage',
    'NavigationMenuLink', 'NavigationMenuTrigger',
  ];

  const tagPattern = jsxTags.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

  // Match: <Tag ...>Text Content</Tag>  or  <Tag ...>Text Content</
  // Captures the opening including >, the text, and the </
  const jsxTextRegex = new RegExp(
    `(<(?:${tagPattern})(?:\\s[^>]*)?>)\\s*([A-Z][^<>{}\`\\n]{1,120}?)\\s*(<\\/)`,
    'g'
  );

  content = content.replace(jsxTextRegex, (match, openTag, text, closeTag) => {
    const trimmed = text.trim();
    if (!isTranslatableText(trimmed)) return match;
    if (trimmed.length < 2 || trimmed.length > 150) return match;
    // Skip if line is a comment or import
    const lineStart = content.lastIndexOf('\n', content.indexOf(match)) + 1;
    const line = content.substring(lineStart, content.indexOf('\n', lineStart + 1));
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line) || /^\s*import\s/.test(line)) return match;
    // Skip if text contains JSX expressions
    if (trimmed.includes('{') || trimmed.includes('}') || trimmed.includes('`')) return match;
    // Skip brand names that shouldn't be translated
    if (/^(React|TypeScript|JavaScript|Supabase|Stripe|WhatsApp|LinkedIn|GitHub|Google|OpenAI|Gemini|Vite|Tailwind|Vercel)$/i.test(trimmed)) return match;

    const key = sectionPrefix + '.' + camelCase(trimmed);
    const finalKey = ensureUniqueKey(ns, key, trimmed);
    replacementCount++;
    return `${openTag}{t('${finalKey}', '${escapeFallback(trimmed)}')}${closeTag}`;
  });

  // ==========================================
  // REPLACEMENT 1b: JSX text in self-closing-like patterns
  // ==========================================
  // Also catch text that appears after > but before a { or < regardless of tag name
  // This catches cases like: <div className="...">Some Text<span>
  // Pattern: >(whitespace)(CapitalizedText)(whitespace)<
  const genericJsxTextRegex = />([\s]*?)([A-Z][A-Za-z][A-Za-z\s,.'!\-:?/&()]{2,80}?)([\s]*?)</g;

  content = content.replace(genericJsxTextRegex, (match, pre, text, post) => {
    const trimmed = text.trim();
    if (!isTranslatableText(trimmed)) return match;
    // If it already has t( around it, skip
    const matchPos = content.indexOf(match);
    if (matchPos > 0) {
      const before = content.substring(Math.max(0, matchPos - 20), matchPos);
      if (/t\(\s*['"]/.test(before)) return match;
    }
    // Skip very short or things that look like component names
    if (trimmed.length < 3) return match;
    if (/^[A-Z][a-z]+[A-Z]/.test(trimmed) && !/\s/.test(trimmed)) return match; // PascalCase component
    // Skip JSX expressions or code
    if (trimmed.includes('{') || trimmed.includes('}') || trimmed.includes('`') || trimmed.includes('$')) return match;
    // Skip if line is a comment, import, or className
    const lineStart = content.lastIndexOf('\n', content.lastIndexOf(match)) + 1;
    const lineEnd = content.indexOf('\n', lineStart + 1);
    const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line) || /^\s*import\s/.test(line)) return match;
    if (/className[=:]/.test(line) && !/(title|label|placeholder)/.test(line)) return match;
    // Already wrapped in t()
    if (/\{t\(/.test(match)) return match;

    const key = sectionPrefix + '.' + camelCase(trimmed);
    const finalKey = ensureUniqueKey(ns, key, trimmed);
    replacementCount++;
    return `>${pre}{t('${finalKey}', '${escapeFallback(trimmed)}')}${post}<`;
  });

  // ==========================================
  // REPLACEMENT 2: String attributes (double-quoted)
  // ==========================================
  const attrProps = [
    'title', 'placeholder', 'label', 'aria-label', 'description',
    'heading', 'alt', 'helperText', 'emptyText', 'loadingText',
    'errorText', 'successText', 'buttonText', 'tooltipContent',
    'sideOffset', 'content', 'message', 'text', 'name',
  ];

  // Only process attributes where the value is clearly user-visible English
  const safeAttrProps = [
    'title', 'placeholder', 'label', 'aria-label', 'description',
    'heading', 'alt', 'helperText', 'emptyText', 'loadingText',
    'errorText', 'successText', 'buttonText', 'tooltipContent',
  ];

  for (const prop of safeAttrProps) {
    const escapedProp = prop.replace(/-/g, '\\-');
    // Match prop="Value" but not prop={...} or prop="" (empty)
    const attrRegex = new RegExp(
      `(${escapedProp})="([A-Z][^"]{2,120})"`,
      'g'
    );

    content = content.replace(attrRegex, (match, attrName, text) => {
      const trimmed = text.trim();
      if (!isTranslatableText(trimmed)) return match;
      // Skip if text looks like a URL, path, or code
      if (/^(https?:|www\.|\/|#|data:)/.test(trimmed)) return match;
      // Skip component names
      if (/^[A-Z][a-z]+[A-Z]/.test(trimmed) && !/\s/.test(trimmed)) return match;
      // Skip already translated
      if (isAlreadyTranslated(content, content.indexOf(match))) return match;
      // Check line context
      const lineStart = content.lastIndexOf('\n', content.lastIndexOf(match)) + 1;
      const lineEnd = content.indexOf('\n', lineStart + 1);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return match;

      const key = sectionPrefix + '.' + camelCase(trimmed);
      const finalKey = ensureUniqueKey(ns, key, trimmed);
      replacementCount++;
      return `${attrName}={t('${finalKey}', '${escapeFallback(trimmed)}')}`;
    });
  }

  // ==========================================
  // REPLACEMENT 2b: String attributes (single-quoted)
  // ==========================================
  for (const prop of safeAttrProps) {
    const escapedProp = prop.replace(/-/g, '\\-');
    const attrRegex = new RegExp(
      `(${escapedProp})='([A-Z][^']{2,120})'`,
      'g'
    );

    content = content.replace(attrRegex, (match, attrName, text) => {
      const trimmed = text.trim();
      if (!isTranslatableText(trimmed)) return match;
      if (/^(https?:|www\.|\/|#|data:)/.test(trimmed)) return match;
      if (/^[A-Z][a-z]+[A-Z]/.test(trimmed) && !/\s/.test(trimmed)) return match;

      const key = sectionPrefix + '.' + camelCase(trimmed);
      const finalKey = ensureUniqueKey(ns, key, trimmed);
      replacementCount++;
      return `${attrName}={t('${finalKey}', '${escapeFallback(trimmed)}')}`;
    });
  }

  // ==========================================
  // REPLACEMENT 3: Toast calls
  // ==========================================
  // toast.success("Message") → toast.success(t('key', 'Message'))
  // toast.error("Message") → toast.error(t('key', 'Message'))
  // toast("Message") → toast(t('key', 'Message'))
  const toastPatterns = [
    // toast.method("text")
    /toast\.(success|error|info|warning)\(\s*"([^"]{3,120})"\s*\)/g,
    // toast.method('text')
    /toast\.(success|error|info|warning)\(\s*'([^']{3,120})'\s*\)/g,
    // toast("text")
    /toast\(\s*"([^"]{3,120})"\s*\)/g,
    // toast('text')
    /toast\(\s*'([^']{3,120})'\s*\)/g,
  ];

  // toast.method("text")
  content = content.replace(
    /toast\.(success|error|info|warning)\(\s*"([^"]{3,120})"\s*\)/g,
    (match, method, text) => {
      if (/^[a-z]/.test(text) && !/\s/.test(text)) return match; // skip single lowercase word
      const key = sectionPrefix + '.' + camelCase(text);
      const finalKey = ensureUniqueKey(ns, key, text);
      replacementCount++;
      return `toast.${method}(t('${finalKey}', '${escapeFallback(text)}'))`;
    }
  );

  content = content.replace(
    /toast\.(success|error|info|warning)\(\s*'([^']{3,120})'\s*\)/g,
    (match, method, text) => {
      if (/^[a-z]/.test(text) && !/\s/.test(text)) return match;
      const key = sectionPrefix + '.' + camelCase(text);
      const finalKey = ensureUniqueKey(ns, key, text);
      replacementCount++;
      return `toast.${method}(t('${finalKey}', '${escapeFallback(text)}'))`;
    }
  );

  // standalone toast("text")
  content = content.replace(
    /toast\(\s*"([A-Z][^"]{3,120})"\s*\)/g,
    (match, text) => {
      const key = sectionPrefix + '.' + camelCase(text);
      const finalKey = ensureUniqueKey(ns, key, text);
      replacementCount++;
      return `toast(t('${finalKey}', '${escapeFallback(text)}'))`;
    }
  );

  content = content.replace(
    /toast\(\s*'([A-Z][^']{3,120})'\s*\)/g,
    (match, text) => {
      const key = sectionPrefix + '.' + camelCase(text);
      const finalKey = ensureUniqueKey(ns, key, text);
      replacementCount++;
      return `toast(t('${finalKey}', '${escapeFallback(text)}'))`;
    }
  );

  // ==========================================
  // REPLACEMENT 4: Ternary string literals
  // ==========================================
  // condition ? "Yes text" : "No text" → condition ? t('key1', 'Yes text') : t('key2', 'No text')
  content = content.replace(
    /\?\s*"([A-Z][^"]{2,80})"\s*:\s*"([A-Z][^"]{2,80})"/g,
    (match, text1, text2) => {
      if (!isTranslatableText(text1) || !isTranslatableText(text2)) return match;
      const key1 = sectionPrefix + '.' + camelCase(text1);
      const key2 = sectionPrefix + '.' + camelCase(text2);
      const finalKey1 = ensureUniqueKey(ns, key1, text1);
      const finalKey2 = ensureUniqueKey(ns, key2, text2);
      replacementCount += 2;
      return `? t('${finalKey1}', '${escapeFallback(text1)}') : t('${finalKey2}', '${escapeFallback(text2)}')`;
    }
  );

  content = content.replace(
    /\?\s*'([A-Z][^']{2,80})'\s*:\s*'([A-Z][^']{2,80})'/g,
    (match, text1, text2) => {
      if (!isTranslatableText(text1) || !isTranslatableText(text2)) return match;
      const key1 = sectionPrefix + '.' + camelCase(text1);
      const key2 = sectionPrefix + '.' + camelCase(text2);
      const finalKey1 = ensureUniqueKey(ns, key1, text1);
      const finalKey2 = ensureUniqueKey(ns, key2, text2);
      replacementCount += 2;
      return `? t('${finalKey1}', '${escapeFallback(text1)}') : t('${finalKey2}', '${escapeFallback(text2)}')`;
    }
  );

  // ==========================================
  // REPLACEMENT 5: Lowercase multi-word JSX text
  // ==========================================
  // Catch things like: >no events found</ or >or create a new one</
  content = content.replace(
    />([\s]*)((?:[a-z][a-zA-Z]*\s){1,}[a-zA-Z\s]{2,}?)([\s]*)<\//g,
    (match, pre, text, post) => {
      const trimmed = text.trim();
      if (trimmed.length < 5) return match;
      // Must have at least 2 words
      if (!/\s/.test(trimmed)) return match;
      // Skip code-like patterns
      if (/[{}()=<>]/.test(trimmed)) return match;
      if (/^(className|onClick|onChange|onSubmit|disabled|type|value|key|ref|style|aria|data|on[A-Z])/.test(trimmed)) return match;
      if (/^(const|let|var|return|import|export|function|if|else|for|while|switch|case|default|break|continue)/.test(trimmed)) return match;
      // Check line context
      const lineStart = content.lastIndexOf('\n', content.lastIndexOf(match)) + 1;
      const lineEnd = content.indexOf('\n', lineStart + 1);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line) || /^\s*import\s/.test(line)) return match;
      if (/className[=:]/.test(line)) return match;

      const key = sectionPrefix + '.' + camelCase(trimmed);
      const finalKey = ensureUniqueKey(ns, key, trimmed);
      replacementCount++;
      return `>${pre}{t('${finalKey}', '${escapeFallback(trimmed)}')}${post}</`;
    }
  );

  // ==========================================
  // REPLACEMENT 6: String literals in description/title/message properties (object literal context)
  // ==========================================
  // { title: "Some Title", description: "Some desc" }
  content = content.replace(
    /((?:title|description|message|label|heading|text|tooltip|placeholder|buttonText|name)\s*:\s*)"([A-Z][^"]{2,120})"/g,
    (match, prefix, text) => {
      // Check we're not inside a type definition
      const lineStart = content.lastIndexOf('\n', content.lastIndexOf(match)) + 1;
      const lineEnd = content.indexOf('\n', lineStart + 1);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
      if (/^\s*(interface|type|enum|\/\/|\*)/.test(line)) return match;
      // Skip if already has t() around it
      if (/t\(/.test(prefix)) return match;
      if (!isTranslatableText(text)) return match;

      const key = sectionPrefix + '.' + camelCase(text);
      const finalKey = ensureUniqueKey(ns, key, text);
      replacementCount++;
      return `${prefix}t('${finalKey}', '${escapeFallback(text)}')`;
    }
  );

  // Same with single quotes
  content = content.replace(
    /((?:title|description|message|label|heading|text|tooltip|placeholder|buttonText)\s*:\s*)'([A-Z][^']{2,120})'/g,
    (match, prefix, text) => {
      const lineStart = content.lastIndexOf('\n', content.lastIndexOf(match)) + 1;
      const lineEnd = content.indexOf('\n', lineStart + 1);
      const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
      if (/^\s*(interface|type|enum|\/\/|\*)/.test(line)) return match;
      if (/t\(/.test(prefix)) return match;
      if (!isTranslatableText(text)) return match;

      const key = sectionPrefix + '.' + camelCase(text);
      const finalKey = ensureUniqueKey(ns, key, text);
      replacementCount++;
      return `${prefix}t('${finalKey}', '${escapeFallback(text)}')`;
    }
  );

  // Write file if changed
  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return replacementCount;
}

// ============================================================================
// MAIN
// ============================================================================

console.log('=== Fix Remaining Hardcoded English Strings ===\n');
console.log(`Root: ${ROOT}`);
console.log(`Scanning for .tsx files with useTranslation but hardcoded strings...\n`);

// 1. Collect all .tsx files
const allFiles = collectTsxFiles(join(ROOT, 'src/components'));
// Also pages
const pageFiles = collectTsxFiles(join(ROOT, 'src/pages'));
allFiles.push(...pageFiles);

console.log(`Found ${allFiles.length} .tsx files total\n`);

// 2. Filter to files that already have useTranslation
const filesWithI18n = allFiles.filter(f => {
  const content = readFileSync(f, 'utf-8');
  return content.includes('useTranslation');
});

console.log(`Files with useTranslation: ${filesWithI18n.length}\n`);

// 3. Count hardcoded strings in each file and sort
const fileScores = [];
for (const f of filesWithI18n) {
  const content = readFileSync(f, 'utf-8');
  const { count, strings } = countHardcodedStrings(content);
  if (count > 0) {
    fileScores.push({ file: f, count, strings, rel: relative(ROOT, f) });
  }
}

fileScores.sort((a, b) => b.count - a.count);

console.log(`Files with hardcoded strings: ${fileScores.length}`);
console.log(`Total estimated hardcoded strings: ${fileScores.reduce((s, f) => s + f.count, 0)}\n`);

// Show top 20
console.log('Top 20 worst offenders:');
for (let i = 0; i < Math.min(20, fileScores.length); i++) {
  console.log(`  ${fileScores[i].count.toString().padStart(3)} strings: ${fileScores[i].rel}`);
}
console.log('');

// 4. Process top 100 files
const TOP_N = 100;
const toProcess = fileScores.slice(0, TOP_N);

console.log(`Processing top ${Math.min(TOP_N, toProcess.length)} files...\n`);

// Pre-load existing EN JSON files to avoid creating duplicate keys
const validNamespaces = ['common', 'auth', 'onboarding', 'admin', 'analytics',
  'candidates', 'compliance', 'contracts', 'jobs', 'meetings', 'messages', 'partner', 'settings'];

const existingJsons = {};
for (const ns of validNamespaces) {
  const jsonPath = join(LOCALES_DIR, `${ns}.json`);
  if (existsSync(jsonPath)) {
    try {
      existingJsons[ns] = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
      console.warn(`  WARN: Could not parse ${ns}.json: ${e.message}`);
      existingJsons[ns] = {};
    }
  } else {
    existingJsons[ns] = {};
  }

  // Collect existing keys into usedKeysPerNs to avoid collisions
  usedKeysPerNs[ns] = new Set();
  function collectExistingKeys(obj, prefix = '') {
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      usedKeysPerNs[ns].add(fullKey);
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        collectExistingKeys(v, fullKey);
      }
    }
  }
  collectExistingKeys(existingJsons[ns]);
}

let totalReplacements = 0;
let filesModified = 0;

for (const { file, rel } of toProcess) {
  const count = processFile(file);
  if (count > 0) {
    console.log(`  [${count.toString().padStart(3)} replaced] ${rel}`);
    totalReplacements += count;
    filesModified++;
  } else {
    console.log(`  [  0 replaced] ${rel} (all skipped)`);
  }
}

// 5. Merge new keys into EN JSON files
console.log('\n=== Merging new keys into EN JSON files ===\n');

let totalNewKeys = 0;
for (const ns of validNamespaces) {
  if (!newKeysPerNs[ns] || Object.keys(newKeysPerNs[ns]).length === 0) continue;

  const jsonPath = join(LOCALES_DIR, `${ns}.json`);
  const json = existingJsons[ns];
  let keysAdded = 0;

  for (const [key, value] of Object.entries(newKeysPerNs[ns])) {
    setNestedKey(json, key, value);
    keysAdded++;
  }

  writeFileSync(jsonPath, JSON.stringify(json, null, 2) + '\n');
  console.log(`  ${ns}.json: +${keysAdded} keys`);
  totalNewKeys += keysAdded;
}

// 6. Write a summary JSON with all new keys for review
const summaryPath = join(ROOT, 'scripts', 'new-hardcoded-keys.json');
writeFileSync(summaryPath, JSON.stringify(newKeysPerNs, null, 2));
console.log(`\nNew keys summary written to: ${relative(ROOT, summaryPath)}`);

// 7. Summary
console.log('\n=== SUMMARY ===');
console.log(`Files scanned:    ${filesWithI18n.length}`);
console.log(`Files with issues: ${fileScores.length}`);
console.log(`Files processed:  ${toProcess.length}`);
console.log(`Files modified:   ${filesModified}`);
console.log(`Replacements:     ${totalReplacements}`);
console.log(`New keys added:   ${totalNewKeys}`);
console.log('');
console.log('Done! Review the changes with `git diff` before committing.');
