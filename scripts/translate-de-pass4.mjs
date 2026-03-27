#!/usr/bin/env node
/**
 * Pass 4: Comprehensive German translations for all remaining untranslated keys.
 * Covers common, admin, partner, candidates, meetings, settings, jobs namespaces.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');

// ── common.json translations ──────────────────────────────────────────
const commonTranslations = {
  // academy
  "Academy Not Found": "Akademie nicht gefunden",
  "Return Home": "Zur Startseite",
  "My Courses": "Meine Kurse",
  "Explore": "Entdecken",
  "Featured Courses": "Empfohlene Kurse",
  "Continue Learning": "Weiterlernen",
  "Trending Now": "Im Trend",
  "New Releases": "Neuerscheinungen",
  "All Materials": "Alle Materialien",
  "Not Started": "Nicht gestartet",
  "Explore Our Academy Courses": "Entdecken Sie unsere Akademie-Kurse",
  "Master the skills that matter.": "Meistern Sie die Faehigkeiten, die zaehlen.",
  "Start Learning \\u2192": "Jetzt lernen \\u2192",
  "Sort By": "Sortieren nach",
  "Share your thoughts about this course...": "Teilen Sie Ihre Meinung zu diesem Kurs...",
  "Your Review (Optional)": "Ihre Bewertung (Optional)",
  "Module Title *": "Modultitel *",
  "Description *": "Beschreibung *",
  "Jobs Matching Your Skills": "Jobs passend zu Ihren Faehigkeiten",
  "Complete more courses to unlock job matches": "Schliessen Sie weitere Kurse ab, um passende Jobs freizuschalten",
  "Top learners in The Quantum Club Academy": "Top-Lernende in der The Quantum Club Akademie",
  "Finished watching? Mark this module as complete": "Fertig angeschaut? Markieren Sie dieses Modul als abgeschlossen",
  "Take notes while you learn... Auto-saves every 2 seconds": "Machen Sie Notizen beim Lernen... Automatisches Speichern alle 2 Sekunden",
  "Keep learning daily to maintain your streak!": "Lernen Sie taeglich weiter, um Ihre Serie beizubehalten!",
  "Complete courses to unlock achievements!": "Schliessen Sie Kurse ab, um Erfolge freizuschalten!",
  "{{count}} course": "{{count}} Kurs",
  "{{count}} courses": "{{count}} Kurse",
  "{{count}} result": "{{count}} Ergebnis",
  "{{count}} results": "{{count}} Ergebnisse",
  "{{count}} Lessons": "{{count}} Lektionen",
  "Home": "Startseite",
  "My Learning": "Mein Lernbereich",

  // incubator
  "Ask for help with calculations, strategy, or specific sections...": "Fragen Sie nach Hilfe bei Berechnungen, Strategie oder bestimmten Abschnitten...",
  "Analyzing your question...": "Ihre Frage wird analysiert...",
  "Press Enter to send, Shift+Enter for new line": "Enter zum Senden, Shift+Enter fuer neue Zeile",
  "AI assistant is initializing. Please wait a moment and try again.": "Der KI-Assistent wird initialisiert. Bitte warten Sie einen Moment und versuchen Sie es erneut.",
  "Rate limit reached. Please wait a moment.": "Anfragelimit erreicht. Bitte warten Sie einen Moment.",
  "AI credits depleted. Please add funds.": "KI-Guthaben aufgebraucht. Bitte laden Sie auf.",
  "Read carefully. You have 45 seconds.": "Lesen Sie sorgfaeltig. Sie haben 45 Sekunden.",
  "Budget (12 weeks)": "Budget (12 Wochen)",
  "Auto-advancing in": "Automatischer Fortschritt in",
  "I'm Ready \\u2014 Start Now": "Ich bin bereit \\u2014 Jetzt starten",
  "Ask questions, run calculations, and get strategic feedback": "Stellen Sie Fragen, fuehren Sie Berechnungen durch und erhalten Sie strategisches Feedback",
  "Need 300-450 words total to proceed": "Insgesamt 300-450 Woerter erforderlich, um fortzufahren",
  "Review your one-pager and optionally add a 30-second voice rationale.": "Ueberpruefen Sie Ihren Einseiter und fuegen Sie optional eine 30-sekuendige Sprachbegruendung hinzu.",
  "Voice Rationale (Optional)": "Sprachbegruendung (Optional)",
  "Record a 30-second explanation of your strategy. This helps us understand your thinking process.": "Nehmen Sie eine 30-sekuendige Erklaerung Ihrer Strategie auf. Das hilft uns, Ihren Denkprozess zu verstehen.",
  "Lock in your north star. These answers will guide your plan and help us measure consistency.": "Legen Sie Ihren Nordstern fest. Diese Antworten leiten Ihren Plan und helfen uns, Konsistenz zu messen.",
  "Answer each question in 1-2 sentences. Be specific and concise.": "Beantworten Sie jede Frage in 1-2 Saetzen. Seien Sie spezifisch und praegnant.",
  "Lock In Framework & Continue": "Framework festlegen & Fortfahren",
  "Fill out all fields to continue": "Fuellen Sie alle Felder aus, um fortzufahren",

  // assessments & achievements
  "Assessment Center": "Assessment-Center",
  "Discover your strengths and unlock opportunities through our comprehensive assessment suite": "Entdecken Sie Ihre Staerken und erschliessen Sie Chancen durch unsere umfassende Bewertungssuite",
  "Timeline of Ascendance": "Aufstiegschronik",
  "Your quantum journey through achievement": "Ihre Quantum-Reise durch Erfolge",
  "Achievement Gallery": "Erfolgs-Galerie",
  "Community Feed": "Community-Feed",
  "Leaderboard": "Bestenliste",
  "Achievement Paths": "Erfolgspfade",
  "Custom Company Achievements": "Individuelle Firmen-Erfolge",
  "Complete the challenge to earn bonus XP!": "Schliessen Sie die Herausforderung ab, um Bonus-XP zu verdienen!",
  "Progress": "Fortschritt",
  "Reaction removed": "Reaktion entfernt",
  "Quantum applause sent!": "Quantum-Applaus gesendet!",
  "achievements": "Erfolge",
  "Unlock achievements in sequence to progress through skill trees": "Schalten Sie Erfolge der Reihe nach frei, um in den Faehigkeitsbaeumen voranzukommen",
  "Last progress": "Letzter Fortschritt",
  "Complete the challenge to unlock this achievement": "Schliessen Sie die Herausforderung ab, um diesen Erfolg freizuschalten",
  "You discovered this secret!": "Sie haben dieses Geheimnis entdeckt!",
  "Achievement shared to your feed!": "Erfolg in Ihrem Feed geteilt!",
  "Influence": "Einfluss",
  "Innovation": "Innovation",
  "Social": "Sozial",
  "Learning": "Lernen",
  "Prestige": "Ansehen",
  "Pioneer": "Pionier",
  "Common": "Haeufig",
  "Rare": "Selten",
  "Epic": "Episch",
  "Legendary": "Legendaer",
  "Quantum": "Quantum",
  "Apply to jobs": "Auf Jobs bewerben",
  "Complete courses": "Kurse abschliessen",
  "Refer friends": "Freunde empfehlen",
  "Send messages": "Nachrichten senden",
  "Save jobs": "Jobs speichern",
  "Complete profile": "Profil vervollstaendigen",
  "Take action": "Handeln",
  "Less than a day": "Weniger als ein Tag",
  "~1 day": "~1 Tag",
  "~{{count}} days": "~{{count}} Tage",
  "~{{count}} weeks": "~{{count}} Wochen",
  "~{{count}} months": "~{{count}} Monate",

  // toast single chars (leave as-is, they're individual letters)
  // academyCreatorHub
  "Track student engagement, course completion rates, and more": "Verfolgen Sie Studentenengagement, Kursabschlussraten und mehr",
  "Creator Hub": "Ersteller-Hub",
  "Total Courses": "Kurse gesamt",
  "Total Modules": "Module gesamt",
  "Total Students": "Studenten gesamt",
  "Analytics Coming Soon": "Analysen in Kuerze verfuegbar",

  // adminRejections
  "Platform-wide rejection analytics and insights": "Plattformweite Ablehnungsanalysen und Erkenntnisse",
  "Global Rejections": "Globale Ablehnungen",
  "Total Rejections": "Ablehnungen gesamt",
  "Top Reason": "Hauptgrund",
  "Companies": "Unternehmen",

  // blogCategory & blogEngine
  "Category Not Found": "Kategorie nicht gefunden",
  "The category you're looking for doesn't exist.": "Die gesuchte Kategorie existiert nicht.",
  "Blog Engine": "Blog-Engine",
  "Total Articles": "Artikel gesamt",
  "Drafts Pending Review": "Entwuerfe zur Ueberpruefung",
  "Posts/Day": "Beitraege/Tag",
  "Auto-Publish": "Automatisch veroeffentlichen",
  "Expert Review": "Expertenpruefung",
  "Min Quality": "Mindestqualitaet",
  "Publishing Window": "Veroeffentlichungsfenster",
  "Frequently Asked Questions": "Haeufig gestellte Fragen",
  "The article you're looking for doesn't exist.": "Der gesuchte Artikel existiert nicht.",

  // bookingManagement
  "Booking Management": "Buchungsverwaltung",
  "Brief description of the meeting": "Kurze Beschreibung des Meetings",
  "Min Notice (hours)": "Mindestvorlaufzeit (Stunden)",
  "Buffer Before (min)": "Puffer davor (Min.)",
  "Buffer After (min)": "Puffer danach (Min.)",
  "Advance Booking (days)": "Vorausbuchung (Tage)",
  "Primary Calendar": "Primaerer Kalender",
  "Select calendar": "Kalender auswaehlen",
  "Enable Club AI Assistant": "Club AI Assistent aktivieren",
  "Color": "Farbe",
  "Calendar Connections": "Kalenderverbindungen",
  "Min Notice": "Mindestvorlaufzeit",
  "Booking URL": "Buchungs-URL",
  "No calendars connected": "Keine Kalender verbunden",
  "Total Bookings": "Buchungen gesamt",
  "No Shows": "Nicht erschienen",
  "Delete Booking Link": "Buchungslink loeschen",

  // bookingPage
  "Organization logo": "Organisationslogo",
  "Powered by The Quantum Club": "Bereitgestellt von The Quantum Club",

  // careerPath
  "Explore potential career paths and what it takes to get there": "Erkunden Sie moegliche Karrierewege und was dafuer noetig ist",
  "Master core skills and build a strong technical foundation": "Kernkompetenzen meistern und eine starke technische Grundlage aufbauen",
  "Take on more complex projects and develop leadership skills": "Uebernehmen Sie komplexere Projekte und entwickeln Sie Fuehrungskompetenzen",
  "Demonstrate consistent performance and readiness for the next level": "Zeigen Sie konsistente Leistung und Bereitschaft fuer die naechste Stufe",
  "Career Progression": "Karriereentwicklung",
  "Required Skills": "Erforderliche Faehigkeiten",
  "Year 0-1: Foundation": "Jahr 0-1: Grundlage",
  "Identify skill gaps and create a learning plan": "Identifizieren Sie Kompetenzluecken und erstellen Sie einen Lernplan",
  "Find a mentor who has made this transition": "Finden Sie einen Mentor, der diesen Uebergang gemacht hat",
  "Take on stretch projects that align with the target role": "Uebernehmen Sie Herausforderungsprojekte, die zur Zielrolle passen",
  "Build visibility with decision-makers in your organization": "Bauen Sie Sichtbarkeit bei Entscheidungstraegern in Ihrer Organisation auf",

  // certificateVerification
  "This certificate verifies that the holder has successfully completed the course requirements.": "Dieses Zertifikat bestaetigt, dass der Inhaber die Kursanforderungen erfolgreich erfuellt hat.",
  "Certificate Not Found": "Zertifikat nicht gefunden",
  "Verified Certificate": "Verifiziertes Zertifikat",
  "Certificate of Completion": "Abschlusszertifikat",
  "Certificate Number": "Zertifikatsnummer",
  "Issued On": "Ausgestellt am",
  "Skills Demonstrated": "Nachgewiesene Faehigkeiten",

  // clubAI
  "Welcome to Club AI": "Willkommen bei Club AI",
  "Your personal AI career strategist, available 24/7": "Ihr persoenlicher KI-Karrierestratege, rund um die Uhr verfuegbar",
  "No conversations yet. Start chatting!": "Noch keine Gespraeche. Starten Sie einen Chat!",
  "Club AI is thinking...": "Club AI denkt nach...",

  // clubDJ
  "Club DJ Dashboard": "Club DJ Dashboard",
  "Broadcasting to The Quantum Club Radio": "Live auf The Quantum Club Radio",
  "DJ Now Live!": "DJ jetzt live!",

  // companyApplications
  "Applications Hub": "Bewerbungs-Hub",
  "Candidates Table": "Kandidatentabelle",

  // companyIntelligence
  "Company Intelligence Unavailable": "Firmenintelligenz nicht verfuegbar",
  "Company Intelligence Dashboard": "Firmenintelligenz-Dashboard",
  "Total Interactions": "Interaktionen gesamt",
  "Avg Sentiment": "Durchschnittl. Stimmung",
  "Avg Urgency": "Durchschnittl. Dringlichkeit",
  "Stakeholders": "Stakeholder",
  "Insights": "Erkenntnisse",
  "Recent Interactions": "Aktuelle Interaktionen",
  "Latest communication with this company": "Letzte Kommunikation mit diesem Unternehmen",
  "High Urgency": "Hohe Dringlichkeit",
  "Interaction Breakdown": "Interaktions-Aufschluesselung",
  "Company Stakeholders": "Unternehmens-Stakeholder",
  "Key people at this company": "Schluesselpersonen bei diesem Unternehmen",
  "AI-powered analysis of your company interactions": "KI-gestuetzte Analyse Ihrer Unternehmensinteraktionen",
  "Sentiment Trend": "Stimmungstrend",
  "Preferred Channel": "Bevorzugter Kanal",

  // companyPage
  "This company is not part of The Quantum Club network.": "Dieses Unternehmen ist nicht Teil des The Quantum Club Netzwerks.",
  "Latest news articles and press mentions": "Neueste Nachrichtenartikel und Presseerwaenungen",
  "Company Not Found": "Unternehmen nicht gefunden",
  "Company header": "Firmenkopf",
  "Followers": "Follower",
  "Open Roles": "Offene Stellen",
  "About": "Ueber uns",
  "Culture": "Kultur",
  "Our Values": "Unsere Werte",
  "Brand Voice & Knowledge": "Markenstimme & Wissen",
  "Configure how the AI represents this company.": "Konfigurieren Sie, wie die KI dieses Unternehmen repraesentiert.",
  "Brand Brain Configuration": "Marken-Brain-Konfiguration",
  "Instructions and knowledge sources for the RAG engine.": "Anweisungen und Wissensquellen fuer die RAG-Engine.",
  "Open Positions": "Offene Positionen",
  "Team & Staff": "Team & Mitarbeiter",
  "Organizational structure and team members": "Organisationsstruktur und Teammitglieder",
  "Directory": "Verzeichnis",
  "Org Chart": "Organigramm",
  "Departments": "Abteilungen",
  "All Team Members": "Alle Teammitglieder",
  "News & Press": "Nachrichten & Presse",
  "Benefits & Perks": "Vorteile & Extras",

  // courseDetail
  "Expert Instructor & Industry Professional": "Erfahrener Dozent & Branchenexperte",
  "No reviews yet. Be the first to review this course!": "Noch keine Bewertungen. Seien Sie der Erste!",
  "Expert instructor with extensive industry experience.": "Erfahrener Dozent mit umfangreicher Branchenerfahrung.",
  "Course not found": "Kurs nicht gefunden",
  "Back to Academy": "Zurueck zur Akademie",
  "Course preview coming soon": "Kursvorschau in Kuerze verfuegbar",
  "Instructor": "Dozent",
  "Reviews": "Bewertungen",
  "About This Course": "Ueber diesen Kurs",
  "What You'll Learn": "Was Sie lernen werden",
  "Student Reviews": "Studentenbewertungen",
  "Course Notes": "Kursnotizen",
  "Course Content": "Kursinhalt",

  // courseEdit
  "Update your course details and settings": "Aktualisieren Sie Ihre Kursdetails und Einstellungen",
  "Approximate time to complete the course": "Geschaetzte Zeit bis zum Kursabschluss",
  "Featured image for the course (optional)": "Titelbild fuer den Kurs (optional)",
  "Optional preview video for the course": "Optionales Vorschauvideo fuer den Kurs",
  "Back to Creator Hub": "Zurueck zum Ersteller-Hub",
  "Edit Course": "Kurs bearbeiten",
  "Basic Info": "Grundlegende Informationen",
  "Details": "Details",
  "Describe what students will learn in this course...": "Beschreiben Sie, was Studenten in diesem Kurs lernen werden...",
  "Difficulty Level": "Schwierigkeitsgrad",
  "Beginner": "Anfaenger",
  "Intermediate": "Fortgeschritten",
  "Advanced": "Experte",
  "Estimated Hours": "Geschaetzte Stunden",
  "Course Image URL": "Kursbild-URL",
  "Course Preview Video URL": "Kursvorschau-Video-URL",
  "Course Modules": "Kursmodule",

  // coverLetterGenerator
  "Generate personalized, AI-powered cover letters tailored to specific job opportunities": "Erstellen Sie personalisierte, KI-gestuetzte Anschreiben, zugeschnitten auf bestimmte Stellenangebote",
  "Choose from your applications or saved jobs": "Waehlen Sie aus Ihren Bewerbungen oder gespeicherten Jobs",
  "Professional, conversational, or executive style": "Professionell, umgangssprachlich oder fuehrungsbezogen",
  "Edit, export to PDF, or save to your documents": "Bearbeiten, als PDF exportieren oder in Ihren Dokumenten speichern",
  "Powered by QUIN": "Unterstuetzt von QUIN",
  "Choose Your Tone": "Waehlen Sie Ihren Tonfall",
  "Generate & Customize": "Erstellen & Anpassen",

  // documentManagement
  "No documents uploaded": "Keine Dokumente hochgeladen",
  "Upload and manage your resumes, CVs, and certificates": "Laden Sie Ihre Lebenslaeufe, CVs und Zertifikate hoch und verwalten Sie diese",
  "Upload your resume or CV to get started with job applications": "Laden Sie Ihren Lebenslauf oder CV hoch, um mit Bewerbungen zu beginnen",

  // emailSequencingHub
  "AI-powered email sequencing with smart reply analysis, predictive lead scoring, and optimal send timing": "KI-gestuetzte E-Mail-Sequenzierung mit intelligenter Antwortanalyse, praediktivem Lead-Scoring und optimalem Sendezeitpunkt",
  "Error loading data": "Fehler beim Laden der Daten",
  "No Campaigns Yet": "Noch keine Kampagnen",
  "Per-Campaign Breakdown": "Aufschluesselung pro Kampagne",
  "Email Intelligence Hub": "E-Mail-Intelligenz-Hub",

  // enhancedProfile
  "Stealth Mode Active": "Stealth-Modus aktiv",
  "Import data and manage your profile": "Daten importieren und Profil verwalten",
  "Music": "Musik",
  "Communications": "Kommunikation",
  "Admin Settings": "Admin-Einstellungen",
  "Profile Strength": "Profilstaerke",

  // expertMarketplace
  "Assign": "Zuweisen",
  "Book Session": "Sitzung buchen",
  "Expert Marketplace": "Experten-Marktplatz",
  "Connect experts with learning modules": "Experten mit Lernmodulen verbinden",
  "Bio": "Biografie",
  "Tell us about your expertise...": "Erzaehlen Sie uns von Ihrer Expertise...",
  "Expertise Areas (comma-separated)": "Fachgebiete (kommagetrennt)",
  "Years of Experience": "Jahre Erfahrung",
  "Limited Availability": "Eingeschraenkte Verfuegbarkeit",
  "Currently Unavailable": "Derzeit nicht verfuegbar",
  "Assign Expert to Module": "Experte einem Modul zuweisen",
  "Module": "Modul",
  "Select module": "Modul auswaehlen",
  "Expert": "Experte",
  "Select expert": "Experte auswaehlen",
  "Experts": "Experten",
  "Modules": "Module",
  "Assignments": "Zuweisungen",
  "Assigned to:": "Zugewiesen an:",
  "Remove Assignment?": "Zuweisung entfernen?",
  "Date & Time": "Datum & Uhrzeit",
  "Session Type": "Sitzungstyp",
  "Mentorship": "Mentoring",
  "Code Review": "Code-Review",
  "Career Advice": "Karriereberatung",
  "What would you like to discuss?": "Was moechten Sie besprechen?",

  // feedbackDatabase
  "Monitor user satisfaction and track improvements": "Benutzerzufriedenheit ueberwachen und Verbesserungen verfolgen",
  "Rating": "Bewertung",
  "Submitted": "Eingereicht",
  "User Comment": "Benutzerkommentar",
  "Navigation Trail": "Navigationspfad",
  "Resolution": "Loesung",
  "Resolution Status": "Loesungsstatus",
  "Response Message": "Antwortnachricht",
  "All Feedback": "Alle Rueckmeldungen",
  "Page Analytics": "Seitenanalysen",
  "Error Logs": "Fehlerprotokolle",

  // gigDetailPage
  "No FAQs available.": "Keine FAQs verfuegbar.",
  "Gig Not Found": "Auftrag nicht gefunden",
  "Browse Gigs": "Auftraege durchsuchen",
  "About Seller": "Ueber den Anbieter",
  "No reviews yet. Be the first to order!": "Noch keine Bewertungen. Seien Sie der Erste!",
  "Related Tags": "Verwandte Schlagwoerter",

  // guestBookingPage
  "Your Booking Details": "Ihre Buchungsdetails",
  "This booking may have been cancelled or the link is invalid.": "Diese Buchung wurde moeglicherweise storniert oder der Link ist ungueltig.",
  "Booking Not Found": "Buchung nicht gefunden",
  "Host": "Gastgeber",
  "Video Meeting": "Video-Meeting",
  "Reason for cancellation...": "Grund fuer die Stornierung...",
  "This booking has been cancelled": "Diese Buchung wurde storniert",
  "This meeting has passed": "Dieses Meeting ist bereits vorbei",
  "You have special permissions for this meeting": "Sie haben besondere Berechtigungen fuer dieses Meeting",
  "Booked by": "Gebucht von",
  "Need to make changes?": "Muessen Aenderungen vorgenommen werden?",

  // install
  "How to Install": "Installation",
  "The Quantum Club is now installed on your device. Enjoy the full app experience!": "The Quantum Club ist jetzt auf Ihrem Geraet installiert. Geniessen Sie die volle App-Erfahrung!",
  "Get the app for faster access, offline support, and push notifications. \n              No app store required.": "Holen Sie sich die App fuer schnelleren Zugriff, Offline-Support und Push-Benachrichtigungen.\n              Kein App Store erforderlich.",
  "Tap the Share button": "Tippen Sie auf den Teilen-Button",
  "Scroll down in the share menu to find this option": "Scrollen Sie im Teilen-Menue nach unten, um diese Option zu finden",
  "Confirm to add the app to your home screen": "Bestaetigen Sie, um die App zu Ihrem Startbildschirm hinzuzufuegen",
  "Look for the install icon": "Suchen Sie das Installations-Symbol",
  "Or use the button above to trigger the installation": "Oder verwenden Sie den Button oben, um die Installation auszuloesen",
  "Launch from desktop or app drawer": "Starten Sie vom Desktop oder der App-Schublade",
  "Find The Quantum Club in your apps": "Finden Sie The Quantum Club in Ihren Apps",
  "Prefer to continue in the browser?": "Lieber im Browser weiterarbeiten?",
  "Go to Dashboard": "Zum Dashboard",

  // interactionsFeed
  "Interactions Unavailable": "Interaktionen nicht verfuegbar",
  "Interaction Feed": "Interaktions-Feed",
  "All company interactions across the platform": "Alle Unternehmensinteraktionen auf der Plattform",
  "All Types": "Alle Typen",
  "Phone Calls": "Telefonanrufe",
  "Emails": "E-Mails",
  "Zoom Meetings": "Zoom-Meetings",
  "In Person": "Persoenlich",
  "All Sentiments": "Alle Stimmungen",
  "Neutral": "Neutral",

  // interviewComparison
  "Interview Comparison": "Interview-Vergleich",
  "No candidates with interview feedback found for this role.": "Keine Kandidaten mit Interview-Feedback fuer diese Rolle gefunden.",
  "Skills Comparison": "Faehigkeiten-Vergleich",

  // interviewPrep
  "Start applying to roles to access company-specific interview preparation": "Bewerben Sie sich auf Stellen, um unternehmensspezifische Interviewvorbereitung zu erhalten",
  "Interview Prep Unavailable": "Interviewvorbereitung nicht verfuegbar",
  "No Active Interviews": "Keine aktiven Interviews",
  "Interview Preparation": "Interviewvorbereitung",
  "QUIN is analyzing the job description...": "QUIN analysiert die Stellenbeschreibung...",
  "Key themes to emphasize": "Schwerpunktthemen zum Hervorheben",
  "Company insights": "Unternehmens-Einblicke",
  "Why they ask:": "Warum sie fragen:",
  "Tip:": "Tipp:",
  "Could not load AI questions": "KI-Fragen konnten nicht geladen werden",
  "Try Again": "Erneut versuchen",
  "Generating smart questions...": "Intelligente Fragen werden generiert...",
  "What it reveals:": "Was es verraet:",
  "Select an application to generate questions": "Waehlen Sie eine Bewerbung aus, um Fragen zu generieren",

  // interviewPrepChat
  "Practice your interview with an AI interviewer that knows your company and role": "Ueben Sie Ihr Interview mit einem KI-Interviewer, der Ihr Unternehmen und Ihre Rolle kennt",
  "Start Interview Practice": "Interviewuebung starten",
  "Interview Prep Room": "Interviewvorbereitungsraum",
  "Position": "Position",
  "Choose a stage": "Waehlen Sie eine Phase",
  "Type your response...": "Geben Sie Ihre Antwort ein...",

  // investorPortal
  "This portal is strictly confidential. Access is logged.": "Dieses Portal ist streng vertraulich. Zugriffe werden protokolliert.",
  "Access code": "Zugangscode",

  // inviteAcceptance
  "By signing up, you agree to our Terms of Service and Privacy Policy": "Mit der Anmeldung stimmen Sie unseren Nutzungsbedingungen und der Datenschutzerklaerung zu",
  "Invalid Invitation": "Ungueltige Einladung",
  "Welcome to The Quantum Club": "Willkommen bei The Quantum Club",
  "Relevant Opportunities:": "Relevante Moeglichkeiten:",

  // knowledgeBase
  "Find answers and learn about The Quantum Club platform": "Finden Sie Antworten und erfahren Sie mehr ueber die The Quantum Club Plattform",
  "Knowledge Base": "Wissensdatenbank",
  "Popular Articles": "Beliebte Artikel",

  // mfaSetup
  "Scan this QR code with your authenticator app, then enter the 6-digit code.": "Scannen Sie diesen QR-Code mit Ihrer Authenticator-App und geben Sie den 6-stelligen Code ein.",
  "Two-factor authentication is now active on your account. Redirecting...": "Zwei-Faktor-Authentifizierung ist jetzt auf Ihrem Konto aktiv. Weiterleitung...",
  "Verify Your Identity": "Identitaet verifizieren",
  "Set Up Two-Factor Authentication": "Zwei-Faktor-Authentifizierung einrichten",
  "Scan QR Code": "QR-Code scannen",
  "MFA QR Code": "MFA-QR-Code",
  "MFA Enabled": "MFA aktiviert",

  // moduleDetail
  "Module not found": "Modul nicht gefunden",
  "Back to Academy": "Zurueck zur Akademie",
  "Media content coming soon": "Medieninhalte in Kuerze verfuegbar",
  "Module Content": "Modulinhalt",
  "Module content will appear here. This can include:": "Modulinhalte werden hier angezeigt. Dazu gehoeren:",
  "Text lessons and explanations": "Textlektionen und Erklaerungen",
  "Code examples and exercises": "Codebeispiele und Uebungen",
  "Interactive quizzes": "Interaktive Quizze",
  "Downloadable resources": "Herunterladbare Ressourcen",
  "Expert notes and tips": "Expertennotizen und Tipps",
  "Your Progress": "Ihr Fortschritt",
  "Video Watched": "Video angesehen",

  // moduleEdit
  "Update your module details": "Aktualisieren Sie Ihre Moduldetails",
  "Approximate time to complete the module": "Geschaetzte Zeit bis zum Modulabschluss",
  "Edit Module": "Modul bearbeiten",
  "Video Content": "Videoinhalt",
  "Current Video": "Aktuelles Video",
  "Video preview": "Videovorschau",
  "Module Image": "Modulbild",
  "Current Image": "Aktuelles Bild",

  // moduleManagement
  "Course not found": "Kurs nicht gefunden",
  "Course Modules": "Kursmodule",

  // mySkillsPage
  "Track your verified skills from completed courses": "Verfolgen Sie Ihre verifizierten Faehigkeiten aus abgeschlossenen Kursen",
  "Complete courses to earn verified skills": "Schliessen Sie Kurse ab, um verifizierte Faehigkeiten zu erhalten",
  "My Skills": "Meine Faehigkeiten",
  "No Skills Yet": "Noch keine Faehigkeiten",
  "Browse Courses": "Kurse durchsuchen",

  // objectiveWorkspace
  "Tasks": "Aufgaben",

  // offerComparison
  "Compare and evaluate your job offers with Club AI's insights": "Vergleichen und bewerten Sie Ihre Stellenangebote mit Club AI Erkenntnissen",
  "When you receive job offers, they'll appear here for easy comparison and negotiation support.": "Wenn Sie Stellenangebote erhalten, erscheinen diese hier zum einfachen Vergleich und zur Verhandlungsunterstuetzung.",
  "Offer Comparison": "Angebotsvergleich",
  "Total Offers": "Angebote gesamt",
  "Accepted": "Angenommen",
  "Negotiating": "In Verhandlung",
  "Highest Offer": "Hoechstes Angebot",
  "Negotiation Tips": "Verhandlungstipps",

  // privacyPolicy
  "Explainability": "Erklaerbarkeit",
  "Some third-party processors (e.g., AI services) may process data outside the EU. We ensure protection through:": "Einige Drittanbieter (z.B. KI-Dienste) verarbeiten Daten moeglicherweise ausserhalb der EU. Wir gewaehrleisten Schutz durch:",
  "Active Candidates": "Aktive Kandidaten",
  "Partners/Clients": "Partner/Kunden",
  "Backups": "Sicherungen",
  "Marketing Data": "Marketingdaten",
  "Until consent is withdrawn": "Bis zum Widerruf der Einwilligung",
  "Right to Request Deletion": "Recht auf Loeschung",
  "Edit your profile information anytime through your account settings.": "Bearbeiten Sie Ihre Profilinformationen jederzeit ueber Ihre Kontoeinstellungen.",
  "Export your data in machine-readable JSON format for transfer to other services.": "Exportieren Sie Ihre Daten im maschinenlesbaren JSON-Format zur Uebertragung an andere Dienste.",
  "Opt-out of marketing, profiling, and AI processing at any time through Settings.": "Deaktivieren Sie Marketing, Profiling und KI-Verarbeitung jederzeit ueber die Einstellungen.",
  "Disable stealth mode, revoke Club Sync permissions, or withdraw sharing consent anytime.": "Deaktivieren Sie den Stealth-Modus, widerrufen Sie Club Sync-Berechtigungen oder ziehen Sie die Freigabe-Einwilligung jederzeit zurueck.",
  "We implement industry-standard security practices:": "Wir setzen branchenuebliche Sicherheitspraktiken um:",
  "Required for authentication, session management, and core platform functionality. Cannot be disabled.": "Erforderlich fuer Authentifizierung, Sitzungsverwaltung und Kernfunktionalitaet der Plattform. Kann nicht deaktiviert werden.",
  "Store your preferences (theme, language, saved filters). You can clear these via browser settings.": "Speichern Ihre Einstellungen (Design, Sprache, gespeicherte Filter). Sie koennen diese ueber die Browser-Einstellungen loeschen.",

  // projectApplyPage
  "You need to set up your freelance profile before applying to projects": "Sie muessen Ihr Freelance-Profil einrichten, bevor Sie sich auf Projekte bewerben koennen",
  "Become a Freelancer": "Freelancer werden",
  "Apply to Project": "Auf Projekt bewerben",
  "Club AI Proposal Generator": "Club AI Vorschlagsgenerator",
  "Explain why you're the perfect fit for this project...": "Erklaeren Sie, warum Sie perfekt fuer dieses Projekt geeignet sind...",
  "Rate:": "Stundensatz:",
  "Timeline:": "Zeitrahmen:",
  "Cover Letter:": "Anschreiben:",

  // projectDetailPage
  "This project may have been removed or is no longer available.": "Dieses Projekt wurde moeglicherweise entfernt oder ist nicht mehr verfuegbar.",
  "Project Not Found": "Projekt nicht gefunden",
  "Project Description": "Projektbeschreibung",
  "Requirements & Skills": "Anforderungen & Faehigkeiten",
  "Required Skills": "Erforderliche Faehigkeiten",
  "Nice to Have": "Wuenschenswert",
  "Experience Level": "Erfahrungsstufe",
  "Similar Projects": "Aehnliche Projekte",
  "Ready to Apply?": "Bereit zur Bewerbung?",
  "Lower Match Score": "Niedrigerer Match-Score",

  // projectsPage
  "Club Projects": "Club Projekte",
  "Premium freelance marketplace powered by Club AI": "Premium-Freelance-Marktplatz unterstuetzt von Club AI",
  "Active Projects": "Aktive Projekte",
  "Avg. Match Score": "Durchschnittl. Match-Score",
  "Browse Projects": "Projekte durchsuchen",
  "My Dashboard": "Mein Dashboard",
  "Client View": "Kundenansicht",

  // radio
  "Tune in to live DJ broadcasts or stream mood-based playlists": "Hoeren Sie Live-DJ-Sendungen oder streamen Sie stimmungsbasierte Playlists",
  "Quantum Club Radio": "Quantum Club Radio",
  "Live Broadcast": "Live-Sendung",
  "Waiting for track...": "Warten auf Track...",
  "Hosted by": "Moderiert von",
  "Listening Now": "Hoeren gerade zu",

  // referralProgram
  "Start sharing your referral link to earn rewards": "Teilen Sie Ihren Empfehlungslink, um Praemien zu verdienen",
  "Referral Program": "Empfehlungsprogramm",
  "Total Earned": "Gesamtverdienst",
  "Lifetime earnings": "Lebenszeitverdienst",
  "Under review": "In Pruefung",
  "Qualified": "Qualifiziert",
  "Ready for payout": "Bereit zur Auszahlung",
  "Total Referrals": "Empfehlungen gesamt",
  "All time": "Gesamtzeit",
  "Your Referral Link": "Ihr Empfehlungslink",
  "Share this link with companies and candidates": "Teilen Sie diesen Link mit Unternehmen und Kandidaten",
  "How it works:": "So funktioniert es:",
  "Share your unique referral link": "Teilen Sie Ihren einzigartigen Empfehlungslink",
  "They sign up and become active users": "Sie melden sich an und werden aktive Benutzer",
  "You earn rewards when they qualify": "Sie verdienen Praemien, wenn sie sich qualifizieren",
  "Get paid when requirements are met": "Erhalten Sie Auszahlung, wenn die Anforderungen erfuellt sind",
  "Bonus Structure": "Bonusstruktur",
  "Earn based on referral type": "Verdienen Sie basierend auf dem Empfehlungstyp",
  "Your Referrals": "Ihre Empfehlungen",
  "Track the status of all your referrals": "Verfolgen Sie den Status aller Ihrer Empfehlungen",

  // resetPasswordSuccess
  "For security, all active sessions were invalidated. Please sign in with your new password.": "Aus Sicherheitsgruenden wurden alle aktiven Sitzungen beendet. Bitte melden Sie sich mit Ihrem neuen Passwort an.",

  // AI Analysis
  "AI Analysis": "KI-Analyse",
  "AI Suggested": "KI-Vorschlag",
  "AI-driven objectives in progress": "KI-gesteuerte Ziele in Bearbeitung",
  "AI-powered task orchestration \\u2022 Auto-prioritization \\u2022 Smart scheduling": "KI-gestuetzte Aufgabenorchestrierung \\u2022 Automatische Priorisierung \\u2022 Intelligente Planung",
  "AVOID": "VERMEIDEN",
  "Acceptable Use Policy": "Nutzungsrichtlinie",
  "Accessibility Statement": "Barrierefreiheitserklaerung",
  "Accounts Active": "Aktive Konten",
  "Acme Digital Agency": "Acme Digital Agency",
  "Acme Inc.": "Acme Inc.",
  "Acted Upon": "Umgesetzt",
  "Action executed": "Aktion ausgefuehrt",
  "Action failed": "Aktion fehlgeschlagen",
  "Activating your subscription...": "Ihr Abonnement wird aktiviert...",
  "A dedicated strategist will be assigned to you soon": "Ein dedizierter Stratege wird Ihnen in Kuerze zugewiesen",
  "A waitlist guest has been notified of the available slot!": "Ein Wartelisten-Gast wurde ueber den verfuegbaren Platz benachrichtigt!",
  "+1 234 567 8900": "+1 234 567 8900",
  "Youre Fully Set Up Your": "Sie sind vollstaendig eingerichtet",
  "Start Learning \\u2192": "Jetzt lernen \\u2192",
};

// ── admin.json translations ──────────────────────────────────────────
const adminTranslations = {
  "Active threshold must be less than Warning threshold": "Aktiver Schwellenwert muss kleiner als Warnschwellenwert sein",
  "Reason for Decline (will be sent to applicant)": "Ablehnungsgrund (wird an den Bewerber gesendet)",
  "Partner declined, but the notification email could not be sent.": "Partner abgelehnt, aber die Benachrichtigungs-E-Mail konnte nicht gesendet werden.",
  "These were generated with the old schema and render as empty.": "Diese wurden mit dem alten Schema generiert und werden leer dargestellt.",
  "Publish articles automatically when quality passes.": "Artikel automatisch veroeffentlichen, wenn die Qualitaet ausreicht.",
  "Hold articles for manual review before publishing.": "Artikel zur manuellen Pruefung vor der Veroeffentlichung zurueckhalten.",
  "No learnings yet. The engine discovers patterns as it generates and analyzes content.": "Noch keine Erkenntnisse. Die Engine erkennt Muster, waehrend sie Inhalte generiert und analysiert.",
  "Queue is empty. Add a topic above or generate AI suggestions.": "Warteschlange ist leer. Fuegen Sie oben ein Thema hinzu oder generieren Sie KI-Vorschlaege.",
  "SOC 2 Audit Report (Last 90 Days)": "SOC 2 Audit-Bericht (Letzte 90 Tage)",
  "Click ')Test PITR' to run your first test": "Klicken Sie auf 'PITR testen', um Ihren ersten Test auszufuehren",
  "Password must be at least 12 characters": "Passwort muss mindestens 12 Zeichen lang sein",
  "Events by device type (last 5 minutes)": "Ereignisse nach Geraetetyp (letzte 5 Minuten)",
  "Logins": "Anmeldungen",
  "Sourced": "Beschafft",
  "Click any row to see full details. Click column headers to sort.": "Klicken Sie auf eine Zeile fuer alle Details. Klicken Sie auf Spaltenkoepfe zum Sortieren.",
  "Comprehensive activity, performance, and earnings data": "Umfassende Aktivitaets-, Leistungs- und Einnahmedaten",
  "No heartbeat runs yet. The system will start pulsing soon.": "Noch keine Heartbeat-Laeufe. Das System wird bald starten.",
  "No sourcing missions yet for this role.": "Noch keine Sourcing-Missionen fuer diese Rolle.",
  "Will be added to company as partner": "Wird als Partner zum Unternehmen hinzugefuegt",
  "Approve member request and grant platform access": "Mitgliedsantrag genehmigen und Plattformzugang gewaehren",
  "Admin ID is missing. Please refresh and try again.": "Admin-ID fehlt. Bitte aktualisieren Sie die Seite und versuchen Sie es erneut.",
  "E.g., 'Complete this for the Product Manager role'": "Z.B. 'Schliessen Sie dies fuer die Product Manager Rolle ab'",
  "Assessments": "Bewertungen",
  "Assessment Results": "Bewertungsergebnisse",
  "Total Completed": "Gesamt abgeschlossen",
  "Average Score": "Durchschnittsnote",
  "Pass Rate": "Bestehensquote",
  "Document a new security incident for tracking and resolution.": "Dokumentieren Sie einen neuen Sicherheitsvorfall zur Nachverfolgung und Loesung.",
  "Current performance against service level targets": "Aktuelle Leistung gegenueber Service-Level-Zielen",
  "SLA breaches in the last 30 days": "SLA-Verstoesse in den letzten 30 Tagen",
  "Service Level Agreement monitoring and compliance": "Service Level Agreement Ueberwachung und Einhaltung",
  "No violations in the last 30 days": "Keine Verstoesse in den letzten 30 Tagen",
  "Brand Assets": "Marken-Assets",
  "Custom Domain": "Benutzerdefinierte Domain",
  "Advanced Customization": "Erweiterte Anpassung",
  "Define the color palette for this tenant": "Definieren Sie die Farbpalette fuer diesen Mandanten",
  "Upload logos and favicons": "Logos und Favicons hochladen",
  "Configure a custom domain for this tenant": "Benutzerdefinierte Domain fuer diesen Mandanten konfigurieren",
  "Custom CSS and email templates": "Benutzerdefiniertes CSS und E-Mail-Vorlagen",
  "Logo URL": "Logo-URL",
  "Favicon URL": "Favicon-URL",
  "Custom CSS": "Benutzerdefiniertes CSS",
  "Email Footer": "E-Mail-Fusszeile",
  "Customize branding for enterprise tenants": "Branding fuer Unternehmenskunden anpassen",
  "White Label Mode": "White-Label-Modus",
  "Enable custom branding for this company": "Benutzerdefiniertes Branding fuer dieses Unternehmen aktivieren",
  "DNS Configuration": "DNS-Konfiguration",
  "White Label Configuration": "White-Label-Konfiguration",
  "Preview Text": "Vorschautext",
  "Choose a company to configure": "Waehlen Sie ein Unternehmen zur Konfiguration",
  "Branding settings saved": "Branding-Einstellungen gespeichert",
  "SLA": "SLA",
  "Functions with open circuit breakers (temporarily disabled)": "Funktionen mit offenen Sicherungsschaltern (voruebergehend deaktiviert)",
  "No AI function calls in the last 24 hours": "Keine KI-Funktionsaufrufe in den letzten 24 Stunden",
  "Cache AI responses for repeated queries to reduce API calls": "KI-Antworten fuer wiederholte Anfragen zwischenspeichern, um API-Aufrufe zu reduzieren",
  "Review meeting recordings - consider auto-cleanup after 90 days": "Meeting-Aufnahmen ueberpruefen - automatische Bereinigung nach 90 Tagen erwaegen",
  "Configure these URLs in your identity provider": "Konfigurieren Sie diese URLs in Ihrem Identitaetsprovider",
  "Groups provisioned from your identity provider": "Gruppen aus Ihrem Identitaetsprovider bereitgestellt",
  "Configure automated user provisioning from your identity provider": "Automatische Benutzerbereitstellung aus Ihrem Identitaetsprovider konfigurieren",
  "System": "System",
  "Monitor webhook delivery health and manage failed deliveries": "Webhook-Zustellungsstatus ueberwachen und fehlgeschlagene Zustellungen verwalten",

  // aIConfiguration
  "Additional Considerations": "Zusaetzliche Ueberlegungen",
  "Fine-tune the matching algorithm to optimize candidate-job fit": "Feinabstimmung des Matching-Algorithmus zur Optimierung der Kandidaten-Job-Passung",
  "Overall Match Score": "Gesamt-Match-Score",
  "Hypothetical Test": "Hypothetischer Test",
  "Real Data Test": "Realdaten-Test",

  // activationFunnel
  "Activation Funnel": "Aktivierungstrichter",
  "Track user progression through key milestones": "Benutzerfortschritt durch wichtige Meilensteine verfolgen",
  "Last 7 days": "Letzte 7 Tage",
  "Last 90 days": "Letzte 90 Tage",
  "User progression through activation milestones": "Benutzerfortschritt durch Aktivierungsmeilensteine",
  "Average time users take to reach each milestone": "Durchschnittliche Zeit bis zum Erreichen jedes Meilensteins",

  // adminAuditLog
  "Blocked": "Blockiert",
  "All Events": "Alle Ereignisse",
  "Authentication": "Authentifizierung",
  "User Actions": "Benutzeraktionen",
  "Security": "Sicherheit",
  "Recent Events": "Aktuelle Ereignisse",
  "Showing last 100 events": "Letzte 100 Ereignisse anzeigen",
  "Events will appear here as actions are performed": "Ereignisse erscheinen hier, wenn Aktionen ausgefuehrt werden",

  // adminExports
  "One-time admin export. These downloads are generated on demand and require an authenticated session.": "Einmaliger Admin-Export. Diese Downloads werden auf Anfrage generiert und erfordern eine authentifizierte Sitzung.",
  "Download all SQL parts": "Alle SQL-Teile herunterladen",
  "Database exports": "Datenbankexporte",
  "Warnings": "Warnungen",

  // adminUserProfile
  "This is the user's public profile view. Edit capabilities are disabled in admin mode.": "Dies ist die oeffentliche Profilansicht des Benutzers. Bearbeitungsfunktionen sind im Admin-Modus deaktiviert.",
  "User profile not found.": "Benutzerprofil nicht gefunden.",
  "Email Verified": "E-Mail verifiziert",
  "Has Candidate Profile": "Hat Kandidatenprofil",
  "Profile Overview": "Profiluebersicht",
  "Complete Settings": "Vollstaendige Einstellungen",
  "Verification": "Verifizierung",
  "Resume": "Lebenslauf",
  "Primary resume document": "Primaeres Lebenslaufdokument",
  "Account Verification Status": "Kontoverifizierungsstatus",
  "Email Verification": "E-Mail-Verifizierung",
  "Phone Verification": "Telefon-Verifizierung",
  "Account Activity": "Kontoaktivitaet",
  "Created:": "Erstellt:",
  "Last Updated:": "Zuletzt aktualisiert:",
  "Last Sign In:": "Letzte Anmeldung:",

  // announcementsPage
  "ANNOUNCEMENTS": "ANKUENDIGUNGEN",
  "Banner": "Banner",
  "Modal": "Modal",
  "Toast": "Toast",
  "Normal": "Normal",
  "Expires At (optional)": "Laeuft ab am (optional)",
  "Dismissible": "Abweisbar",
  "Targets": "Zielgruppen",
  "Actions": "Aktionen",

  // avatarControlHub
  "No job data yet. Start a session linked to a job to see insights.": "Noch keine Jobdaten. Starten Sie eine Sitzung mit einem verknuepften Job, um Erkenntnisse zu sehen.",
  "Possibly left running": "Moeglicherweise noch aktiv",
  "Very short": "Sehr kurz",
  "Over 2x expected": "Ueber 2x erwartet",
  "Account Traffic Control": "Konto-Verkehrssteuerung",
  "Total Accounts": "Konten gesamt",
  "Active Sessions": "Aktive Sitzungen",
  "Accounts": "Konten",
  "Session History": "Sitzungsverlauf",
  "Recent Sessions": "Aktuelle Sitzungen",
  "Correct time": "Korrekte Zeit",
  "No sessions yet.": "Noch keine Sitzungen.",
  "Sessions": "Sitzungen",
  "Total Time": "Gesamtzeit",
  "Avg / Session": "Durchschnitt / Sitzung",

  // bulkOperationsHub
  "Bulk Operations Hub": "Massenoperations-Hub",
  "Perform bulk actions on candidates and pipeline data": "Massenaktionen fuer Kandidaten und Pipeline-Daten durchfuehren",

  // candidateSchedulingAdmin
  "Rescheduled": "Umgeplant",
  "Submitted": "Eingereicht",
  "Reschedule": "Umplanen",

  // companyRelationships
  "Monitor and manage relationships with partner companies": "Beziehungen zu Partnerunternehmen ueberwachen und verwalten",
  "Company Relationships": "Unternehmensbeziehungen",
  "Total Emails Tracked": "E-Mails gesamt verfolgt",
  "Need Attention": "Aufmerksamkeit erforderlich",
  "Contacts": "Kontakte",
  "Sentiment Analysis": "Stimmungsanalyse",
  "Company Contacts": "Unternehmenskontakte",
  "Per-Person Sentiment": "Pro-Person-Stimmung",

  // consentManagementPage
  "Processing Activities (ROPA)": "Verarbeitungstaetigkeiten (VVT)",
  "Granted": "Erteilt",
  "Expires": "Laeuft ab",
  "Record of Processing Activities (GDPR Art. 30)": "Verzeichnis der Verarbeitungstaetigkeiten (DSGVO Art. 30)",
  "Retention": "Aufbewahrung",
  "Required": "Erforderlich",
  "N/A": "N/V",
  "Activities involving data transfers outside EU/EEA": "Taetigkeiten mit Datentransfers ausserhalb der EU/des EWR",

  // conversationAnalytics
  "Conversation Analytics": "Gespraeche-Analysen",
  "Messaging metrics and communication insights": "Nachrichtenmetriken und Kommunikations-Einblicke",
  "Total Messages (30d)": "Nachrichten gesamt (30T)",
  "Avg Response Time": "Durchschnittl. Antwortzeit",
  "Active Conversations": "Aktive Gespraeche",
  "AI-Assisted": "KI-unterstuetzt",
  "Message Volume Trend": "Nachrichtenvolumen-Trend",
  "Daily message and conversation counts": "Taegliche Nachrichten- und Gespraechszaehlung",
  "Communication sentiment breakdown": "Kommunikations-Stimmungsaufschluesselung",

  // customerHealthPage
  "Usage": "Nutzung",
  "Adoption": "Uebernahme",

  // dueDiligenceDashboard
  "Investor-ready metrics, documentation, and data room": "Investorentaugliche Metriken, Dokumentation und Datenraum",
  "Due Diligence Center": "Due-Diligence-Center",

  // edgeFunctionCommandCenter
  "Monitor, control, and optimize all backend functions across the platform.": "Alle Backend-Funktionen plattformweit ueberwachen, steuern und optimieren.",
  "Edge Function Command Center": "Edge Function Kommandozentrale",

  // emailNotificationManagement
  "Email Notification Management": "E-Mail-Benachrichtigungsverwaltung",
  "Configure who receives which email notifications across the platform": "Konfigurieren Sie, wer welche E-Mail-Benachrichtigungen auf der Plattform erhaelt",

  // emailTemplateManager
  "Subject:": "Betreff:",
  "Function:": "Funktion:",

  // emailTrackingAnalytics
  "Sent": "Gesendet",
  "Bounced": "Zurueckgewiesen",
  "Recipient": "Empfaenger",
  "Delivered": "Zugestellt",
  "Opens": "Oeffnungen",
  "Clicks": "Klicks",
  "Engaged": "Engagiert",
  "Opened": "Geoeffnet",

  // employeeManagement
  "Comprehensive HR, performance, and commission management": "Umfassendes HR-, Leistungs- und Provisionsmanagement",
  "Employee Management": "Mitarbeiterverwaltung",
  "Employees": "Mitarbeiter",
  "Paid YTD": "Bezahlt lfd. Jahr",
  "Pending Reviews": "Ausstehende Bewertungen",
  "Profiles": "Profile",
  "Commissions": "Provisionen",
  "Payouts": "Auszahlungen",
  "Training": "Schulung",
  "Onboarding": "Onboarding",

  // enterpriseDashboard
  "SOC 2 compliance, SLA monitoring, disaster recovery, and white-label configuration": "SOC 2 Compliance, SLA-Ueberwachung, Disaster Recovery und White-Label-Konfiguration",
  "Enterprise Management": "Enterprise-Verwaltung",

  // expenseTracking
  "Track operating expenses, recurring costs, and vendor subscriptions": "Betriebsausgaben, wiederkehrende Kosten und Anbieter-Abonnements verfolgen",
  "Expense Ledger": "Ausgabenbuch",
  "Vendor": "Anbieter",
  "One-time": "Einmalig",
  "Receipt attached": "Beleg angehaengt",

  // financialDashboard
  "Revenue Overview": "Umsatzuebersicht",
  "Monthly invoiced vs collected revenue": "Monatlich fakturierter vs. eingezogener Umsatz",
  "Top Clients": "Top-Kunden",
  "Highest revenue partners this year": "Umsatzstaerkste Partner dieses Jahr",
  "Moneybird Invoices": "Moneybird-Rechnungen",
  "Individual invoice records synced from Moneybird": "Einzelne Rechnungseintraege synchronisiert aus Moneybird",
  "Cash Flow Pipeline": "Cashflow-Pipeline",
  "Visual pipeline of expected revenue by collection status": "Visuelle Pipeline des erwarteten Umsatzes nach Einzugsstatus",
  "Placement Fees": "Vermittlungsgebuehren",
  "Referral Payouts": "Empfehlungsauszahlungen",
  "VAT & Tax": "MwSt. & Steuern",
  "Track and manage placement fees generated from hires": "Vermittlungsgebuehren aus Einstellungen verfolgen und verwalten",
  "Partner Invoices": "Partner-Rechnungen",
  "Generate and manage invoices for partner companies": "Rechnungen fuer Partnerunternehmen erstellen und verwalten",
  "Review and approve referral reward payouts": "Empfehlungspraemien-Auszahlungen ueberpruefen und genehmigen",
  "VAT Register": "MwSt.-Register",
  "Quarterly VAT breakdown for BTW-aangifte filing": "Quartalsweise MwSt.-Aufschluesselung fuer BTW-Erklaerung",

  // globalAnalytics
  "Cross-company insights, funnel performance and platform engagement": "Unternehmensuebergreifende Erkenntnisse, Trichterleistung und Plattform-Engagement",
  "Platform Overview": "Plattformuebersicht",
  "User Engagement": "Benutzer-Engagement",
  "Applications Trend": "Bewerbungstrend",
  "Conversion Funnel": "Konversionstrichter",
  "Top Companies": "Top-Unternehmen",

  // godMode
  "Elevated Privileges Active": "Erhoehte Rechte aktiv",
  "All actions in this panel are logged and audited. Use with extreme caution.": "Alle Aktionen in diesem Panel werden protokolliert und auditiert. Verwenden Sie es mit aeusserster Vorsicht.",
  "Feature Flags": "Feature-Flags",
  "User Lookup": "Benutzersuche",
  "Impersonation": "Benutzeruebernahme",
  "Database": "Datenbank",
  "Toggle features on/off across the platform": "Features plattformweit ein-/ausschalten",
  "No Feature Flags": "Keine Feature-Flags",
  "Feature flags will appear here when configured in the database.": "Feature-Flags erscheinen hier, wenn sie in der Datenbank konfiguriert sind.",
  "Search and view any user's profile": "Beliebiges Benutzerprofil suchen und anzeigen",
  "Searching...": "Suche...",
  "Impersonation Sessions": "Uebernahmesitzungen",
  "No Impersonation Sessions": "Keine Uebernahmesitzungen",
  "No admin impersonation sessions have been recorded.": "Keine Admin-Uebernahmesitzungen aufgezeichnet.",
  "Database Tools": "Datenbankwerkzeuge",
  "Direct database access and maintenance tools": "Direkter Datenbankzugriff und Wartungswerkzeuge",
  "Cache Management": "Cache-Verwaltung",
  "Clear application caches": "Anwendungscaches leeren",
  "Clear All Caches": "Alle Caches leeren",
  "Session Management": "Sitzungsverwaltung",
  "Force logout all users": "Alle Benutzer abmelden erzwingen",
  "Invalidate All Sessions": "Alle Sitzungen ungueltig machen",

  // integrationMarketplace
  "Installed": "Installiert",
  "Categories": "Kategorien",

  // investorMetrics
  "Conservative SaaS multiple": "Konservatives SaaS-Multiple",
  "Growth SaaS multiple": "Wachstums-SaaS-Multiple",
  "Premium SaaS multiple": "Premium-SaaS-Multiple",
  "Collected revenue": "Eingezogener Umsatz",
  "Active customers and retention": "Aktive Kunden und Kundenbindung",
  "Total Customers": "Kunden gesamt",
  "Active (12mo)": "Aktiv (12 Mon.)",
  "Net Revenue Retention": "Nettoumsatzbindung",
  "Logo Retention": "Logo-Retention",
  "LTV, CAC, and payback period": "LTV, CAC und Amortisationszeit",
  "LTV:CAC Ratio": "LTV:CAC-Verhaeltnis",
  "Rule of 40": "Rule of 40",
  "Platform usage and engagement": "Plattformnutzung und Engagement",
  "Total Users": "Benutzer gesamt",
  "Placements": "Vermittlungen",
  "Placement Rate": "Vermittlungsquote",
  "Avg Deal Size": "Durchschnittl. Auftragsgroesse",

  // invoiceReconciliation
  "Link Moneybird invoices to companies for revenue attribution": "Moneybird-Rechnungen mit Unternehmen fuer Umsatzzuordnung verknuepfen",
  "Invoice Reconciliation": "Rechnungsabgleich",
  "Total Invoices": "Rechnungen gesamt",
  "Matched": "Abgeglichen",
  "Unmatched": "Nicht abgeglichen",
  "Needs Review": "Pruefung erforderlich",
  "Match Rate": "Abgleichsquote",
  "Unmatched Invoices": "Nicht abgeglichene Rechnungen",
  "Moneybird Contact": "Moneybird-Kontakt",
  "Matched Invoices": "Abgeglichene Rechnungen",
  "Linked Company": "Verknuepftes Unternehmen",
  "Needs Finance Review": "Finanzpruefung erforderlich",
  "Variance": "Abweichung",

  // jobAnalyticsIndex
  "Per-Job Analytics": "Job-Analysen",
  "Active Jobs": "Aktive Jobs",
  "Avg. Applications": "Durchschnittl. Bewerbungen",
  "New This Month": "Neu diesen Monat",
  "No Active Jobs": "Keine aktiven Jobs",

  // jobApprovals
  "Job Approvals": "Job-Genehmigungen",
  "Review and approve jobs submitted by partners.": "Ueberpruefen und genehmigen Sie von Partnern eingereichte Jobs.",
  "No jobs pending approval.": "Keine Jobs zur Genehmigung ausstehend.",

  // jobPostingTemplates
  "We're looking for...": "Wir suchen...",
  "Templates": "Vorlagen",
  "Global": "Global",

  // marketplaceAnalytics
  "Marketplace Analytics": "Marktplatz-Analysen",
  "Platform performance and GMV metrics": "Plattformleistung und GMV-Metriken",
  "Completed Projects": "Abgeschlossene Projekte",
  "Avg. Contract Value": "Durchschnittl. Vertragswert",
  "Connects Purchased": "Gekaufte Connects",
  "Connects Revenue": "Connects-Umsatz",

  // rAGAnalyticsDashboard
  "Real-time performance metrics for the retrieval-augmented generation system": "Echtzeit-Leistungsmetriken fuer das Retrieval-Augmented-Generation-System",
  "Based on precision, recall, and hallucination rate": "Basierend auf Praezision, Recall und Halluzinationsrate",
  "System Health Score": "Systemgesundheits-Score",
  "Total Queries": "Anfragen gesamt",
  "Cache Hit Rate": "Cache-Trefferrate",
  "Avg Latency": "Durchschnittl. Latenz",
  "Relevant results in top 5": "Relevante Ergebnisse in den Top 5",
  "Coverage of relevant docs": "Abdeckung relevanter Dokumente",
  "Context Utilization": "Kontextauslastung",
  "Hallucination Rate": "Halluzinationsrate",
  "AI responses with unsupported claims": "KI-Antworten mit ungestuetzten Behauptungen",
  "Precision & Recall Trends": "Praezisions- & Recall-Trends",
  "Daily averages over time": "Tagesdurchschnitte im Zeitverlauf",
  "Current": "Aktuell",
  "Current Rate": "Aktuelle Rate",
  "Threshold": "Schwellenwert",
  "Average response time": "Durchschnittliche Antwortzeit",
  "P95 Latency": "P95 Latenz",
  "Feedback Rate": "Feedback-Rate",
  "Positive feedback": "Positives Feedback",
  "Latency Trends Over Time": "Latenz-Trends im Zeitverlauf",
  "Average latency by day": "Durchschnittliche Latenz pro Tag",
  "Query Intent Distribution": "Anfrageabsichts-Verteilung",
  "Classification of user queries by intent type": "Klassifikation von Benutzeranfragen nach Absichtstyp",
  "Intent Summary": "Absichts-Zusammenfassung",
  "Query types breakdown": "Aufschluesselung der Anfragetypen",
  "Active Prompt Experiments": "Aktive Prompt-Experimente",
  "Impressions": "Impressionen",
  "No active experiments": "Keine aktiven Experimente",
  "Positive Feedback": "Positives Feedback",
  "System Status": "Systemstatus",

  // revenueDashboard
  "Revenue Dashboard": "Umsatz-Dashboard",
  "Track ARR, MRR, and revenue metrics for due diligence": "ARR, MRR und Umsatzmetriken fuer Due Diligence verfolgen",
  "ARR Tracking": "ARR-Verfolgung",
  "Revenue Distribution": "Umsatzverteilung",
  "Cohort Analysis": "Kohortenanalyse",
  "Target Customers": "Zielkunden",
  "Target Candidates": "Zielkandidaten",

  // riskManagementDashboard
  "Capacity planning, risk registry, and scaling readiness": "Kapazitaetsplanung, Risikoregister und Skalierungsbereitschaft",
  "Risk & Scale Management": "Risiko- & Skalierungsmanagement",

  // strategistProjectsDashboard
  "Curate perfect freelancer matches for client projects": "Perfekte Freelancer-Matches fuer Kundenprojekte kuratieren",
  "Open Projects": "Offene Projekte",
  "Available Talent": "Verfuegbares Talent",
  "Placements This Month": "Vermittlungen diesen Monat",
  "Commission Earned": "Verdiente Provision",
  "Match Freelancers to Project": "Freelancer mit Projekt abgleichen",
  "Notes for Shortlist": "Anmerkungen zur Shortlist",

  // supportTicketAdmin
  "Breached": "Verletzt",
  "Take": "Uebernehmen",
  "Resolve": "Loesen",
  "Responses": "Antworten",

  // systemHealth
  "Real-time platform monitoring and diagnostics": "Echtzeit-Plattformueberwachung und Diagnose",
  "Functions": "Funktionen",
  "Error Logs": "Fehlerprotokolle",

  // targetCompaniesOverview
  "Target Companies Overview": "Zielunternehmen-Uebersicht",
  "All target companies across all partners": "Alle Zielunternehmen ueber alle Partner",

  // templateManagement
  "Template Management": "Vorlagenverwaltung",
  "Total": "Gesamt",
  "Personal": "Persoenlich",
  "Total Uses": "Gesamte Verwendungen",

  // userActivity
  "Comprehensive tracking and analysis of user behavior": "Umfassende Verfolgung und Analyse von Benutzerverhalten",
  "Active Users": "Aktive Benutzer",
  "Currently browsing": "Aktuell aktiv",
  "Sessions (24h)": "Sitzungen (24h)",
  "Total sessions": "Sitzungen gesamt",
  "Events (24h)": "Ereignisse (24h)",
  "User interactions": "Benutzerinteraktionen",
  "Frustrations (24h)": "Frustrationen (24h)",
  "Issues detected": "Erkannte Probleme",
  "User Journey Analysis": "Benutzerreise-Analyse",

  // userEngagementDashboard
  "User Engagement": "Benutzer-Engagement",
  "Platform usage and engagement metrics": "Plattformnutzungs- und Engagement-Metriken",
  "Active Users (30d)": "Aktive Benutzer (30T)",
  "Avg Session Time": "Durchschnittl. Sitzungszeit",
  "Page Views": "Seitenaufrufe",
  "Actions Performed": "Ausgefuehrte Aktionen",
  "Daily Active Users": "Taegliche aktive Benutzer",
  "User activity trend over time": "Benutzeraktivitaetstrend im Zeitverlauf",
  "Top Features": "Top-Funktionen",
  "Most used platform features": "Meistgenutzte Plattformfunktionen",

  // userManagementHub
  "User Management": "Benutzerverwaltung",

  // whatsAppHub
  "WhatsApp Hub": "WhatsApp-Hub",
  "Ops": "Betrieb",
  "Connected": "Verbunden",
  "Not Connected": "Nicht verbunden",

  // whatsAppSettings
  "Connect your WhatsApp Business account to start messaging": "Verbinden Sie Ihr WhatsApp Business Konto, um mit dem Nachrichtenaustausch zu beginnen",
  "No automation rules configured yet.": "Noch keine Automatisierungsregeln konfiguriert.",
  "WhatsApp Settings": "WhatsApp-Einstellungen",
  "Configure your WhatsApp Business integration": "Konfigurieren Sie Ihre WhatsApp Business Integration",
  "Connection": "Verbindung",
  "Automation": "Automatisierung",
  "Webhook": "Webhook",
  "Phone Number ID": "Telefonnummer-ID",
  "Display Phone Number": "Angezeigte Telefonnummer",
  "Message Templates": "Nachrichtenvorlagen",
  "Pre-approved templates for outbound messaging": "Vorab genehmigte Vorlagen fuer ausgehende Nachrichten",
  "Webhook URL": "Webhook-URL",
  "Verify Token": "Verifizierungstoken",
  "Webhook Fields to Subscribe": "Webhook-Felder zum Abonnieren",

  // adminAchievementsManager
  "Company Achievements": "Firmen-Erfolge",
  "Platform Achievements": "Plattform-Erfolge",
  "Achievement Analytics": "Erfolgs-Analysen",
  "Overview of achievement distribution and engagement": "Uebersicht ueber Erfolgsverteilung und Engagement",
  "Grant Company Achievement": "Firmen-Erfolg verleihen",
  "Grant Platform Achievement": "Plattform-Erfolg verleihen",
  "Edit Company Achievement": "Firmen-Erfolg bearbeiten",
  "Edit Platform Achievement": "Plattform-Erfolg bearbeiten",
  "Achievement Earners": "Erfolgsempfaenger",
  "Achievement": "Erfolg",
  "User (Optional)": "Benutzer (Optional)",
  "Company (Optional)": "Unternehmen (Optional)",
  "User": "Benutzer",
  "Achievement Type": "Erfolgstyp",
  "Interaction Type": "Interaktionstyp",
  "Amount Required": "Erforderliche Menge",
  "Time Bound": "Zeitgebunden",
  "Duration (days)": "Dauer (Tage)",
  "Rarity": "Seltenheit",
  "XP Reward": "XP-Belohnung",
  "Icon Emoji": "Symbol-Emoji",
  "XP Points": "XP-Punkte",
  "Across all types": "Ueber alle Typen",
  "With achievements": "Mit Erfolgen",
  "Require completion within a specific timeframe": "Abschluss innerhalb eines bestimmten Zeitrahmens erforderlich",
  "Achievements Management": "Erfolgsverwaltung",
  "Top Company Achievements": "Top Firmen-Erfolge",
  "Top Platform Achievements": "Top Plattform-Erfolge",
  "Unlock Criteria": "Freischaltkriterien",
  "User/Company": "Benutzer/Unternehmen",
  "Date Earned": "Datum verdient",
  "Select achievement": "Erfolg auswaehlen",
  "Select user": "Benutzer auswaehlen",
  "Select company": "Unternehmen auswaehlen",
  "Error loading company achievements": "Fehler beim Laden der Firmen-Erfolge",
  "Error loading platform achievements": "Fehler beim Laden der Plattform-Erfolge",
  "Error loading earners": "Fehler beim Laden der Empfaenger",
  "Error creating achievement": "Fehler beim Erstellen des Erfolgs",
  "Error updating achievement": "Fehler beim Aktualisieren des Erfolgs",
  "Error granting achievement": "Fehler beim Verleihen des Erfolgs",
  "Error deleting achievement": "Fehler beim Loeschen des Erfolgs",
  "Error revoking achievement": "Fehler beim Widerrufen des Erfolgs",

  // applicationStats
  "Pending Review": "Pruefung ausstehend",
  "Last Submission": "Letzte Einreichung",

  // onboardingProgressTracker
  "Professional": "Beruflich",
  "Career": "Karriere",
  "Compensation": "Verguetung",
  "Password": "Passwort",
  "Onboarding Progress": "Onboarding-Fortschritt",
  "Data Collected So Far": "Bisher erfasste Daten",

  // revenueShareSummary
  "YTD Revenue": "Umsatz lfd. Jahr",
  "Collected Revenue": "Eingezogener Umsatz",
  "Share Obligations": "Anteilsverpflichtungen",
  "Net Revenue": "Nettoumsatz",
  "After share obligations": "Nach Anteilsverpflichtungen",

  // strategistManagementModal
  "Strategist Assignment Manager": "Strategisten-Zuweisungsmanager",
  "Workload": "Arbeitsauslastung",

  // voiceCommandButton
  "Stop voice commands": "Sprachbefehle stoppen",
  "Start voice commands": "Sprachbefehle starten",
  "Listening... Say \"Go to [page]\" or \"Search for [term]\"": "Hoeren... Sagen Sie \"Gehe zu [Seite]\" oder \"Suche nach [Begriff]\"",
  "Voice commands (Admin)": "Sprachbefehle (Admin)",

  // mlTrainingDashboard
  "ML Training Pipeline": "ML-Training-Pipeline",
  "Embeddings Generated": "Embeddings generiert",
  "Training Data Prepared": "Trainingsdaten vorbereitet",
  "Model Training Complete": "Modelltraining abgeschlossen",
  "Training Failed": "Training fehlgeschlagen",
  "1. Generate Embeddings": "1. Embeddings generieren",
  "2. Prepare Training Data": "2. Trainingsdaten vorbereiten",
  "3. Train Model": "3. Modell trainieren",

  // gameAdmin
  "Total Completions": "Abschluesse gesamt",
  "Avg. Risk Score": "Durchschnittl. Risiko-Score",
  "Avg. Prioritization Score": "Durchschnittl. Priorisierungs-Score",
  "Avg. Self-Awareness": "Durchschnittl. Selbstbewusstsein",
  "Average Accuracy": "Durchschnittliche Genauigkeit",
  "Avg. Time Spent": "Durchschnittl. Zeitaufwand",
  "All Results": "Alle Ergebnisse",
  "Accuracy": "Genauigkeit",
  "Time Spent": "Zeitaufwand",

  // depreciation
  "Depreciation Schedule": "Abschreibungsplan",
  "Monthly depreciation ledger": "Monatliches Abschreibungsbuch",
  "Generate Entries": "Eintraege generieren",
  "Post All": "Alle buchen",
  "Total Entries": "Eintraege gesamt",
  "Total Depreciation": "Gesamtabschreibung",
  "Posted": "Gebucht",
  "Asset": "Vermoegensgegenstand",
  "Depreciation": "Abschreibung",
  "Accumulated": "Kumuliert",
  "Book Value": "Buchwert",
  "Action": "Aktion",
  "No entries for this period. Click \"Generate Entries\" to create.": "Keine Eintraege fuer diesen Zeitraum. Klicken Sie auf \"Eintraege generieren\" zum Erstellen.",
  "Depreciation Run History": "Abschreibungslauf-Historie",
  "No depreciation runs recorded for {{year}}.": "Keine Abschreibungslaeufe fuer {{year}} aufgezeichnet.",
  "Period": "Zeitraum",
  "Run Type": "Lauftyp",
  "Entries": "Eintraege",
  "Run Date": "Laufdatum",

  // assetRegister
  "Asset Register": "Anlagenverzeichnis",
  "Total Assets": "Vermoegen gesamt",
  "Filtered Assets": "Gefilterte Anlagen",
  "Purchase Value": "Anschaffungswert",
  "All Categories": "Alle Kategorien",
  "Under Maintenance": "In Wartung",
  "Disposed": "Entsorgt",
  "Fully Depreciated": "Vollstaendig abgeschrieben",
  "Sold": "Verkauft",
  "Written Off": "Abgeschrieben",
  "Purchase date range": "Anschaffungsdatumsbereich",
  "All Assets": "Alle Anlagen",

  // intangibleAssets
  "Intangible Assets": "Immaterielle Vermoegenswerte",
  "Software licenses and development costs": "Softwarelizenzen und Entwicklungskosten",
  "Total Intangibles": "Immaterielle gesamt",
  "Software & Development": "Software & Entwicklung",
};

// ── partner.json translations ──────────────────────────────────────────
const partnerTranslations = {
  "Building/Room number, Reception instructions, Parking information, Accessibility notes...": "Gebaeude-/Raumnummer, Empfangsanweisungen, Parkinformationen, Barrierefreiheitshinweise...",
  "List materials candidates should prepare (portfolio, references, certificates, etc.)": "Materialien auflisten, die Kandidaten vorbereiten sollten (Portfolio, Referenzen, Zertifikate, etc.)",
  "QUANTUM CLUB ADMIN": "QUANTUM CLUB ADMIN",
  "Meeting": "Meeting",
  "Applied": "Beworben",
  "Last Updated": "Zuletzt aktualisiert",
  "Stage Progress": "Phasenfortschritt",
  "Note content is required": "Notizinhalt ist erforderlich",
  "You must be logged in to create notes": "Sie muessen angemeldet sein, um Notizen zu erstellen",
  "Note saved": "Notiz gespeichert",
  "Note deleted": "Notiz geloescht",
  "Note title...": "Notiztitel...",
  "All Notes": "Alle Notizen",
  "TQC Internal": "TQC Intern",
  "Partner Shared": "Partner-geteilt",
  "General": "Allgemein",
  "Visible only to TQC team": "Nur fuer das TQC-Team sichtbar",
  "Visible to everyone": "Fuer alle sichtbar",
  "Pipeline stage updated": "Pipeline-Phase aktualisiert",
  "Current Stage": "Aktuelle Phase",
  "Import from LinkedIn": "Von LinkedIn importieren",
  "LinkedIn profile imported successfully.": "LinkedIn-Profil erfolgreich importiert.",
  "LinkedIn Profile URL": "LinkedIn-Profil-URL",
  "Custom Achievements": "Individuelle Erfolge",
  "Basic Information": "Grundlegende Informationen",
  "Achievement Name *": "Erfolgsname *",
  "Interaction Type *": "Interaktionstyp *",
  "Required Amount *": "Erforderliche Menge *",
  "Time-Bound Challenge": "Zeitgebundene Herausforderung",
  "Days to Complete *": "Tage bis zur Fertigstellung *",
  "Describe what this achievement represents and how to earn it": "Beschreiben Sie, was dieser Erfolg repraesentiert und wie man ihn verdient",
  "Require completion within a specific timeframe": "Abschluss innerhalb eines bestimmten Zeitrahmens erforderlich",
  "Standard achievements earned by your team members across the platform": "Standard-Erfolge, die Ihre Teammitglieder auf der Plattform verdienen",
  "Define criteria and rewards for exceptional team contributions": "Kriterien und Belohnungen fuer aussergewoehnliche Teambeitraege definieren",
  "Total Awarded": "Gesamt verliehen",
  "Avg per Achievement": "Durchschnitt pro Erfolg",
  "Current followers": "Aktuelle Follower",
  "Reactions & comments": "Reaktionen & Kommentare",
  "Logos & Assets": "Logos & Assets",
  "Light Logo URL": "Helles Logo URL",
  "Dark Logo URL": "Dunkles Logo URL",
  "Favicon URL": "Favicon-URL",
  "Social Preview Image": "Social-Media-Vorschaubild",
  "Heading Example": "Ueberschriftsbeispiel",
  "Inter, Roboto, etc.": "Inter, Roboto, etc.",
  "Body text example with your selected font and colors.": "Fliesstext-Beispiel mit Ihrer ausgewaehlten Schriftart und Farben.",
  "Notifications On": "Benachrichtigungen an",
  "Company profile updated": "Firmenprofil aktualisiert",
  "Website": "Webseite",
  "LinkedIn URL": "LinkedIn-URL",
  "BREACHED": "VERLETZT",
  "Milestone deadline has passed": "Meilenstein-Frist ist abgelaufen",
  "Milestone deadline approaching": "Meilenstein-Frist naehert sich",
  "Interview scheduled, but failed to add to Google Calendar": "Interview geplant, aber Hinzufuegen zum Google Kalender fehlgeschlagen",
  "Interview scheduled and added to your Google Calendar!": "Interview geplant und zu Ihrem Google Kalender hinzugefuegt!",
  "Interview scheduled, but calendar sync failed": "Interview geplant, aber Kalendersynchronisierung fehlgeschlagen",
  "Company - Candidate Name - Interview Stage": "Unternehmen - Kandidatenname - Interview-Phase",
  "Candidate email": "Kandidaten-E-Mail",
  "Meeting description and agenda": "Meetingbeschreibung und Agenda",
  "Interview will be synced to your calendar and attendees will receive invites": "Das Interview wird mit Ihrem Kalender synchronisiert und Teilnehmer erhalten Einladungen",
  "Connect your Google Calendar to automatically sync interviews and send calendar invites": "Verbinden Sie Ihren Google Kalender, um Interviews automatisch zu synchronisieren und Kalendereinladungen zu senden",
  "Title and description auto-generated with company, candidate, and interviewer details": "Titel und Beschreibung automatisch mit Unternehmens-, Kandidaten- und Interviewer-Details generiert",
  "Job created but failed to add some viewers": "Job erstellt, aber einige Betrachter konnten nicht hinzugefuegt werden",
  "Compensation details are shared only with shortlisted candidates unless displayed on the listing.": "Verguetungsdetails werden nur mit Kandidaten auf der Shortlist geteilt, sofern nicht in der Anzeige angezeigt.",
  "Exciting news to share... required": "Spannende Neuigkeiten zum Teilen... erforderlich",
  "Candidate Already in Pipeline": "Kandidat bereits in der Pipeline",
  "Name Match": "Namens-Uebereinstimmung",
  "LinkedIn Match": "LinkedIn-Uebereinstimmung",
  "Current document uploaded. Upload a new file to replace it.": "Aktuelles Dokument hochgeladen. Laden Sie eine neue Datei hoch, um es zu ersetzen.",
  "Document will be removed when you save": "Dokument wird beim Speichern entfernt",
  "Min Salary (Annual)": "Mindestgehalt (Jaehrlich)",
  "Max Salary (Annual)": "Maximalgehalt (Jaehrlich)",
  "Existing Documents": "Vorhandene Dokumente",
  "New Documents (will be uploaded on save)": "Neue Dokumente (werden beim Speichern hochgeladen)",
  "Brief overview of the role...": "Kurze Uebersicht der Rolle...",
  "Link to where this job is posted online (LinkedIn, company website, etc.)": "Link zu der Online-Stellenanzeige (LinkedIn, Firmenwebseite, etc.)",
  "No required tools selected. Add tools that are essential for this role.": "Keine erforderlichen Tools ausgewaehlt. Fuegen Sie Tools hinzu, die fuer diese Rolle unverzichtbar sind.",
  "No nice-to-have tools selected. Add tools that would be a plus.": "Keine wuenschenswerten Tools ausgewaehlt. Fuegen Sie Tools hinzu, die ein Plus waeren.",
  "Current document uploaded": "Aktuelles Dokument hochgeladen",
  "Upload a new file to replace it": "Neue Datei hochladen zum Ersetzen",
  "Drag & drop or click to upload": "Ziehen & Ablegen oder klicken zum Hochladen",
  "Upload multiple files at once": "Mehrere Dateien gleichzeitig hochladen",
  "Enhanced Analytics": "Erweiterte Analysen",
  "Recommendation *": "Empfehlung *",
  "Headhunter Agent activated... analyzing job requirements.": "Headhunter-Agent aktiviert... Jobanforderungen werden analysiert.",
  "Agent finished search but found no new strong matches.": "Agent hat die Suche abgeschlossen, aber keine neuen starken Uebereinstimmungen gefunden.",
  "Review and advance premium candidates faster with our exclusive vetting": "Premium-Kandidaten schneller pruefen und weiterbringen mit unserer exklusiven Ueberpruefung",
  "Download started": "Download gestartet",
  "Current Job Description": "Aktuelle Stellenbeschreibung",
  "Uploaded document ready to view": "Hochgeladenes Dokument bereit zur Ansicht",
  "File will be uploaded automatically when selected": "Datei wird automatisch beim Auswaehlen hochgeladen",
  "Files will be uploaded automatically when selected": "Dateien werden automatisch beim Auswaehlen hochgeladen",
  "Powered by Google Docs Viewer": "Unterstuetzt von Google Docs Viewer",
  "Preview not available for this file type": "Vorschau fuer diesen Dateityp nicht verfuegbar",
  "Upload in progress": "Upload laeuft",
  "Rejection notes are required.": "Ablehnungsnotizen sind erforderlich.",
  "No draft jobs selected to publish": "Keine Entwurfs-Jobs zum Veroeffentlichen ausgewaehlt",
  "No published jobs selected to close": "Keine veroeffentlichten Jobs zum Schliessen ausgewaehlt",
  "No jobs selected to archive": "Keine Jobs zum Archivieren ausgewaehlt",
  "Signature Secure \\u2713": "Signatur sicher \\u2713",
  "Show Ownership Icons": "Eigentuemersymbole anzeigen",
  "Show Format Details": "Formatdetails anzeigen",
  "Show Team Assignments": "Teamzuweisungen anzeigen",
  "Show Location/Meeting Info": "Standort-/Meeting-Info anzeigen",
  "Show Evaluation Setup": "Bewertungseinrichtung anzeigen",
  "Show Scheduling Details": "Terminplanungsdetails anzeigen",
  "Show Advanced Metadata": "Erweiterte Metadaten anzeigen",
  "Customize what information is shown in the pipeline breakdown": "Anpassen, welche Informationen in der Pipeline-Aufschluesselung angezeigt werden",
  "Prep sent": "Vorbereitung gesendet",
  "Prep pending": "Vorbereitung ausstehend",
  "Limited": "Begrenzt",
  "Google Calendar": "Google Kalender",
  "Best Match": "Beste Uebereinstimmung",
  "Try adjusting the duration or selecting different interviewers": "Versuchen Sie, die Dauer anzupassen oder andere Interviewer auszuwaehlen",
  "Team Activity": "Teamaktivitaet",
  "Recent Invitations": "Aktuelle Einladungen",
  "All Invitations": "Alle Einladungen",
  "Send an invitation to join your organization": "Einladung zum Beitritt zu Ihrer Organisation senden",
  "Document Title *": "Dokumenttitel *",
  "Document Content *": "Dokumentinhalt *",
  "Give your document a descriptive name": "Geben Sie Ihrem Dokument einen beschreibenden Namen",
  "Plain text format - perfect for quick reference documents": "Nur-Text-Format - perfekt fuer Kurzreferenz-Dokumente",
  "Interview Prep Document": "Interview-Vorbereitungsdokument",
  "Upcoming": "Bevorstehend",
  "Current Document": "Aktuelles Dokument",
  "Feedback": "Feedback",
  "No prep document uploaded yet. Use the manual entry or calendar linker to add one.": "Noch kein Vorbereitungsdokument hochgeladen. Nutzen Sie den manuellen Eintrag oder den Kalender-Verknuepfer.",
  "Send an email to all selected candidates": "E-Mail an alle ausgewaehlten Kandidaten senden",
  "Internal Review Notes": "Interne Pruefungsnotizen",
  "Star candidates from applications to access them quickly": "Kandidaten aus Bewerbungen markieren, um schnell darauf zuzugreifen",
  "Requires sponsorship": "Erfordert Sponsoring",
  "No sponsorship required": "Kein Sponsoring erforderlich",
  "Awaiting your approval": "Wartet auf Ihre Genehmigung",
  "Active milestone work": "Aktive Meilensteinarbeit",
  "Let QUIN analyze your hiring activity": "Lassen Sie QUIN Ihre Einstellungsaktivitaet analysieren",
  "Browse candidates to see their profiles here": "Kandidaten durchsuchen, um ihre Profile hier zu sehen",
  "Update candidate information. All changes will be logged.": "Kandidateninformationen aktualisieren. Alle Aenderungen werden protokolliert.",
  "Select which stage to move this candidate to": "Waehlen Sie, in welche Phase dieser Kandidat verschoben werden soll",
  "Select which previous stage to move this candidate to": "Waehlen Sie, in welche vorherige Phase dieser Kandidat verschoben werden soll",
  "A reason is required for accountability": "Ein Grund ist fuer die Nachvollziehbarkeit erforderlich",
  "Limited candidate information available. Full details visible when candidate applies to your jobs.": "Begrenzte Kandidateninformationen verfuegbar. Vollstaendige Details sichtbar, wenn sich der Kandidat auf Ihre Jobs bewirbt.",
  "No applications yet. Post a job to start hiring.": "Noch keine Bewerbungen. Veroeffentlichen Sie einen Job, um mit der Einstellung zu beginnen.",
  "By connecting, you authorize The Quantum Club to access your company's \n              job postings on LinkedIn.": "Durch die Verbindung autorisieren Sie The Quantum Club, auf die Stellenanzeigen Ihres Unternehmens auf LinkedIn zuzugreifen.",
  "Connect your LinkedIn account to automatically import your company's job postings.": "Verbinden Sie Ihr LinkedIn-Konto, um die Stellenanzeigen Ihres Unternehmens automatisch zu importieren.",
  "This will import all active job postings from your LinkedIn company page. \n              Make sure you have admin access to your company's LinkedIn page.": "Dies importiert alle aktiven Stellenanzeigen von Ihrer LinkedIn-Unternehmensseite.\n              Stellen Sie sicher, dass Sie Admin-Zugriff auf die LinkedIn-Seite Ihres Unternehmens haben.",
  "Speed up your review workflow with these shortcuts.": "Beschleunigen Sie Ihren Pruefungsworkflow mit diesen Tastenkuerzeln.",
  "These notes are for internal use only and will not be shared with the candidate or partners.": "Diese Notizen sind nur fuer den internen Gebrauch und werden nicht mit dem Kandidaten oder Partnern geteilt.",
  "Bulk Actions": "Massenaktionen",
  "Visible Columns": "Sichtbare Spalten",
  "Navigation": "Navigation",
  "Layout": "Layout",
  "No activity": "Keine Aktivitaet",
  "Published jobs will appear in search results and candidates can apply to them.": "Veroeffentlichte Jobs erscheinen in Suchergebnissen und Kandidaten koennen sich bewerben.",
  "Interview Sentinel": "Interview-Wachposten",
  "Sentinel HUD": "Sentinel-HUD",
  "Feedback management coming soon": "Feedback-Verwaltung in Kuerze verfuegbar",
  "You have observer access to this role. View pipeline in the Pipeline tab above.": "Sie haben Beobachterzugriff auf diese Rolle. Sehen Sie die Pipeline im Pipeline-Tab oben.",
  "Accepted": "Angenommen",
  "Neutral": "Neutral",
};

// ── Small namespace translations ──────────────────────────────────────
const candidatesTranslations = {
  "Assessments": "Bewertungen",
  "Dimension": "Dimension",
  "Name": "Name",
  "Talent Pool": "Talentpool",
};

const meetingsTranslations = {
  "Guests": "Gaeste",
  "Neutral": "Neutral",
};

const settingsTranslations = {
  "Round Robin (Team)": "Round Robin (Team)",
  "Workflows": "Workflows",
};

const jobsTranslations = {
  "Details": "Details",
};

// ── Helper functions ──────────────────────────────────────────────────
function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function applyTranslations(nsName, translations) {
  const deFile = join(BASE, 'de', `${nsName}.json`);
  const enFile = join(BASE, 'en', `${nsName}.json`);
  const de = JSON.parse(readFileSync(deFile, 'utf8'));
  const en = JSON.parse(readFileSync(enFile, 'utf8'));

  let updated = 0;
  const allDeKeys = getAllKeys(de);

  for (const keyPath of allDeKeys) {
    const deValue = getNestedValue(de, keyPath);
    const enValue = getNestedValue(en, keyPath);

    if (typeof deValue !== 'string') continue;
    if (deValue !== enValue) continue; // Already translated

    const translation = translations[deValue];
    if (translation && translation !== deValue) {
      setNestedValue(de, keyPath, translation);
      updated++;
    }
  }

  writeFileSync(deFile, JSON.stringify(de, null, 2) + '\n');
  console.log(`${nsName}: Updated ${updated} translations`);
  return updated;
}

function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

let total = 0;
total += applyTranslations('common', commonTranslations);
total += applyTranslations('admin', adminTranslations);
total += applyTranslations('partner', partnerTranslations);
total += applyTranslations('candidates', candidatesTranslations);
total += applyTranslations('meetings', meetingsTranslations);
total += applyTranslations('settings', settingsTranslations);
total += applyTranslations('jobs', jobsTranslations);

console.log(`\nTotal updated: ${total}`);
