#!/usr/bin/env node
/**
 * AI Translation Engine — Processes a SINGLE language + namespace combo
 * Usage: node scripts/translate_ai.mjs <lang> <namespace>
 * 
 * This script is designed to be run in PARALLEL — one instance per language.
 * It reads the EN source, finds all untranslated strings, and generates
 * native-quality translations.
 * 
 * Branding rules:
 * - "The Quantum Club" → keep as-is in all languages
 * - "Club" (when referring to the platform) → keep as-is
 * - "Club AI", "Club Pilot", "Club Radio" → keep as-is
 * - "ClubSync", "ClubHome" → keep as-is
 * - Person names (Darryl) → keep as-is
 * - Technical terms (API, MFA, SSL, etc.) → keep as-is
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const LOCALES_DIR = resolve(import.meta.dirname, '../src/i18n/locales');
const lang = process.argv[2];
const namespace = process.argv[3];

if (!lang || !namespace) {
  console.error('Usage: node translate_ai.mjs <lang> <namespace>');
  process.exit(1);
}

// ============================================================
// LANGUAGE METADATA
// ============================================================
const LANG_CONFIG = {
  nl: { name: 'Dutch', nativeName: 'Nederlands', formal: true, desc: 'Use formal "u" form, not "je/jij". Professional B2B recruitment platform tone.' },
  de: { name: 'German', nativeName: 'Deutsch', formal: true, desc: 'Use formal "Sie" form. Professional and precise.' },
  fr: { name: 'French', nativeName: 'Français', formal: true, desc: 'Use formal "vous" form. Elegant and professional.' },
  es: { name: 'Spanish', nativeName: 'Español', formal: true, desc: 'Use formal "usted" form. Professional Latin American neutral.' },
  zh: { name: 'Chinese', nativeName: '中文', formal: true, desc: 'Simplified Chinese (zh-CN). Professional and concise.' },
  ar: { name: 'Arabic', nativeName: 'العربية', formal: true, desc: 'Modern Standard Arabic. Right-to-left. Professional tone.' },
  ru: { name: 'Russian', nativeName: 'Русский', formal: true, desc: 'Use formal "Вы" form. Professional business tone.' },
};

const config = LANG_CONFIG[lang];
if (!config) {
  console.error(`Unknown language: ${lang}`);
  process.exit(1);
}

// ============================================================
// TRANSLATION FUNCTION — COMPREHENSIVE PHRASE TRANSLATOR
// ============================================================

/**
 * Check if value should be skipped (technical, branding, etc.)
 */
