import { readFileSync, writeFileSync } from 'fs';

const fr = JSON.parse(readFileSync('./src/i18n/locales/fr/common.json', 'utf8'));

// All missing translations organized by section
const translations = {
  breadcrumbNav: {
    label: "fil d'ariane",
    more: "Plus"
  },
  carousel: {
    previousSlide: "Diapositive précédente",
    nextSlide: "Diapositive suivante",
    scrollLeft: "Défiler vers la gauche",
    scrollRight: "Défiler vers la droite"
  },
  companyLogo: {
    fallbackName: "Entreprise",
    logo: "logo"
  },
  presence: {
    editing: "Modification de cette page",
    viewing: "Consultation de cette page",
    othersHere: "{{count}} autres personnes ici"
  },

  // --- academy (within existing section) ---
  // academy.nav sub-keys
  _academy_nav: {
    myLearning: "Mon apprentissage",
    achievements: "Réalisations",
    profile: "Profil"
  },

  // --- achievements (within existing section) ---
  _achievements_categories: {
    influence: "Influence",
    innovation: "Innovation",
    social: "Social",
    prestige: "Prestige",
    event: "Événement",
    pioneer: "Pionnier"
  },
  _achievements_rarities: {
    quantum: "Quantum"
  },
  _achievements_actions: {
    applyToJobs: "Postuler à des offres",
    completeCourses: "Compléter des cours",
    referFriends: "Recommander des amis",
    createPosts: "Créer des publications",
    sendMessages: "Envoyer des messages",
    saveJobs: "Sauvegarder des offres",
    completeProfile: "Compléter le profil",
    takeAction: "Passer à l'action"
  },
  _achievements_estimates: {
    lessThanADay: "Moins d'un jour",
    oneDay: "~1 jour",
    months: "~{{count}} mois"
  },

  academyCreatorHub: {
    desc: "Créez votre premier cours et commencez à partager vos connaissances",
    desc2: "Suivez l'engagement des étudiants, les taux de complétion, et plus encore"
  },
  adminRejections: {
    desc: "Analytique et insights des refus à l'échelle de la plateforme"
  },
  blogCategory: {
    title: "Catégorie introuvable",
    desc: "La catégorie que vous recherchez n'existe pas."
  },
  blogEngine: {
    title: "Moteur de blog",
    desc: "Total des articles",
    desc2: "Brouillons en attente de révision",
    desc3: "Statut",
    desc4: "Publications/jour",
    desc5: "Publication automatique",
    desc6: "Révision par un expert",
    desc7: "Qualité minimale",
    desc8: "Fenêtre de publication"
  },
  blogPost: {
    title: "Questions fréquentes",
    desc: "Chargement de l'article...",
    desc2: "L'article que vous recherchez n'existe pas."
  },
  careerPath: {
    desc: "Explorez les parcours de carrière potentiels et ce qu'il faut pour y parvenir",
    desc2: "Maîtrisez les compétences fondamentales et construisez une base technique solide",
    desc3: "Prenez en charge des projets plus complexes et développez vos compétences en leadership",
    desc4: "Démontrez des performances constantes et votre capacité à passer au niveau supérieur"
  },
  certificateVerification: {
    desc: "Ce certificat atteste que le titulaire a rempli avec succès les exigences du cours."
  },
  clubAI: {
    title: "Bienvenue sur Club AI",
    desc: "Votre stratège IA personnel, disponible 24h/24 et 7j/7",
    desc2: "Aucune conversation pour le moment. Commencez à discuter !",
    desc3: "Club AI réfléchit..."
  },
  clubDJ: {
    title: "Tableau de bord Club DJ",
    desc: "Gérez les playlists, téléversez des pistes et mixez en direct pour The Quantum Club Radio",
    desc2: "Diffusion sur The Quantum Club Radio"
  },
  companyPage: {
    desc: "Cette entreprise ne fait pas partie du réseau The Quantum Club.",
    desc2: "Derniers articles et mentions dans la presse"
  },
  courseDetail: {
    desc: "Instructeur expert et professionnel du secteur",
    desc2: "Aucun avis pour le moment. Soyez le premier à évaluer ce cours !",
    desc3: "Sélectionnez un module pour prendre des notes",
    desc4: "Instructeur expert avec une vaste expérience dans le secteur."
  },
  courseEdit: {
    desc: "Mettez à jour les détails et les paramètres de votre cours",
    desc2: "Durée approximative pour compléter le cours",
    desc3: "Image de couverture du cours (optionnel)",
    desc4: "Vidéo d'aperçu optionnelle pour le cours",
    desc5: "Gérez le contenu de votre cours. Glissez pour réorganiser."
  },
  coverLetterGenerator: {
    desc: "Générez des lettres de motivation personnalisées et alimentées par l'IA, adaptées à des offres d'emploi spécifiques",
    desc2: "Choisissez parmi vos candidatures ou offres sauvegardées",
    desc3: "Style professionnel, conversationnel ou dirigeant",
    desc4: "Modifiez, exportez en PDF ou enregistrez dans vos documents"
  },
  documentManagement: {
    title: "Aucun document téléversé",
    desc: "Téléversez et gérez vos CV et certificats",
    desc2: "Téléversez votre CV pour commencer vos candidatures"
  },
  emailSequencingHub: {
    desc: "Séquençage d'e-mails alimenté par l'IA avec analyse des réponses intelligente, scoring prédictif des prospects et timing d'envoi optimal",
    btn2: "Réessayer",
    title: "Hub d'intelligence e-mail"
  },
  expertMarketplace: {
    btn: "Créer un profil",
    btn2: "Assigner",
    btn3: "Réserver une session"
  },
  feedbackDatabase: {
    desc: "Surveillez la satisfaction des utilisateurs et suivez les améliorations",
    desc2: "Note",
    desc3: "Statut",
    desc4: "Soumis",
    desc5: "Commentaire de l'utilisateur",
    desc6: "Parcours de navigation",
    desc7: "Résolution",
    desc8: "Notes de l'administrateur",
    desc9: "Statut de résolution",
    desc10: "Message de réponse",
    tabOverview: "Vue d'ensemble",
    tabAllfeedback: "Tous les retours",
    tabPageanalytics: "Analytique des pages",
    tabErrorlogs: "Journaux d'erreurs"
  },
  gigDetailPage: {
    desc: "Aucune FAQ disponible.",
    tabFaq: "FAQ"
  },
  guestBookingPage: {
    title: "Détails de votre réservation",
    desc: "Cette réservation a peut-être été annulée ou le lien est invalide.",
    desc2: "Veuillez indiquer la raison de l'annulation :",
    desc3: "Propulsé par The Quantum Club"
  },
  guestBookingPortal: {
    desc: "Cette réservation a peut-être été annulée ou le lien est invalide.",
    desc2: "Veuillez contacter la personne qui a réservé cette réunion ou l'hôte pour effectuer des modifications.",
    desc3: "Propulsé par The Quantum Club"
  },
  install: {
    title: "Comment installer",
    desc: "The Quantum Club est maintenant installé sur votre appareil. Profitez de l'expérience complète de l'application !",
    desc2: "Obtenez l'application pour un accès plus rapide, le support hors ligne et les notifications push.\n              Aucun App Store requis.",
    desc3: "Appuyez sur le bouton Partager",
    desc4: "Faites défiler le menu de partage pour trouver cette option",
    desc5: "Confirmez pour ajouter l'application à votre écran d'accueil",
    desc6: "Recherchez l'icône d'installation",
    desc7: "Ou utilisez le bouton ci-dessus pour lancer l'installation",
    desc8: "Lancez depuis le bureau ou le tiroir d'applications",
    desc9: "Trouvez The Quantum Club dans vos applications",
    desc10: "Préférez-vous continuer dans le navigateur ?"
  },
  interviewPrep: {
    desc: "Commencez à postuler pour accéder à la préparation d'entretien spécifique à l'entreprise"
  },
  interviewPrepChat: {
    desc: "Entraînez-vous à l'entretien avec un intervieweur IA qui connaît votre entreprise et votre poste",
    btn2: "Démarrer l'entraînement à l'entretien"
  },
  investorPortal: {
    desc: "Ce portail est strictement confidentiel. Les accès sont journalisés."
  },
  inviteAcceptance: {
    desc: "Créez votre compte pour commencer",
    desc2: "En vous inscrivant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité"
  },
  knowledgeBase: {
    desc: "Trouvez des réponses et découvrez la plateforme The Quantum Club"
  },
  mfaSetup: {
    desc: "Entrez le code à 6 chiffres de votre application d'authentification pour continuer.",
    desc2: "Scannez ce QR code avec votre application d'authentification, puis entrez le code à 6 chiffres.",
    desc3: "L'authentification à deux facteurs est maintenant active sur votre compte. Redirection..."
  },
  moduleEdit: {
    desc: "Mettez à jour les détails de votre module",
    desc2: "Durée approximative pour compléter le module"
  },
  moduleManagement: {
    desc: "Gérez les modules de ce cours"
  },
  mySkillsPage: {
    desc: "Suivez vos compétences vérifiées obtenues via les cours complétés",
    desc2: "Complétez des cours pour obtenir des compétences vérifiées"
  },
  objectiveWorkspace: {
    desc: "Aucun commentaire pour le moment",
    desc2: "Aucune activité pour le moment",
    tabOverview: "Vue d'ensemble",
    tabTasks: "Tâches",
    tabComments: "Commentaires",
    tabActivity: "Activité"
  },
  offerComparison: {
    desc: "Comparez et évaluez vos offres d'emploi avec les insights de Club AI",
    desc2: "Lorsque vous recevrez des offres d'emploi, elles apparaîtront ici pour une comparaison et un soutien à la négociation facilités."
  },
  privacyPolicy: {
    title: "Explicabilité",
    desc: "Certains sous-traitants tiers (par ex. services IA) peuvent traiter les données hors de l'UE. Nous assurons la protection par :",
    desc2: "Candidats actifs",
    desc3: "Partenaires/Clients",
    desc4: "Candidatures",
    desc5: "Sauvegardes",
    desc6: "Données marketing",
    desc7: "Jusqu'au retrait du consentement",
    desc8: "Droit de demander la suppression",
    desc9: "Modifiez les informations de votre profil à tout moment via les paramètres de votre compte.",
    desc10: "Exportez vos données au format JSON lisible par machine pour les transférer vers d'autres services.",
    desc11: "Désinscrivez-vous du marketing, du profilage et du traitement IA à tout moment via les Paramètres.",
    desc12: "Désactivez le mode furtif, révoquez les permissions Club Sync ou retirez le consentement au partage à tout moment.",
    desc13: "Nous mettons en œuvre des pratiques de sécurité conformes aux normes du secteur :",
    desc14: "Requis pour l'authentification, la gestion de session et les fonctionnalités principales de la plateforme. Ne peut pas être désactivé.",
    desc15: "Stockent vos préférences (thème, langue, filtres sauvegardés). Vous pouvez les effacer via les paramètres du navigateur.",
  },
  projectApplyPage: {
    desc: "Vous devez configurer votre profil freelance avant de postuler à des projets"
  },
  projectDetailPage: {
    desc: "Ce projet a peut-être été supprimé ou n'est plus disponible."
  },
  projectsPage: {
    title: "Club Projets",
    desc: "Marketplace freelance premium propulsé par Club AI"
  },
  radio: {
    desc: "Écoutez les diffusions DJ en direct ou streamez des playlists par ambiance"
  },
  referralProgram: {
    desc: "Commencez à partager votre lien de parrainage pour gagner des récompenses"
  },
  resetPasswordSuccess: {
    desc: "Votre mot de passe a été mis à jour avec succès",
    desc2: "Par mesure de sécurité, toutes les sessions actives ont été invalidées. Veuillez vous connecter avec votre nouveau mot de passe."
  },
  resetPasswordVerify: {
    desc: "Entrez le code à 6 chiffres envoyé à",
    desc2: "Vous n'avez pas reçu le code ?"
  },
  subscriptionSuccess: {
    desc: "Merci de vous être abonné à The Quantum Club. Votre abonnement est maintenant actif.",
    desc2: "Activation de votre abonnement..."
  },
  termsOfService: {
    title: "Langue",
    desc: "Les comptes Candidat, Partenaire, Stratège et Administrateur disposent de droits, obligations et fonctionnalités différents.",
    desc2: "Vous vous engagez à NE PAS :",
    desc3: "Vous conservez la propriété de votre CV, données de profil, messages et contenu téléversé.",
    desc4: "Les conditions détaillées des frais sont décrites dans des accords commerciaux séparés signés entre TQC et chaque partenaire.",
    desc5: "Pour les recherches sensibles ou confidentielles, les partenaires doivent signer un accord de non-divulgation avant d'accéder aux dossiers de candidats.",
    desc6: "Gagnez des récompenses en recommandant des candidats qualifiés qui sont embauchés avec succès via The Quantum Club.",
    desc7: "LA PLATEFORME EST FOURNIE « EN L'ÉTAT » SANS GARANTIE D'AUCUNE SORTE.",
    desc8: "Nous déclinons expressément :",
    desc9: "Nous nous efforçons d'être précis et fiables, mais ne garantissons pas les résultats.",
    desc10: "Avant toute procédure formelle, les parties conviennent de tenter une résolution par des discussions de bonne foi.",
    desc11: "Recommandée avant le contentieux. Nous sommes disposés à participer à une médiation via un tiers neutre.",
    desc12: "Les parties peuvent convenir d'un arbitrage contraignant via l'Institut néerlandais d'arbitrage (Nederlands Arbitrage Instituut).",
    desc13: "En cas d'échec de la résolution, les litiges sont portés devant les tribunaux compétents d'Amsterdam, Pays-Bas.",
    desc14: "Nous ferons des efforts raisonnables pour rétablir les services aussi rapidement que possible.",
    desc15: "Si une disposition est jugée invalide ou inapplicable, le reste des présentes Conditions reste pleinement en vigueur.",
    desc16: "Notre manquement à faire valoir un droit ou une disposition ne constitue pas une renonciation à ce droit.",
    desc17: "Ces Conditions sont rédigées en anglais. En cas de traduction, la version anglaise prévaut en cas de conflit."
  },
  timeTrackingPage: {
    desc: "Suivez, gérez et approuvez les heures de travail de votre équipe"
  },
  whatsAppImport: {
    desc: "Cela peut prendre une minute pour les conversations volumineuses"
  },
  workspaceList: {
    desc: "Votre espace de travail personnel pour les notes, documents et plus encore",
    desc2: "Commencez avec une page vierge ou choisissez parmi nos modèles",
    desc3: "Cliquez sur l'icône étoile sur n'importe quelle page pour l'ajouter à vos favoris",
    desc4: "Les pages que vous visitez apparaîtront ici pour un accès rapide",
    desc5: "Créez, modifiez et importez des modèles pour votre équipe",
    btn6: "Utiliser le modèle"
  },
  cRMAnalytics: {
    desc: "Performance du pipeline, indicateurs d'équipe et intelligence de rédaction commerciale"
  },
  cRMAutomations: {
    desc: "Construisez et gérez des workflows automatisés pour votre CRM"
  },
  cRMIntegrations: {
    desc: "Connectez des outils externes et enrichissez vos données de prospects"
  },
  cRMSettings: {
    desc: "Configurez vos préférences CRM et gérez les données"
  },
  campaignDashboard: {
    desc: "Gérez vos campagnes de prospection à froid"
  },
  focusView: {
    desc: "Vous n'avez aucune activité en attente pour aujourd'hui. Excellent travail !"
  },
  importHistory: {
    desc: "Consultez et gérez vos imports CSV"
  },
  leadScoringConfig: {
    desc: "Configurez les règles de scoring et consultez l'historique des scores de vos prospects"
  },
  prospectAuditTrail: {
    desc: "Historique complet de toutes les modifications des fiches prospects",
    desc2: "Sélectionnez un prospect pour voir l'activité détaillée"
  },
  prospectDetail: {
    desc: "Aucun point de contact enregistré pour le moment"
  },
  suppressionList: {
    desc: "Gardez votre liste de suppression synchronisée avec la liste de blocage d'Instantly"
  },

  // --- Widget sections ---
  activeMeetingsWidget: {
    badge: { live: "En direct" }
  },
  agentActivityWidget: {
    badge: { needsApproval: "Nécessite approbation" }
  },
  careerProgressWidget: {
    badge: { justGettingStarted: "Tout juste commencé", onTrack: "En bonne voie" }
  },
  clubPilotTasksWidget: {
    badge: { aiSuggested: "Suggestion IA" },
    allCaughtUpNoPendingTasks: "Tout est à jour. Aucune tâche en attente."
  },
  dailyBriefingBanner: {
    badge: { poweredByQuin: "Propulsé par QUIN" }
  },
  skillDemandWidget: {
    badge: { stable: "Stable", youHaveThis: "Vous avez cette compétence" },
    noSkillDataAvailableYet: "Aucune donnée de compétences disponible"
  },
  partnerStrategistStrip: {
    badge: { strategist: "Stratège" },
    yourDedicatedTalentPartnerAtTheQuantumCl: "Votre partenaire talent dédié chez The Quantum Club"
  },
  adminReferralWidget: {
    totalReferrals: "Total des parrainages",
    successful: "Réussis",
    paidOut: "Versés",
    referralNetwork: "Réseau de parrainage"
  },
  auditLogSummaryWidget: {
    sensitive: "Sensible",
    recentActivity: "Activité récente",
    noAuditEventsToday: "Aucun événement d'audit aujourd'hui",
    failed: "Échoué",
    today: "Aujourd'hui"
  },
  cRMProspectsWidget: {
    noProspectsYet: "Aucun prospect pour le moment",
    avgDeal: "Montant moyen",
    active: "Actifs"
  },
  clubAIAnalyticsWidget: {
    totalInteractions: "Total des interactions",
    recommendations: "Recommandations",
    actedUpon: "Suivies",
    userSatisfaction: "Satisfaction utilisateur",
    clubAiAnalytics: "Analytique Club AI"
  },
  dealPipelineSummaryWidget: {
    noActiveDealsInPipeline: "Aucun deal actif dans le pipeline",
    weightedValuesUseStageProbabilityFromCrm: "Les valeurs pondérées utilisent la probabilité d'étape des paramètres CRM",
    activeDeals: "Deals actifs",
    totalValue: "Valeur totale",
    weighted: "Pondéré"
  },
  edgeFunctionHealthWidget: {
    avgResponse: "Réponse moyenne",
    backendHealth: "Santé du backend"
  },
  hiringPipelineOverview: {
    yourHiringPipelineStartsHere: "Votre pipeline de recrutement commence ici",
    description: "Répartition actuelle par étape"
  },
  interviewCommandWidget: {
    noInterviewsScheduledForToday: "Aucun entretien prévu pour aujourd'hui",
    allScorecardsSubmitted: "Toutes les fiches d'évaluation soumises !"
  },
  interviewCountdownWidget: {
    noUpcomingInterviewsScheduled: "Aucun entretien à venir prévu"
  },
  kPISummaryWidget: {
    noKpiDataAvailableYet: "Aucune donnée KPI disponible",
    critical: "Critique",
    warning: "Attention",
    onTarget: "Dans l'objectif",
    pending: "En attente",
    healthScore: "Score de santé",
    awaitingData: "En attente de données"
  },
  liveOperationsWidget: {
    teamOnline: "Équipe en ligne",
    accountsActive: "Comptes actifs"
  },
  messagesPreviewWidget: {
    noMessagesYet: "Aucun message pour le moment"
  },
  nPSPulseWidget: {
    promoters: "Promoteurs",
    passives: "Passifs",
    detractors: "Détracteurs"
  },
  partnerActivityFeed: {
    noRecentActivity: "Aucune activité récente",
    description: "Activité récente de la plateforme"
  },
  partnerEngagementWidget: {
    total: "Total",
    active: "Actifs",
    atRisk: "À risque",
    partnerEngagement: "Engagement des partenaires",
    placementSuccessRate: "Taux de réussite des placements"
  },
  pendingMemberApprovalsWidget: {
    noPendingApprovals: "Aucune approbation en attente",
    allMemberRequestsHaveBeenProcessed: "Toutes les demandes de membres ont été traitées",
    pendingApprovals: "Approbations en attente",
    approvals: "Approbations",
    description: "Nouveaux membres en attente de révision"
  },
  recentApplicationsList: {
    noApplicationsYet: "Aucune candidature pour le moment",
    applicationsWillAppearHereAsCandidatesAp: "Les candidatures apparaîtront ici au fur et à mesure que les candidats postulent",
    description: "Dernières candidatures reçues"
  },
  recruiterTeamWidget: {
    sourced: "Sourcés",
    placements: "Placements",
    topPerformers: "Meilleurs performeurs",
    noRecruiterActivityYet: "Aucune activité de recruteur pour le moment",
    rate: "Taux"
  },
  referralStatsWidget: {
    active: "Actifs",
    projected: "Projetés",
    earned: "Gagnés"
  },
  revenueGrowthWidget: {
    weightedPipeline: "Pipeline pondéré",
    expectedClosings: "Clôtures prévues",
    projectedMonthend: "Projection fin de mois",
    pipeline: "Pipeline"
  },
  revenueSparkline: {
    pipelineValue: "Valeur du pipeline",
    title: { "revenue": "Revenus &" }
  },
  salaryInsightsWidget: {
    addYourRoleToSeeMarketBenchmarks: "Ajoutez votre poste pour voir les benchmarks du marché"
  },
  savedJobsWidget: {
    noSavedJobsYet: "Aucune offre sauvegardée pour le moment"
  },
  securityAlertsWidget: {
    blockedIps: "IP bloquées"
  },
  strategistContactCard: {
    aDedicatedStrategistWillBeAssignedToYouS: "Un stratège dédié vous sera bientôt assigné",
    theyllHelpGuideYourCareerJourney: "Il vous aidera à guider votre parcours de carrière"
  },
  systemErrorsWidget: {
    critical: "Critique",
    errors: "Erreurs",
    warnings: "Avertissements"
  },
  talentRecommendations: {
    noRecommendationsYet: "Aucune recommandation pour le moment",
    recommendationsWillAppearWhenYouHaveActi: "Les recommandations apparaîtront lorsque vous aurez des offres d'emploi actives",
    description: "Meilleurs candidats correspondant à vos postes ouverts"
  },
  taskQueueWidget: {
    noPendingTasks: "Aucune tâche en attente",
    pending: "En attente",
    dueToday: "Échéance aujourd'hui",
    overdue: "En retard"
  },
  teamCapacityWidget: {
    title: { teamCapacity: "Capacité de l'équipe" }
  },
  topClientsWidget: {
    noActiveClientsYet: "Aucun client actif pour le moment"
  },
  partnerActivityFeedUnified: {
    postARoleToSeeApplicationsInterviewsAndU: "Publiez un poste pour voir les candidatures, entretiens et mises à jour ici"
  },
  upcomingScheduleWidget: {
    interviewsAreAutomaticallyScheduledOnceC: "Les entretiens sont automatiquement programmés une fois que les candidats sont présélectionnés pour vos postes"
  },

  // --- Game/assessment sections ---
  blindSpot: {
    blindSpotDetector: "Détecteur d'angles morts",
    discoverTheGapBetweenSelfperceptionAndRe: "Découvrez l'écart entre la perception de soi et la réalité",
    compareHowYouSeeYourselfWithObjectiveBeh: "Comparez votre propre perception avec des mesures comportementales objectives pour révéler les angles morts et les forces cachées.",
    startAssessment: "Commencer l'évaluation",
    yourSelfAwarenessProfile: "Votre profil de conscience de soi",
    blindSpots: "Angles morts",
    skillsYouMayBeOverestimating: "Compétences que vous pourriez surestimer",
    hiddenStrengths: "Forces cachées",
    skillsYoureUndervaluing: "Compétences que vous sous-estimez",
    dimensionComparison: "Comparaison des dimensions",
    backToAssessments: "Retour aux évaluations",
    rateYourself: "Évaluez-vous",
    howWouldYouRateYourAbilitiesInTheseAreas: "Comment évalueriez-vous vos compétences dans ces domaines ? Soyez honnête !",
    yourRating: "Votre évaluation",
    beginner: "Débutant",
    expert: "Expert",
    confidenceInRating: "Confiance dans l'évaluation",
    unsure: "Incertain",
    verySure: "Très sûr",
    continueToScenarios: "Continuer vers les scénarios"
  },
  clubPilot: {
    clubPilot: "Club Pilot",
    aIpoweredTaskOrchestrationAutoprioritiza: "Orchestration de tâches alimentée par l'IA • Auto-priorisation • Planification intelligente",
    aIdrivenObjectivesInProgress: "Objectifs pilotés par l'IA en cours",
    subtasksDelegatedBetweenAgents: "Sous-tâches déléguées entre agents",
    scheduledToday: "Programmé aujourd'hui",
    inProgress: "En cours",
    pending: "En attente",
    totalActive: "Total actifs",
    autoscheduledByClubPilot: "Planifié automatiquement par Club Pilot",
    noScheduledTasksRunClubPilotToAutoschedu: "Aucune tâche planifiée. Lancez Club Pilot pour planifier automatiquement vos tâches.",
    awaitingScheduling: "En attente de planification",
    "allTasksAreScheduledGreatJob ": "Toutes les tâches sont planifiées ! Excellent travail ! 🎉",
    failedToLoadDashboardData: "Échec du chargement des données du tableau de bord",
    failedToUpdateTask: "Échec de la mise à jour de la tâche",
    openClubPilot: "Ouvrir Club Pilot",
    whatNeedsToBeDone: "Que faut-il faire ?",
    quickTask: "Tâche rapide",
    createATaskInstantly: "Créez une tâche instantanément.",
    createTask: "Créer une tâche",
    taskCreated: "Tâche créée",
    failedToCreateTask: "Échec de la création de la tâche"
  },
  clubTasks: {
    failedToLoadTasks: "Échec du chargement des tâches",
    taskStatusUpdated: "Statut de la tâche mis à jour",
    failedToUpdateTask: "Échec de la mise à jour de la tâche",
    description: "Description",
    status: "Statut",
    assignedTo: "Assigné à",
    blockedBy: "Bloqué par",
    dueDate: "Date d'échéance",
    close: "Fermer",
    seeDetails: "Voir les détails",
    noTasksAssignedYet: "Aucune tâche assignée pour le moment",
    failedToLoadTasksByMember: "Échec du chargement des tâches par membre",
    bLOCKED: "BLOQUÉ",
    total: "Total",
    rEADYFORACTION: "PRÊT À L'ACTION",
    oNGOING: "EN COURS",
    failedToLoadOverview: "Échec du chargement de la vue d'ensemble",
    describeTheTask: "Décrivez la tâche...",
    createNewTask: "Créer une nouvelle tâche",
    "taskTitle ": "Titre de la tâche *",
    priority: "Priorité",
    assignTo: "Assigner à",
    blockedBySelectBlockingTasks: "Bloqué par (Sélectionnez les tâches bloquantes)",
    taskCreatedSuccessfully: "Tâche créée avec succès",
    failedToCreateTask: "Échec de la création de la tâche",
    describeTheObjective: "Décrivez l'objectif...",
    createNewObjective: "Créer un nouvel objectif",
    "objectiveTitle ": "Titre de l'objectif *",
    objectiveCreatedSuccessfully: "Objectif créé avec succès",
    failedToCreateObjective: "Échec de la création de l'objectif"
  },
  imageEditor: {
    cancel: "Annuler",
    presetFilters: "Filtres prédéfinis",
    customAdjustments: "Ajustements personnalisés",
    brightness: "Luminosité",
    contrast: "Contraste",
    saturation: "Saturation",
    livePreview: "Aperçu en direct"
  },
  landing: {
    janeSmith: "Jane Smith",
    "12345678900": "+1 234 567 8900",
    amsterdam: "Amsterdam,",
    qCXXXXXX: "QC-XXXXXX",
    acmeInc: "Acme Inc.",
    seniorProductManager: "Directeur produit senior",
    select: "Sélectionnez...",
    eNTERACCESSCODE: "ENTREZ LE CODE D'ACCÈS",
    chooseYourPath: "Choisissez votre parcours",
    selectTheCategoryThatBestDescribesYou: "Sélectionnez la catégorie qui vous décrit le mieux",
    basicInformation: "Informations de base",
    "fullName ": "Nom complet *",
    "email ": "E-mail *",
    linkedInProfile: "Profil LinkedIn",
    phone: "Téléphone",
    location: "Localisation",
    referralCodeOptional: "Code de parrainage (optionnel)",
    back: "Retour",
    continue: "Continuer",
    tellUsMore: "Dites-nous en plus",
    helpUsUnderstandYourGoals: "Aidez-nous à comprendre vos objectifs",
    industry: "Secteur",
    seniority: "Séniorité",
    dontHaveAnInviteJoinTheWaitlist: "Pas d'invitation ? Rejoignez la liste d'attente",
    joinTheQuantumClub: "Rejoindre The Quantum Club",
    applicationSubmitted: "Candidature soumise !",
    wellReviewYourApplicationAndGetBackToYou: "Nous examinerons votre candidature et vous recontacterons dans les 48 heures. Consultez votre e-mail pour les prochaines étapes.",
    yourReferralCode: "Votre code de parrainage",
    shareThisCodeToEarnPriorityStatusAndRewa: "Partagez ce code pour obtenir un statut prioritaire et des récompenses !",
    invalidAccessCodeRequestAnInviteToJoin: "Code d'accès invalide. Demandez une invitation pour rejoindre.",
    pleaseFillInRequiredFields: "Veuillez remplir les champs obligatoires",
    pLATFORMFEATURES: "FONCTIONNALITÉS DE LA PLATEFORME",
    fullName: "Nom complet",
    emailAddress: "Adresse e-mail",
    linkedInProfileOptional: "Profil LinkedIn (optionnel)",
    checkYourEmailForNextSteps: "Consultez votre e-mail pour les prochaines étapes",
    errorValidatingInviteCodePleaseTryAgain: "Erreur lors de la validation du code d'invitation. Veuillez réessayer.",
    somethingWentWrongPleaseTryAgain: "Une erreur s'est produite. Veuillez réessayer.",
    mEMBERTESTIMONIALS: "TÉMOIGNAGES DE MEMBRES",
    eLITEOUTCOMES: "RÉSULTATS D'ÉLITE",
    gDPRCompliant: "Conforme au RGPD",
    privateSecure: "Privé et sécurisé",
    inviteReviewed: "Invitation examinée"
  },
  objectives: {
    describeTheObjectiveAndItsContext: "Décrivez l'objectif et son contexte...",
    defineWhatSuccessLooksLikeForThisObjecti: "Définissez à quoi ressemble le succès pour cet objectif...",
    addTagsPressEnter: "Ajouter des étiquettes (appuyez sur Entrée)",
    createNewObjective: "Créer un nouvel objectif",
    defineANewProjectObjectiveWithGoalsTimel: "Définissez un nouvel objectif de projet avec des buts, un calendrier et des responsables.",
    "title ": "Titre *",
    description: "Description",
    goalsSuccessCriteria: "Objectifs et critères de réussite",
    priority: "Priorité",
    milestoneType: "Type de jalon",
    startDate: "Date de début",
    dueDate: "Date d'échéance",
    hardDeadline: "Échéance ferme",
    tags: "Étiquettes",
    add: "Ajouter",
    objectiveOwners: "Responsables de l'objectif",
    pleaseFillInAllRequiredFields: "Veuillez remplir tous les champs obligatoires",
    objectiveCreatedSuccessfully: "Objectif créé avec succès",
    failedToCreateObjective: "Échec de la création de l'objectif",
    progress: "Progression",
    tasksBlockedByThisObjective: "Tâches bloquées par cet objectif :",
    tasksBlockingThisObjective: "Tâches bloquant cet objectif :",
    loadingObjectives: "Chargement des objectifs...",
    objectivesBoard: "Tableau des objectifs",
    dragObjectivesToChangeTheirStatus: "Glissez les objectifs pour changer leur statut",
    failedToLoadObjectives: "Échec du chargement des objectifs",
    objectiveStatusUpdated: "Statut de l'objectif mis à jour",
    failedToUpdateObjective: "Échec de la mise à jour de l'objectif",
    objectivesList: "Liste des objectifs",
    completeOverviewOfAllObjectives: "Vue complète de tous les objectifs",
    unassigned: "Non assigné"
  },
  partnerSetup: {
    skipForNow: "Passer pour le moment",
    pleaseEnterAValidEmailAddress: "Veuillez entrer une adresse e-mail valide.",
    emailAlreadyAdded: "E-mail déjà ajouté.",
    companyInformationNotFoundYouCanInviteCo: "Informations de l'entreprise introuvables. Vous pourrez inviter des collègues depuis les paramètres ultérieurement.",
    failedToSendInvitationsYouCanDoThisLater: "Échec de l'envoi des invitations. Vous pourrez le faire ultérieurement depuis les paramètres."
  },
  partnerHome: {
    welcomeToTheQuantumClub: "Bienvenue sur The Quantum Club",
    companySetupInProgress: "Configuration de l'entreprise en cours",
    completeYourAccountSetupToGetStartedWith: "Complétez la configuration de votre compte pour commencer avec votre portail partenaire",
    yourStrategistIsFinalisingYourCompanyPro: "Votre stratège finalise votre profil d'entreprise. Vous verrez votre tableau de bord ici sous peu."
  },
  pressureCooker: {
    finishEarly: "Terminer en avance",
    taskInbox: "Boîte de réception des tâches",
    notesResponse: "Notes / Réponse",
    responseTone: "Ton de la réponse",
    brief: "Bref",
    professional: "Professionnel",
    pressureCookerAssessment: "Évaluation sous pression",
    startAssessment: "Commencer l'évaluation",
    assessmentComplete: "Évaluation terminée !",
    communicationStyle: "Style de communication",
    yourApproachToDelegationAndTaskCommunica: "Votre approche de la délégation et de la communication des tâches",
    recommendations: "Recommandations",
    backToAssessments: "Retour aux évaluations"
  },
  swipeGame: {
    howToPlay: "Comment jouer",
    swipeThrough50ScenariosToDiscoverYourWor: "Balayez 50 scénarios pour découvrir votre personnalité au travail",
    "gotItLetsGo ": "Compris, allons-y ! 🚀",
    analyzingYourPersonality: "Analyse de votre personnalité...",
    yourPersonalityProfile: "Votre profil de personnalité",
    basedOnYourResponsesTo50Scenarios: "Basé sur vos réponses à 50 scénarios",
    overallFitScore: "Score de compatibilité globale",
    yourTopTraits: "Vos traits dominants",
    yourStrongestCharacteristics: "Vos caractéristiques les plus fortes",
    recommendedRoles: "Postes recommandés",
    jobsThatMatchYourPersonality: "Emplois correspondant à votre personnalité",
    resultsDownloaded: "Résultats téléchargés !",
    shareLinkCopiedToClipboard: "Lien de partage copié dans le presse-papiers !",
    resultsSentToYourEmail: "Résultats envoyés à votre e-mail !",
    lOVEIT: "J'ADORE !",
    lIKEIT: "J'AIME",
    nOTFORME: "PAS POUR MOI",
    aVOID: "ÉVITER"
  },
  valuesPoker: {
    allocateYour100Points: "Allouez vos 100 points",
    distributePointsToReflectWhatTrulyMatter: "Distribuez les points pour refléter ce qui compte vraiment pour vous dans votre carrière",
    pointsAllocated: "Points alloués",
    continueToTradeoffs: "Continuer vers les compromis",
    valuesPoker: "Poker des valeurs",
    discoverWhatTrulyMotivatesYouAtWork: "Découvrez ce qui vous motive vraiment au travail",
    allocate100PointsAcrossWorkValuesThenMak: "Allouez 100 points à travers les valeurs de travail, puis faites des compromis dans des scénarios réalistes. Nous comparerons ce que vous dites important avec ce que vous choisissez réellement.",
    startAssessment: "Commencer l'évaluation",
    yourValuesProfile: "Votre profil de valeurs",
    howWellYourStatedValuesMatchYourChoices: "Dans quelle mesure vos valeurs déclarées correspondent à vos choix",
    yourTopValues: "Vos valeurs principales",
    cultureFitScores: "Scores d'adéquation culturelle",
    inconsistenciesWorthNoting: "Incohérences à noter",
    backToAssessments: "Retour aux évaluations",
    optionA: "Option A",
    optionB: "Option B"
  },
  voice: {
    clubAIVoice: "ClubAI Voice",
    talkToClubAI: "Parler à ClubAI",
    voicepoweredAssistant: "Assistant vocal",
    startSpeakingToInteractWithClubAI: "Commencez à parler pour interagir avec ClubAI",
    mic: "Micro",
    endSession: "Terminer la session"
  },
  legalPages: {
    legalCenter: "Centre juridique",
    legalCenterDesc: "Vos droits et nos engagements, clairement documentés. Nous croyons en la transparence et souhaitons que vous compreniez notre fonctionnement.",
    additionalResources: "Ressources supplémentaires",
    viewSubprocessors: "Voir les sous-traitants",
    contactPrivacyTeam: "Contacter l'équipe de confidentialité",
    referralTerms: "Conditions du programme de parrainage",
    securityPolicy: "Politique de sécurité",
    accessibilityStatement: "Déclaration d'accessibilité",
    cookiePolicy: "Politique de cookies",
    dataProcessingAgreement: "Accord de traitement des données",
    acceptableUsePolicy: "Politique d'utilisation acceptable"
  },

  // --- booking (within existing section) ---
  _booking: {
    switchToFormat: "Passer au format {{format}}",
    currentFormat: "Format actuel : {{format}}. Cliquez pour changer.",
    popular: "Populaire",
    popularTooltip: "Horaire historiquement populaire avec un taux de présence élevé. Propulsé par QUIN.",
    waitlistPromoted: "Un invité de la liste d'attente a été notifié du créneau disponible !",
    progress: "Progression de la réservation",
    analytics: {
      totalBookings: "Total des réservations",
      completed: "Terminées",
      completionRate: "Taux de complétion",
      avgDuration: "Durée moyenne"
    },
    steps: {
      selectTime: "Sélectionner l'heure",
      yourDetails: "Vos coordonnées",
      payment: "Paiement",
      confirmed: "Confirmé"
    },
    timezone: {
      yours: "Votre fuseau horaire",
      host: "Fuseau horaire de l'hôte",
      difference: "Décalage horaire : {{hours}} heures",
      doubleCheck: "Veuillez vérifier que l'heure de la réunion vous convient.",
      yourTime: "Votre heure",
      hostTime: "Heure de l'hôte",
      currently: "Actuellement",
      showInMine: "Afficher dans mon fuseau",
      showInHost: "Afficher dans le fuseau de l'hôte"
    }
  },

  // --- timeTracking (within existing section) ---
  _timeTracking: {
    startATimerLinkedToYourAIprioritizedTask: "Démarrez un chronomètre lié à vos tâches priorisées par l'IA"
  }
};

