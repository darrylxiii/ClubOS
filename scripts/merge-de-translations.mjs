#!/usr/bin/env node
/**
 * Merges missing EN keys into DE translation files with German translations.
 * Reads the missing-report and applies translations.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');

// Load the report
const report = JSON.parse(readFileSync(join(import.meta.dirname, 'de-missing-report.json'), 'utf8'));

// German translation map - maps EN values to DE translations
// We'll build this comprehensively for all missing values
const translations = {
  // ========== COMMON ==========
  // actions
  "Retry loading sidebar": "Sidebar-Laden wiederholen",
  "Quick actions": "Schnellaktionen",

  // errors
  "Retrying...": "Wird wiederholt...",

  // empty
  "Tips": "Tipps",
  "Try adjusting your search or filters": "Versuchen Sie, Ihre Suche oder Filter anzupassen",
  "Try using different keywords": "Versuchen Sie andere Suchbegriffe",
  "Check your spelling": "Pruefen Sie Ihre Rechtschreibung",
  "Remove some filters to see more results": "Entfernen Sie einige Filter, um mehr Ergebnisse zu sehen",
  "Nothing here yet": "Noch nichts vorhanden",
  "Data will appear here once available": "Daten werden hier angezeigt, sobald sie verfuegbar sind",
  "No items found": "Keine Eintraege gefunden",
  "Get started by adding your first item": "Beginnen Sie, indem Sie Ihren ersten Eintrag hinzufuegen",
  "No matching items": "Keine passenden Eintraege",
  "Try changing your filters to see more results": "Aendern Sie Ihre Filter, um mehr Ergebnisse zu sehen",

  // pagination
  "pagination": "Seitennavigation",

  // models
  "GPT-5": "GPT-5",
  "OpenAI's flagship model": "Das Flaggschiff-Modell von OpenAI",

  // password
  "Medium": "Mittel",

  // breadcrumbNav
  "breadcrumb": "Brotkruemelnavigation",
  "More": "Mehr",

  // carousel
  "Previous slide": "Vorherige Folie",
  "Next slide": "Naechste Folie",
  "Scroll left": "Nach links scrollen",
  "Scroll right": "Nach rechts scrollen",

  // companyLogo
  "Company": "Unternehmen",
  "logo": "Logo",

  // notifications
  "Dismiss": "Verwerfen",
  "Stay in the loop": "Bleiben Sie auf dem Laufenden",
  "Get notified about interview invites, job matches, and messages from recruiters.": "Erhalten Sie Benachrichtigungen ueber Einladungen zu Vorstellungsgespraechen, passende Stellenangebote und Nachrichten von Recruitern.",
  "Maybe Later": "Vielleicht spaeter",
};

// This is a huge task. Instead of a static map, let's use a function-based approach.
// We'll translate programmatically based on patterns.

function translateValue(enValue, keyPath) {
  if (typeof enValue !== 'string') return enValue;

  // Check static translations first
  if (translations[enValue]) return translations[enValue];

  // For very specific translations we need a comprehensive dictionary approach
  // Let's just output what needs translating and build the full merged files
  return null; // Will be handled by the merge script below
}

// Actually, since the translations need to be high quality German,
// let's just output the missing keys and their EN values for each namespace
// so the AI assistant can translate them properly.

for (const [ns, data] of Object.entries(report)) {
  if (data.missingCount === 0) {
    console.log(`\n=== ${ns}: No missing keys ===`);
    continue;
  }
  console.log(`\n=== ${ns}: ${data.missingCount} missing keys ===`);

  // Output the missingValues object as compact JSON
  const output = JSON.stringify(data.missingValues, null, 2);
  writeFileSync(
    join(import.meta.dirname, `de-missing-${ns}.json`),
    output
  );
  console.log(`Written to scripts/de-missing-${ns}.json`);
}

console.log('\nDone! Missing value files written for each namespace.');