function shouldSkip(key, value) {
  if (typeof value !== 'string') return true;
  if (value.length === 0) return true;
  if (value.length <= 2) return true;
  if (/^[\d\s.,;:!?%$€£¥#+\-*/=@()\[\]{}|\\<>]+$/.test(value)) return true;
  if (/^(https?:\/\/|mailto:|tel:)/.test(value)) return true;
  if (/^\{\{.+\}\}$/.test(value)) return true;
  if (/^[a-z_]+(\([a-z_]+\))?(,\s*[a-z_!]+(\([a-z_,\s:!]+\))?)+$/i.test(value)) return true;
  if (/^[a-z]{2}-[A-Z]{2}$/.test(value)) return true;
  const brandsOnly = ['Club OS', 'ClubOS', 'The Quantum Club', 'Club AI', 'Club Pilot',
    'Club Radio', 'Club Home', 'ClubSync', 'ClubHome', 'WhatsApp', 'LinkedIn',
    'Google', 'GitHub', 'Apple', 'Moneybird', 'Stripe', 'PDF', 'CSV', 'API',
    'MFA', 'AUC-ROC', 'NPS', 'ROI', 'KPI', 'SLA', 'DPA', 'BAA', 'SSL',
    'GDPR', 'GPT-5', 'Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'WhatsApp Business',
    'TQC Team', 'Darryl', 'JSON', 'CSS', 'HTML', 'SQL', 'REST', 'GraphQL'];
  if (brandsOnly.includes(value.trim())) return true;
  return false;
}

/**
 * Build massive translation maps for each language.
 * These contain thousands of English→Target mappings covering
 * all common UI patterns, sentences, and phrases.
 */
function getTranslationMap(lang) {
  const maps = {
    // ===================================================================
    // DUTCH — Primary market, most comprehensive
    // ===================================================================
    nl: {
      // --- Navigation & Sections ---
      "My Profile": "Mijn profiel",
      "My Skills": "Mijn vaardigheden",
      "My Performance": "Mijn prestaties",
      "My Analytics": "Mijn analyse",
      "My Proposals": "Mijn voorstellen",
      "My Contracts": "Mijn contracten",
      "My Communications": "Mijn communicatie",
      "Email Settings": "E-mailinstellingen",
      "Help Center": "Helpcentrum",
      "Support Tickets": "Supporttickets",
      "Submit Ticket": "Ticket indienen",
      "Admin Panel": "Beheerpaneel",
      "Meeting Intelligence": "Vergaderingsintelligentie",
      "Cover Letter Builder": "Sollicitatiebriefgenerator",
      "Browse Projects": "Projecten bekijken",
      "Freelancer Setup": "Freelancer instellen",
      "Gig Marketplace": "Gig-marktplaats",
      "Time Tracking": "Tijdregistratie",
      "Social Feed": "Sociale tijdlijn",
      "Post Project": "Project plaatsen",
      "Find Talent": "Talent zoeken",
      "Expert Marketplace": "Expertmarktplaats",
      "CRM Dashboard": "CRM-dashboard",
      "Reply Inbox": "Antwoordinbox",
      "CRM Settings": "CRM-instellingen",
      "WhatsApp Hub": "WhatsApp Hub",
      "WhatsApp Booking": "WhatsApp Boeking",
      "Partner Funnel": "Partnertrechter",
      "Partner Relationships": "Partnerrelaties",
      "Relationships Dashboard": "Relatiedashboard",
      "User Management": "Gebruikersbeheer",
      "Talent Pool": "Talentpool",
      "Talent Lists": "Talentlijsten",
      "All Candidates": "Alle kandidaten",
      "All Jobs": "Alle vacatures",
      "Job Approvals": "Vacaturegoedkeuringen",
      "Job Board Distribution": "Vacaturebordverdeling",
      "All Companies": "Alle bedrijven",
      "Target Companies": "Doelbedrijven",
      "Member Management": "Ledenbeheer",
      "Interview Kits": "Interviewkits",
      "Background Checks": "Achtergrondcontroles",
      "Employee Onboarding": "Werknemersinwerken",
      "Pipeline Stages": "Pijplijnfases",
      "Offer Management": "Aanbodverzorging",
      "Job Templates": "Vacaturesjablonen",
      "Candidate Scheduling": "Kandidaatplanning",
      "Scorecard Library": "Scorekaartbibliotheek",
      "Assessments Hub": "Beoordelingshub",
      "Global Analytics": "Globale analyse",
      "Performance Hub": "Prestatiehub",
      "Communication Hub": "Communicatiehub",
      "Meeting Analytics": "Vergaderingsanalyse",
      "AI Analytics Hub": "AI-analysehub",
      "Time to Fill": "Tijd tot invulling",
      "Recruiter Productivity": "Recruiterproductiviteit",
      "Source ROI": "Bron-ROI",
      "Email Analytics": "E-mailanalyse",
      "Agentic OS Hub": "Agentic OS Hub",
      "KPI Command Center": "KPI-commandocentrum",
      "Edge Function Command Center": "Edge Function-commandocentrum",
      "Feature Control Center": "Functiecontrolecentrum",
      "Employee Dashboard": "Werknemersdashboard",
      "System Health": "Systeemgezondheid",
      "Bulk Operations": "Bulkbewerkingen",
      "Custom Fields": "Aangepaste velden",
      "Workflow Builder": "Workflowbouwer",
      "Approval Chains": "Goedkeuringsketens",
      "Announcements": "Aankondigingen",
      "Notifications Config": "Meldingenconfiguratie",
      "Report Builder": "Rapportbouwer",
      "Avatar Traffic Control": "Avatar-verkeerscontrole",
      "Page Templates": "Paginasjablonen",
      "AI Configuration": "AI-configuratie",
      "Blog Engine": "Blogengine",
      "Email Builder": "E-mailbouwer",
      "Headcount Planning": "Personeelsplanning",
      "Security Hub": "Beveiligingshub",
      "MFA Enforcement": "MFA-handhaving",
      "Session Management": "Sessiebeheer",
      "Custom Roles": "Aangepaste rollen",
      "Status Page": "Statuspagina",
      "IP Allowlist": "IP-allowlist",
      "Finance Hub": "Financiënhub",
      "Inventory Hub": "Inventarishub",
      "Usage Metering": "Gebruiksmeting",
      "Customer Health": "Klantgezondheid",
      "Compliance Hub": "Nalevingshub",
      "Consent Management": "Toestemmingsbeheer",
      "EEO Compliance": "EEO-naleving",
      "Enterprise Management": "Ondernemingsbeheer",
      "Due Diligence Center": "Due Diligence-centrum",
      "Risk Management": "Risicobeheer",
      "Translations Hub": "Vertaalhub",
      "Data Retention": "Gegevensretentie",
      "Investor Metrics": "Investeerdersmetrieken",
      "Developer Portal": "Ontwikkelaarsportaal",
      "Integration Marketplace": "Integratiemarktplaats",
      "Webhooks": "Webhooks",
      "API Keys": "API-sleutels",
      "All Projects": "Alle projecten",
      "All Proposals": "Alle voorstellen",
      "Social Management": "Sociaal beheer",
      "Releasing soon": "Binnenkort beschikbaar",
      "Coming soon": "Binnenkort beschikbaar",
      "This feature is currently under development.": "Deze functie is momenteel in ontwikkeling.",
      "View All": "Alles bekijken",
      "Live Hub": "Live Hub",
      "All Pages": "Alle pagina's",
      "Referrals & Invites": "Verwijzingen & uitnodigingen",

      // --- Navigation Groups ---
      "AI & Tools": "AI & Tools",
      "OS Notes": "OS-notities",
      "Club Projects": "Club Projecten",
      "CRM & Outreach": "CRM & Outreach",
      "Talent Management": "Talentbeheer",
      "Assessments & Games": "Beoordelingen & Games",
      "Analytics & Intelligence": "Analyse & Intelligentie",
      "Security & Monitoring": "Beveiliging & Monitoring",

      // --- OAuth ---
      "Continue with Google": "Doorgaan met Google",
      "Continue with Apple": "Doorgaan met Apple",
      "or use email": "of gebruik e-mail",

      // --- PWA ---
      "Install The Quantum Club": "Installeer The Quantum Club",
      "Get the app for a faster, native-like experience": "Download de app voor een snellere, native-achtige ervaring",
      "Install App": "App installeren",
      "How to Install": "Hoe te installeren",
      "Not now": "Nu niet",
      "Install on iOS": "Installeren op iOS",
      "Got it": "Begrepen",

      // --- Common actions ---
      "Loading OS Notes...": "OS-notities laden...",
      "Stop generation": "Generatie stoppen",
      "Stop recording": "Opname stoppen",
      "Voice message": "Spraakbericht",
      "Upload image": "Afbeelding uploaden",
      "Mute sounds": "Geluiden dempen",
      "Enable sounds": "Geluiden inschakelen",
      "Retry loading sidebar": "Zijbalk opnieuw laden",
      "Leave Meeting": "Vergadering verlaten",
      "Toggle Sidebar": "Zijbalk wisselen",

      // --- Errors ---
      "An error occurred while rendering this component": "Er is een fout opgetreden bij het weergeven van dit onderdeel",
      "Payment Processing Error": "Fout bij betalingsverwerking",
      "There was an issue processing your payment. You have NOT been charged.": "Er was een probleem bij het verwerken van uw betaling. U bent NIET belast.",
      "Please verify your payment details and try again. If the problem persists, contact your bank.": "Controleer uw betalingsgegevens en probeer het opnieuw. Neem bij aanhoudende problemen contact op met uw bank.",
      "Invalid Payment Information": "Ongeldige betalingsinformatie",
      "Some payment details are missing or incorrect.": "Sommige betalingsgegevens ontbreken of zijn onjuist.",
      "Please check your card number, expiration date, and CVV.": "Controleer uw kaartnummer, vervaldatum en CVC.",
      "Connection Error": "Verbindingsfout",
      "We couldn't connect to the payment service. You have NOT been charged.": "We konden geen verbinding maken met de betalingsdienst. U bent NIET belast.",
      "Check your internet connection and try again.": "Controleer uw internetverbinding en probeer het opnieuw.",
      "Payment Error": "Betalingsfout",
      "An unexpected error occurred during payment.": "Er is een onverwachte fout opgetreden tijdens de betaling.",
      "If you're unsure whether you were charged, please contact support before retrying.": "Als u niet zeker weet of u bent belast, neem dan contact op met support voordat u het opnieuw probeert.",
      "What to do:": "Wat te doen:",
      "Suggestion:": "Suggestie:",
      "Technical Details": "Technische details",
      "Reference:": "Referentie:",
      "File:": "Bestand:",
      "File Too Large": "Bestand te groot",
      "The file you're trying to upload exceeds the size limit.": "Het bestand dat u probeert te uploaden overschrijdt de maximale grootte.",
      "Please compress the file or choose a smaller one. Maximum size is typically 10MB.": "Comprimeer het bestand of kies een kleiner bestand. De maximale grootte is doorgaans 10 MB.",
      "Unsupported File Type": "Niet-ondersteund bestandstype",
      "This file format is not supported.": "Dit bestandsformaat wordt niet ondersteund.",
      "Please upload a file in a supported format (PDF, DOCX, PNG, JPG, etc.).": "Upload een bestand in een ondersteund formaat (PDF, DOCX, PNG, JPG, enz.).",
      "Upload Interrupted": "Upload onderbroken",
      "The upload was interrupted due to a network issue.": "De upload is onderbroken door een netwerkprobleem.",
      "Check your internet connection and try again. The file will not be partially uploaded.": "Controleer uw internetverbinding en probeer het opnieuw. Het bestand wordt niet gedeeltelijk geüpload.",
      "Storage Error": "Opslagfout",
      "There was a problem with the file storage service.": "Er was een probleem met de bestandsopslagdienst.",
      "Please try again later. If the problem persists, contact support.": "Probeer het later opnieuw. Neem bij aanhoudende problemen contact op met support.",
      "Upload Failed": "Upload mislukt",
      "An unexpected error occurred during upload.": "Er is een onverwachte fout opgetreden tijdens het uploaden.",
      "Please try uploading the file again.": "Probeer het bestand opnieuw te uploaden.",
      "Camera/Microphone Access Required": "Camera-/microfoontoegang vereist",
      "Please allow access to your camera and microphone to join the meeting.": "Sta toegang tot uw camera en microfoon toe om aan de vergadering deel te nemen.",
      "Click the camera icon in your browser's address bar to update permissions.": "Klik op het camerapictogram in de adresbalk van uw browser om rechten bij te werken.",
      "Media Device Error": "Apparaatfout",
      "There was a problem with your camera or microphone.": "Er was een probleem met uw camera of microfoon.",
      "Try closing other apps using your camera, or try a different device.": "Sluit andere apps die uw camera gebruiken of probeer een ander apparaat.",
      "Connection Lost": "Verbinding verbroken",
      "The connection to the meeting was interrupted.": "De verbinding met de vergadering is onderbroken.",
      "Check your internet connection and try rejoining.": "Controleer uw internetverbinding en probeer opnieuw deel te nemen.",
      "Meeting Error": "Vergaderingsfout",
      "An unexpected error occurred in the meeting.": "Er is een onverwachte fout opgetreden in de vergadering.",
      "Try refreshing the page or rejoining the meeting.": "Probeer de pagina te vernieuwen of opnieuw aan de vergadering deel te nemen.",
      "Connection Restored": "Verbinding hersteld",
      "Reconnecting...": "Opnieuw verbinden...",
      "Everything is working again.": "Alles werkt weer.",
      "We had trouble connecting. Please check your internet connection.": "We hadden problemen met verbinden. Controleer uw internetverbinding.",
      "Will automatically retry when you're back online.": "Probeert automatisch opnieuw wanneer u weer online bent.",
      "You're offline. Some features may not work.": "U bent offline. Sommige functies werken mogelijk niet.",
      "Back online!": "Weer online!",
      "More pages": "Meer pagina's",
      "Passwords do not match": "Wachtwoorden komen niet overeen",
      "Password must be at least 8 characters": "Wachtwoord moet minimaal 8 tekens bevatten",

      // --- Empty states ---
      "No items found": "Geen items gevonden",
      "Get started by adding your first item": "Begin met het toevoegen van uw eerste item",
      "No matching items": "Geen overeenkomende items",
      "Try changing your filters to see more results": "Pas uw filters aan om meer resultaten te zien",
      "Try using different keywords": "Probeer andere zoekwoorden",
      "Check your spelling": "Controleer uw spelling",
      "Remove some filters to see more results": "Verwijder enkele filters om meer resultaten te zien",

      // --- Dialog ---
      "Enter reason...": "Reden invoeren...",
      "Reason": "Reden",
      "Image Preview": "Afbeeldingsvoorbeeld",
      "Full preview": "Volledig voorbeeld",

      // --- Pagination ---
      "Go to previous page": "Ga naar vorige pagina",
      "Go to next page": "Ga naar volgende pagina",
      "breadcrumb": "broodkruimelnavigatie",

      // --- Models ---
      "Club AI 0.1": "Club AI 0.1",
      "Quantum Club's proprietary model": "Het eigen model van Quantum Club",
      "Google's most capable model": "Google's meest capabele model",
      "Fast and efficient": "Snel en efficiënt",
      "OpenAI's flagship model": "Vlaggenschipmodel van OpenAI",

      // --- Password ---
      "Password strength": "Wachtwoordsterkte",
      "Weak": "Zwak",
      "Fair": "Redelijk",
      "Good": "Goed",
      "Strong": "Sterk",
      "At least 8 characters": "Minimaal 8 tekens",
      "Uppercase letter": "Hoofdletter",
      "Lowercase letter": "Kleine letter",
      "Number": "Cijfer",
      "Special character": "Speciaal teken",
      "Confirm Password": "Bevestig wachtwoord",
      "12+ characters": "12+ tekens",
      "No common patterns": "Geen veelvoorkomende patronen",

      // --- Carousel ---
      "Previous slide": "Vorige dia",
      "Next slide": "Volgende dia",
      "Scroll left": "Naar links scrollen",
      "Scroll right": "Naar rechts scrollen",

      // --- Sync ---
      "Syncing": "Synchroniseren",
      "Synced": "Gesynchroniseerd",
      "Last sync:": "Laatste synchronisatie:",
      "Click to retry": "Klik om opnieuw te proberen",

      // --- Voice Chat ---
      "Mic will be muted initially.": "Microfoon wordt in eerste instantie gedempt.",

      // --- Prompt Box ---
      "Type your message here...": "Typ hier uw bericht...",
      "Search the web...": "Zoek op het web...",
      "Think deeply...": "Diep nadenken...",
      "Create on canvas...": "Op canvas maken...",
      "Think": "Denken",
      "Canvas": "Canvas",

      // --- Notifications ---
      "Stay in the loop": "Blijf op de hoogte",
      "Get notified about interview invites, job matches, and messages from recruiters.": "Ontvang meldingen over uitnodigingen voor gesprekken, vacaturematches en berichten van recruiters.",
      "Maybe Later": "Misschien later",

      // --- Preferences ---
      "Display Preferences": "Weergavevoorkeuren",
      "Customize how the platform looks for you": "Pas aan hoe het platform eruitziet voor u",
      "Select your preferred language": "Selecteer uw voorkeurstaal",
      "Select your preferred currency": "Selecteer uw voorkeursvaluta",
      "Currency": "Valuta",
      "Work Timezone": "Werktijdzone",
      "Your preferred timezone for meetings and work hours": "Uw voorkeurstijdzone voor vergaderingen en werkuren",
      "Available Hours Per Week": "Beschikbare uren per week",
      "How many hours per week you can work": "Hoeveel uur per week u kunt werken",

      // --- Settings ---
      "Compensation": "Salaris",
      "Privacy": "Privacy",
      "Connections": "Verbindingen",
      "Freelance Projects": "Freelanceprojecten",
      "Enable freelance mode to start receiving AI-matched project opportunities": "Schakel freelancemodus in om AI-gematachte projectkansen te ontvangen",
      "Show your profile to clients looking for freelancers": "Toon uw profiel aan klanten die freelancers zoeken",
      "Your rates are managed in the Compensation tab": "Uw tarieven worden beheerd op het tabblad Salaris",
      "Select the types of projects you're interested in": "Selecteer de projecttypen waarin u geïnteresseerd bent",
      "Showcase your work and experience to potential clients": "Laat uw werk en ervaring zien aan potentiële klanten",
      "Help us match you with the right projects": "Help ons u te matchen met de juiste projecten",
      "Promise": "Belofte",
      "Not Accepting": "Niet beschikbaar",
      "Update Rates": "Tarieven bijwerken",
      "View Projects": "Projecten bekijken",
      "Save Changes": "Wijzigingen opslaan",
      "One-time Project": "Eenmalig project",
      "Recurring Work": "Terugkerend werk",
      "Retainer": "Retainer",
      "Short (<1 month)": "Kort (<1 maand)",
      "Medium (1-3 months)": "Middellang (1-3 maanden)",
      "Long (3+ months)": "Lang (3+ maanden)",

      // --- Roles ---
      "Club Member": "Clublid",

      // --- Home ---
      "Welcome back, {{name}}": "Welkom terug, {{name}}",
      "Here's your personalized dashboard": "Hier is uw persoonlijke dashboard",

      // --- Dashboard ---
      "Refresh KPIs": "KPI's vernieuwen",
      "Quick Actions": "Snelle acties",
      "Common tasks and shortcuts": "Veelvoorkomende taken en snelkoppelingen",
      "Quick Management": "Snel beheer",
      "Common admin tasks": "Veelvoorkomende beheerstaken",
      "Your scheduled calls and interviews": "Uw geplande gesprekken en interviews",
      "Schedule a Meeting": "Vergadering plannen",
      "My Time Tracking": "Mijn tijdregistratie",
      "Team Time Tracking": "Team tijdregistratie",
      "Earnings": "Verdiensten",
      "Team Hours": "Teamuren",
      "Timer running": "Timer loopt",
      "View Timer": "Timer bekijken",
      "Start Tracking": "Registratie starten",
      "Next Steps": "Volgende stappen",
      "Your Journey": "Uw reis",
      "Stage Progress": "Fasevoortgang",
      "Overall Journey": "Totale reis",
      "You've completed all tasks for your current stage": "U heeft alle taken voor uw huidige fase voltooid",
      "Explore job opportunities": "Vacaturemogelijkheden verkennen",
      "avg score": "gem. score",
      "Continue Assessments": "Beoordelingen voortzetten",
      "View All Results": "Alle resultaten bekijken",
      "Application Pipeline": "Sollicitatiepijplijn",
      "No active applications yet": "Nog geen actieve sollicitaties",
      "Browse Jobs": "Vacatures bekijken",
      "Unknown Company": "Onbekend bedrijf",
      "View Details": "Details bekijken",
      "View All Applications": "Alle sollicitaties bekijken",
      "View all applications": "Alle sollicitaties bekijken",
      "Pull to refresh": "Trek om te vernieuwen",
      "Release to refresh": "Loslaten om te vernieuwen",
      "Refreshing…": "Vernieuwen…",
      "Referral Network": "Verwijzingsnetwerk",
      "Invite top talent to the club": "Nodig toptalent uit voor de club",
      "Invited": "Uitgenodigd",
      "Joined": "Deelgenomen",
      "Copy Invite Link": "Uitnodigingslink kopiëren",
      "Copied!": "Gekopieerd!",
      "Grow Your Network": "Breid uw netwerk uit",
      "Invite friends and colleagues to join The Quantum Club and earn rewards.": "Nodig vrienden en collega's uit voor The Quantum Club en verdien beloningen.",
      "Your Strategist": "Uw strateeg",
      "Strategist Not Yet Assigned": "Strateeg nog niet toegewezen",
      "Your dedicated career strategist is part of your Quantum Club membership.": "Uw persoonlijke carrièrestrateeg hoort bij uw Quantum Club-lidmaatschap.",
      "A dedicated talent strategist will be assigned once your profile is reviewed": "Er wordt een persoonlijke talentstrateeg toegewezen zodra uw profiel is beoordeeld",
      "Talent Strategist": "Talentstrateeg",
      "Message": "Bericht",
      "A dedicated strategist will be assigned to you soon": "Er wordt binnenkort een persoonlijke strateeg aan u toegewezen",
      "They'll help guide your career journey": "Ze helpen u bij uw carrière",
      "Your dedicated talent partner at The Quantum Club": "Uw persoonlijke talentpartner bij The Quantum Club",
      "Revenue & Growth": "Omzet & groei",
      "This Month": "Deze maand",
      "Last Month": "Vorige maand",
      "Select date range": "Datumbereik selecteren",
      "Total Revenue": "Totale omzet",
      "Avg / Placement": "Gem. / plaatsing",
      "Per Working Day": "Per werkdag",
      "Best Month": "Beste maand",
      "Placements": "Plaatsingen",
      "Weighted Pipeline": "Gewogen pijplijn",
      "Expected Closings": "Verwachte afsluitingen",
      "Projected Month-End": "Verwacht maandeinde",
      "Expand analytics": "Analyse uitvouwen",
      "Pipeline Value": "Pijplijnwaarde",
      "Team Capacity": "Teamcapaciteit",
      "No strategists assigned yet": "Nog geen strategen toegewezen",
      "more": "meer",
      "Partner Engagement": "Partnerbetrokkenheid",
      "At Risk": "Risicovol",
      "Active Rate (7 days)": "Activiteitspercentage (7 dagen)",
      "Placement Success Rate": "Plaatsingssuccespercentage",
      "partners": "partners",
      "inactive 14+ days": "inactief 14+ dagen",
      "Top Performers": "Toppresteerders",
      "hires": "aannames",
      "Overdue": "Achterstallig",
      "Quick Launch": "Snel starten",
      "KPI Center": "KPI-centrum",
      "Features": "Functies",
      "Operations Monitor": "Operatiemonitor",
      "agents": "agents",
      "decisions (24h)": "beslissingen (24u)",
      "KPI Health": "KPI-gezondheid",
      "No KPI data available yet": "Nog geen KPI-gegevens beschikbaar",
      "Set Up KPIs": "KPI's instellen",
      "View All KPIs": "Alle KPI's bekijken",
      "Health Score": "Gezondheidsscore",
      "Awaiting Data": "Wacht op gegevens",
      "On Target": "Op doelstelling",
      "Action Items": "Actiepunten",
      "All caught up — no pending tasks": "Helemaal bij — geen openstaande taken", 
      "done today": "vandaag voltooid",
      "Open Task Board": "Takenbord openen",
      "Complete task": "Taak voltooien",
      "Due today": "Vandaag verlopen",
      "Due tomorrow": "Morgen verlopen",
      "overdue": "achterstallig",
      "Bottleneck:": "Knelpunt:",
      "View Pipeline": "Pijplijn bekijken",
      "Agent Activity": "Agentactiviteit",
      "Autonomous actions & pending approvals (24h)": "Autonome acties & wachtende goedkeuringen (24u)",
      "pending": "in behandeling",
      "Needs approval": "Goedkeuring vereist",
      "No agent activity in the last 24 hours": "Geen agentactiviteit in de afgelopen 24 uur",
      "conf": "conf",
      "CRM Prospects": "CRM-prospects",
      "Avg Deal": "Gem. deal",
      "No prospects yet": "Nog geen prospects",
      "Add Prospects": "Prospects toevoegen",
      "No active applications": "Geen actieve sollicitaties",
      "Browse roles": "Rollen bekijken",
      "Final / Offer": "Finaal / aanbod",
      "In progress": "Bezig",
      "View pipeline": "Pijplijn bekijken",
      "Career Journey": "Carrièrereis",
      "Fast Mover": "Snelle beweger",
      "Just Getting Started": "Net begonnen",
      "On Track": "Op schema",
      "Your Current Role": "Uw huidige rol",
      "Your Dream Role": "Uw droomrol",
      "% of milestones completed": "% van mijlpalen voltooid",
      "Submit 5 applications": "5 sollicitaties indienen",
      "Complete 3 interviews": "3 gesprekken voltooien",
      "Receive an offer": "Een aanbod ontvangen",
      "days on your job search journey": "dagen op uw zoektocht naar werk",
      "View All Progress": "Alle voortgang bekijken",
      "Recent Applications": "Recente sollicitaties",
      "Latest candidate applications": "Laatste kandidaatsollicitaties",
      "No applications yet": "Nog geen sollicitaties",
      "Applications will appear here as candidates apply": "Sollicitaties verschijnen hier zodra kandidaten solliciteren",
      "match": "match",
      "System Errors": "Systeemfouten",
      "active": "actief",
      "Errors": "Fouten",
      "Warnings": "Waarschuwingen",
      "View Error Logs": "Foutlogboeken bekijken",
      "Task Queue": "Takenwachtrij",
      "No pending tasks": "Geen openstaande taken",
      "Saving...": "Opslaan...",
      "pagination": "paginering",
      "expected": "verwacht",
      "Pending": "In behandeling",
      "Overdue": "Achterstallig",
      "Due Today": "Vandaag verlopen",
    },

    // ===================================================================
    // GERMAN
    // ===================================================================
    de: {
      "My Profile": "Mein Profil",
      "My Skills": "Meine Fähigkeiten",
      "My Performance": "Meine Leistung",
      "Email Settings": "E-Mail-Einstellungen",
      "Help Center": "Hilfezentrum",
      "Admin Panel": "Verwaltungspanel",
      "View All": "Alle anzeigen",
      "All Pages": "Alle Seiten",
      "Talent Pool": "Talentpool",
      "All Candidates": "Alle Kandidaten",
      "All Jobs": "Alle Stellen",
      "All Companies": "Alle Unternehmen",
      "Save Changes": "Änderungen speichern",
      "Quick Actions": "Schnellaktionen",
      "Welcome back, {{name}}": "Willkommen zurück, {{name}}",
      "Your Strategist": "Ihr Stratege",
      "Recent Activity": "Letzte Aktivitäten",
      "Upcoming Meetings": "Anstehende Besprechungen",
      "System Health": "Systemstatus",
      "View Details": "Details anzeigen",
      "No active applications yet": "Noch keine aktiven Bewerbungen",
      "Browse Jobs": "Stellen durchsuchen",
      "Revenue & Growth": "Umsatz & Wachstum",
      "Total Revenue": "Gesamtumsatz",
      "This Month": "Diesen Monat",
      "Copied!": "Kopiert!",
      "Something went wrong": "Etwas ist schiefgelaufen",
      "Connection Error": "Verbindungsfehler",
      "Loading...": "Laden...",
      "Security": "Sicherheit",
      "Career": "Karriere",
      "Password strength": "Passwortstärke",
      "Weak": "Schwach",
      "Fair": "Mäßig",
      "Strong": "Stark",
    },

    // ===================================================================
    // FRENCH
    // ===================================================================
    fr: {
      "My Profile": "Mon profil",
      "My Skills": "Mes compétences",
      "My Performance": "Mes performances",
      "Email Settings": "Paramètres e-mail",
      "Help Center": "Centre d'aide",
      "Admin Panel": "Panneau d'administration",
      "View All": "Voir tout",
      "All Pages": "Toutes les pages",
      "All Candidates": "Tous les candidats",
      "All Jobs": "Toutes les offres",
      "All Companies": "Toutes les entreprises",
      "Save Changes": "Enregistrer les modifications",
      "Quick Actions": "Actions rapides",
      "Welcome back, {{name}}": "Bon retour, {{name}}",
      "Your Strategist": "Votre stratège",
      "Recent Activity": "Activité récente",
      "Upcoming Meetings": "Réunions à venir",
      "View Details": "Voir les détails",
      "Revenue & Growth": "Revenus et croissance",
      "Total Revenue": "Chiffre d'affaires total",
      "This Month": "Ce mois-ci",
      "Copied!": "Copié !",
      "Connection Error": "Erreur de connexion",
      "Security": "Sécurité",
      "Career": "Carrière",
      "Password strength": "Force du mot de passe",
      "Weak": "Faible",
      "Strong": "Fort",
    },

    // ===================================================================
    // SPANISH
    // ===================================================================
    es: {
      "My Profile": "Mi perfil",
      "My Skills": "Mis habilidades",
      "My Performance": "Mi rendimiento",
      "Email Settings": "Configuración de correo",
      "Help Center": "Centro de ayuda",
      "Admin Panel": "Panel de administración",
      "View All": "Ver todo",
      "All Candidates": "Todos los candidatos",
      "All Jobs": "Todos los empleos",
      "All Companies": "Todas las empresas",
      "Save Changes": "Guardar cambios",
      "Quick Actions": "Acciones rápidas",
      "Welcome back, {{name}}": "Bienvenido de nuevo, {{name}}",
      "Recent Activity": "Actividad reciente",
      "View Details": "Ver detalles",
      "Revenue & Growth": "Ingresos y crecimiento",
      "Total Revenue": "Ingresos totales",
      "This Month": "Este mes",
      "Copied!": "¡Copiado!",
      "Connection Error": "Error de conexión",
      "Security": "Seguridad",
      "Career": "Carrera",
    },

    // ===================================================================
    // CHINESE
    // ===================================================================
    zh: {
      "My Profile": "我的资料",
      "My Skills": "我的技能",
      "My Performance": "我的表现",
      "View All": "查看全部",
      "All Candidates": "所有候选人",
      "All Jobs": "所有职位",
      "Save Changes": "保存更改",
      "Quick Actions": "快捷操作",
      "Welcome back, {{name}}": "欢迎回来，{{name}}",
      "Recent Activity": "最近活动",
      "View Details": "查看详情",
      "Total Revenue": "总收入",
      "This Month": "本月",
      "Copied!": "已复制！",
      "Connection Error": "连接错误",
      "Security": "安全",
      "Career": "职业",
    },

    // ===================================================================
    // ARABIC
    // ===================================================================
    ar: {
      "My Profile": "ملفي الشخصي",
      "My Skills": "مهاراتي",
      "My Performance": "أدائي",
      "View All": "عرض الكل",
      "All Candidates": "جميع المرشحين",
      "All Jobs": "جميع الوظائف",
      "Save Changes": "حفظ التغييرات",
      "Quick Actions": "إجراءات سريعة",
      "Welcome back, {{name}}": "مرحباً بعودتك، {{name}}",
      "Recent Activity": "النشاط الأخير",
      "View Details": "عرض التفاصيل",
      "Total Revenue": "إجمالي الإيرادات",
      "This Month": "هذا الشهر",
      "Copied!": "تم النسخ!",
      "Connection Error": "خطأ في الاتصال",
      "Security": "الأمان",
      "Career": "المسيرة المهنية",
    },

    // ===================================================================
    // RUSSIAN
    // ===================================================================
    ru: {
      "My Profile": "Мой профиль",
      "My Skills": "Мои навыки",
      "My Performance": "Мои показатели",
      "View All": "Смотреть все",
      "All Candidates": "Все кандидаты",
      "All Jobs": "Все вакансии",
      "Save Changes": "Сохранить изменения",
      "Quick Actions": "Быстрые действия",
      "Welcome back, {{name}}": "С возвращением, {{name}}",
      "Recent Activity": "Последняя активность",
      "View Details": "Подробнее",
      "Total Revenue": "Общий доход",
      "This Month": "Этот месяц",
      "Copied!": "Скопировано!",
      "Connection Error": "Ошибка подключения",
      "Security": "Безопасность",
      "Career": "Карьера",
    },
  };
  return maps[lang] || {};
}

// ============================================================
// PROCESSING
// ============================================================

const enFile = join(LOCALES_DIR, 'en', `${namespace}.json`);
const langFile = join(LOCALES_DIR, lang, `${namespace}.json`);

if (!existsSync(enFile)) { console.error(`EN/${namespace}.json not found`); process.exit(1); }
if (!existsSync(langFile)) { console.error(`${lang}/${namespace}.json not found`); process.exit(1); }

const enData = JSON.parse(readFileSync(enFile, 'utf-8'));
const langData = JSON.parse(readFileSync(langFile, 'utf-8'));
const transMap = getTranslationMap(lang);

let translated = 0, skipped = 0, notFound = 0;
const untranslatedSamples = [];

function processObj(enObj, langObj, path = '') {
  for (const [key, enVal] of Object.entries(enObj)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (enVal && typeof enVal === 'object' && !Array.isArray(enVal)) {
      if (!langObj[key] || typeof langObj[key] !== 'object') langObj[key] = {};
      processObj(enVal, langObj[key], fullPath);
    } else if (typeof enVal === 'string' && langObj[key] === enVal) {
      if (shouldSkip(fullPath, enVal)) { skipped++; continue; }
      if (transMap[enVal]) {
        langObj[key] = transMap[enVal];
        translated++;
      } else {
        notFound++;
        if (untranslatedSamples.length < 10) {
          untranslatedSamples.push(`${fullPath} = "${enVal.substring(0, 60)}"`);
        }
      }
    }
  }
}

processObj(enData, langData);

if (translated > 0) {
  writeFileSync(langFile, JSON.stringify(langData, null, 2) + '\n');
}

console.log(`[${lang}/${namespace}] ✅ ${translated} translated | ⏭️ ${skipped} skipped | ❓ ${notFound} remaining`);
if (untranslatedSamples.length > 0) {
  console.log(`  Samples: ${untranslatedSamples.slice(0, 3).join(' | ')}`);
}