// Helper: set a deep key in an object
function setDeep(obj, path, value) {
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

// Helper: deep merge
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (key in target && typeof target[key] === 'object' && target[key] !== null &&
        typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      deepMerge(target[key], source[key]);
    } else if (!(key in target)) {
      target[key] = source[key];
    }
  }
}

// Process translations
for (const [section, value] of Object.entries(translations)) {
  if (section === '_academy_nav') {
    if (!fr.academy) fr.academy = {};
    if (!fr.academy.nav) fr.academy.nav = {};
    deepMerge(fr.academy.nav, value);
  } else if (section === '_achievements_categories') {
    if (!fr.achievements) fr.achievements = {};
    if (!fr.achievements.categories) fr.achievements.categories = {};
    deepMerge(fr.achievements.categories, value);
  } else if (section === '_achievements_rarities') {
    if (!fr.achievements) fr.achievements = {};
    if (!fr.achievements.rarities) fr.achievements.rarities = {};
    deepMerge(fr.achievements.rarities, value);
  } else if (section === '_achievements_actions') {
    if (!fr.achievements) fr.achievements = {};
    if (!fr.achievements.actions) fr.achievements.actions = {};
    deepMerge(fr.achievements.actions, value);
  } else if (section === '_achievements_estimates') {
    if (!fr.achievements) fr.achievements = {};
    if (!fr.achievements.estimates) fr.achievements.estimates = {};
    deepMerge(fr.achievements.estimates, value);
  } else if (section === '_booking') {
    if (!fr.booking) fr.booking = {};
    deepMerge(fr.booking, value);
  } else if (section === '_timeTracking') {
    if (!fr.timeTracking) fr.timeTracking = {};
    deepMerge(fr.timeTracking, value);
  } else {
    // Top-level section
    if (section in fr && typeof fr[section] === 'object' && typeof value === 'object') {
      deepMerge(fr[section], value);
    } else if (!(section in fr)) {
      fr[section] = value;
    }
  }
}

writeFileSync('./src/i18n/locales/fr/common.json', JSON.stringify(fr, null, 2) + '\n');

// Verify
const en = JSON.parse(readFileSync('./src/i18n/locales/en/common.json', 'utf8'));
const frNew = JSON.parse(readFileSync('./src/i18n/locales/fr/common.json', 'utf8'));

function countKeys(obj) {
  let c = 0;
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) c += countKeys(obj[k]);
    else c++;
  }
  return c;
}

function findMissing(e, f, p) {
  const m = [];
  for (const k of Object.keys(e)) {
    if (!(k in f)) {
      m.push(p + k);
    } else if (typeof e[k] === 'object' && e[k] !== null && typeof f[k] === 'object' && f[k] !== null) {
      m.push(...findMissing(e[k], f[k], p + k + '.'));
    }
  }
  return m;
}

const missing = findMissing(en, frNew, '');
console.log('EN keys:', countKeys(en));
console.log('FR keys:', countKeys(frNew));
console.log('Still missing:', missing.length);
if (missing.length > 0) {
  missing.slice(0, 30).forEach(m => console.log('  ' + m));
  if (missing.length > 30) console.log('  ... +' + (missing.length - 30) + ' more');
}
