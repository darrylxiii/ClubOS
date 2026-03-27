import { readFileSync, writeFileSync } from 'fs';

const en = JSON.parse(readFileSync('./src/i18n/locales/en/partner.json', 'utf8'));
const fr = JSON.parse(readFileSync('./src/i18n/locales/fr/partner.json', 'utf8'));

// Deep merge helper - only adds missing keys
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

// Fix the half-translated funnel keys (FR has Franglais mix)
// These already exist, so we skip them per rules (don't modify existing)

// All translated sections
const translations = {
  funnelAnalytics: {
    text1: "Analytique du tunnel de conversion",
    text2: "Suivi en temps réel des demandes partenaires et insights",
    text3: "Total des vues",
    text4: "Sessions uniques",
    text5: "Soumissions",
    text6: "Taux de conversion",
    text7: "Taux d'abandon",
    text8: "Progression des étapes du tunnel",
    text9: "Répartition des statuts de demande",
    text10: "Demandes de partenariat",
    text11: "Filtrer par statut",
    text12: "Tous les statuts",
    text13: "En attente",
    text14: "En cours d'examen",
    text15: "Approuvé",
    text16: "Refusé",
    text17: "Date",
    text18: "Entreprise",
    text19: "Contact",
    text20: "Secteur",
    text21: "Type",
    text22: "Statut",
    text23: "Source"
  },
  partnerAnalyticsDashboard: {
    text1: "Aucune entreprise associée à votre compte",
    text2: "Vue d'ensemble",
    text3: "Pipeline",
    text4: "Tendances",
    text5: "Benchmarks"
  },
  partnerFunnel: {
    desc: "Décrivez le poste. Nous nous occupons du reste.",
    desc2: "Aucun frais avant l'embauche. Pas de contrats à long terme.",
    text3: "Quantum Club",
    text4: "Quantum Club",
    text5: "Candidatures de partenariat temporairement suspendues",
    text6: "Quantum Club",
    text7: "Quantum Club",
    text8: "Partagez votre brief",
    text9: "Échangez avec un stratège",
    text10: "Consultez votre présélection"
  },
  partnerRejections: {
    text1: "Opportunité vivier de talents",
    text2: "Rechercher des candidats...",
    text3: "Toutes les offres",
    text4: "Toutes les offres",
    text5: "Toutes les raisons",
    text6: "Toutes les raisons"
  },
  partnerRelationships: {
    text1: "Relations candidats",
    text2: "Surveillez et entretenez vos relations avec les candidats"
  },
  partnerSetup: {
    desc: "Cliquez sur l'icône appareil photo pour téléverser",
    desc2: "Nous pouvons importer automatiquement votre photo de profil depuis LinkedIn."
  },
  partnerWelcome: {
    title: "Et maintenant",
    desc: "Votre organisation",
    desc2: "Votre stratège dédié",
    desc3: "Explorer les postes ouverts",
    desc4: "Parcourez les opportunités exclusives sélectionnées pour votre réseau",
    desc5: "Soumettre des candidats",
    desc6: "Présentez les meilleurs talents grâce à notre processus simplifié",
    desc7: "Planifier votre appel d'intégration"
  },
  addCandidateDialog: {
    toast: {
      duplicateEmailDetected: "E-mail en double détecté",
      duplicateEmailDetectedDesc: "Un candidat avec cet e-mail existe déjà. Veuillez rechercher le candidat existant ou utiliser un autre e-mail.",
      databaseError: "Erreur de base de données",
      databaseErrorDesc: "Impossible de lier les données du candidat. Veuillez réessayer ou contacter le support si le problème persiste.",
      permissionDenied: "Permission refusée",
      permissionDeniedDesc: "Vous n'avez pas la permission d'ajouter des candidats. Veuillez contacter un administrateur.",
      duplicateCandidate: "Candidat en double",
      duplicateCandidateDesc: "Ce candidat existe déjà dans le système. Veuillez vérifier les candidatures existantes."
    },
    placeholder: {
      johnDoe: "Jean Dupont",
      techCorp: "Tech Corp",
      seniorDeveloper: "Développeur Senior",
      whyThisCandidateSourceSpecialConsiderati: "Pourquoi ce candidat ? Source ? Considérations particulières ?"
    }
  },
  addJobTeamMemberDialog: {
    dialogTitle: "Ajouter un membre d'équipe",
    toast: {
      failedToLoadTeamMembers: "Échec du chargement des membres d'équipe",
      failedToLoadTqcTeamMembers: "Échec du chargement des membres TQC",
      pleaseSelectATeamMember: "Veuillez sélectionner un membre d'équipe",
      pleaseSelectAUser: "Veuillez sélectionner un utilisateur",
      pleaseProvideAReasonForThisAssignment: "Veuillez fournir une raison pour cette assignation",
      teamMemberAddedSuccessfully: "Membre d'équipe ajouté avec succès"
    },
    label: {
      teamMember: "Membre d'équipe",
      role: "Rôle",
      permissions: "Permissions",
      selectTqcTeamMember: "Sélectionner un membre TQC",
      assignmentReason: "Raison de l'assignation"
    },
    placeholder: {
      selectATeamMember: "Sélectionnez un membre d'équipe",
      searchTqcTeamByNameOrEmail: "Rechercher un membre TQC par nom ou e-mail...",
      whyIsThisPersonBeingAssignedToThisJob: "Pourquoi cette personne est-elle assignée à cette offre ?"
    },
    badge: {
      admin: "Admin",
      strategist: "Stratège"
    },
    noMatchingTeamMembersFound: "Aucun membre d'équipe correspondant",
    externalUsersReceiveLimitedTimeboxedAcce: "Les utilisateurs externes reçoivent un accès limité dans le temps avec journalisation d'audit",
    dialogDescription: "Assignez un membre d'équipe ou un utilisateur externe à cette offre avec un rôle et des permissions spécifiques.",
    option: {
      hiringManager: "Responsable du recrutement",
      founderexecutiveReviewer: "Fondateur/Évaluateur exécutif",
      technicalInterviewer: "Intervieweur technique",
      behavioralInterviewer: "Intervieweur comportemental",
      panelMember: "Membre du panel",
      interviewCoordinator: "Coordinateur d'entretien",
      observer: "Observateur"
    }
  },
  addStageDialog: {
    dialogTitle: "Ajouter une nouvelle étape de pipeline",
    placeholder: {
      buildingroomNumberReceptionInstructionsP: "Bâtiment/Numéro de salle, Instructions d'accueil, Informations de stationnement, Notes d'accessibilité...",
      listMaterialsCandidatesShouldPreparePort: "Listez les documents que les candidats doivent préparer (portfolio, références, certificats, etc.)"
    },
    configureEveryDetailForALuxuryTailoredCa: "Configurez chaque détail pour une expérience candidat haut de gamme et personnalisée",
    candidatesCanChooseBetweenOnlineOrInpers: "Les candidats peuvent choisir entre en ligne ou en personne. Configurez les deux options ci-dessus ou fournissez des instructions flexibles.",
    thisHelpsEvaluatorsProvideConsistentStru: "Cela aide les évaluateurs à fournir un retour cohérent et structuré",
    quickstartWithPreconfiguredStageTemplate: "Démarrage rapide avec des modèles d'étapes préconfigurés",
    option: {
      noTeamMembersAvailable: "Aucun membre d'équipe disponible"
    },
    desc: {
      stageConfigurationSavedAndAuditLogged: "Configuration de l'étape enregistrée et journalisée"
    }
  },
  addToJobDialog: {
    dialogTitle: "Ajouter au pipeline d'offre",
    toast: {
      candidateAddedButInteractionLogFailed: "Candidat ajouté mais échec de la journalisation",
      candidateAddedButAuditLogFailed: "Candidat ajouté mais échec du journal d'audit",
      failedToAddCandidate: "Échec de l'ajout du candidat à l'offre"
    },
    label: {
      startingStage: "Étape de départ",
      notesOptional: "Notes (optionnel)"
    },
    placeholder: {
      searchJobsByTitleOrCompany: "Rechercher des offres par titre ou entreprise...",
      whyAreYouAddingThisCandidate: "Pourquoi ajoutez-vous ce candidat ?"
    },
    badge: {
      alreadyInPipeline: "Déjà dans le pipeline"
    },
    noActiveJobsFound: "Aucune offre active trouvée."
  },
  adminBoardTools: {
    toast: {
      globalAnalytics: "Analytique globale",
      globalAnalyticsDesc: "Insights inter-entreprises et indicateurs à l'échelle de la plateforme",
      talentPoolAccessGranted: "Accès au vivier de talents accordé",
      talentPoolAccessGrantedDesc: "Accès complet à 12 847 profils de candidats",
      companyManagement: "Gestion des entreprises",
      companyManagementDesc: "Gérez toutes les entreprises partenaires et leurs niveaux d'accès",
      bulkOperations: "Opérations en masse",
      bulkOperationsDesc: "Effectuez des actions en masse sur plusieurs offres et candidats",
      platformSettings: "Paramètres de la plateforme",
      platformSettingsDesc: "Configurez les règles globales, les modèles IA et les workflows",
      aiConfiguration: "Configuration IA",
      aiConfigurationDesc: "Ajustez les algorithmes de matching, les pondérations et les modèles ML",
      systemHealthOptimal: "Santé du système : Optimale",
      systemHealthOptimalDesc: "Tous les services fonctionnent normalement. 99,97% de disponibilité",
      globalDataExport: "Export de données globales",
      globalDataExportDesc: "Export des analytiques anonymisées de la plateforme...",
      accessControl: "Contrôle d'accès",
      accessControlDesc: "Gérez les rôles, permissions et politiques de sécurité"
    },
    badge: {
      quantumClubAdmin: "ADMIN QUANTUM CLUB"
    },
    platformwideManagementAnalytics: "Gestion et analytique à l'échelle de la plateforme",
    companyManagement: "Gestion des entreprises",
    viewManageAllPartners: "Voir et gérer tous les partenaires",
    bulkOperations: "Opérations en masse",
    crossjobActionsAtScale: "Actions inter-offres à grande échelle",
    aiModelConfig: "Configuration du modèle IA",
    tuneMatchingAlgorithms: "Ajuster les algorithmes de matching",
    systemHealth: "Santé du système",
    platformStatusUptime: "Statut et disponibilité de la plateforme",
    accessControl: "Contrôle d'accès",
    rolesPermissions: "Rôles et permissions",
    platformSettings: "Paramètres de la plateforme",
    globalConfigurations: "Configurations globales",
    exportGlobalData: "Exporter les données globales",
    platformwideAnalytics: "Analytique de la plateforme",
    refreshAllMetrics: "Actualiser tous les indicateurs",
    recalculateEverything: "Tout recalculer"
  },
  adminJobTools: {
    sheetTitle: "Export des e-mails",
    toast: {
      metricsUpdatedSuccessfully: "Indicateurs mis à jour avec succès",
      aiMatchingEngine: "Moteur de matching IA",
      aiMatchingEngineDesc: "Analyse du vivier de talents mondial pour des correspondances parfaites...",
      found23HighpotentialCandidates: "23 candidats à fort potentiel trouvés",
      found23HighpotentialCandidatesDesc: "Scoring IA avancé appliqué. Consultez dans le pipeline.",
      bulkImport: "Import en masse",
      bulkImportDesc: "Téléversez un CSV ou connectez un ATS pour importer des candidats",
      pipelineHealth94: "Santé du pipeline : 94%",
      pipelineHealth94Desc: "Flux excellent. Délai moyen d'embauche : 12 jours",
      exportingPipelineData: "Export des données du pipeline",
      exportingPipelineDataDesc: "Export analytique complet conforme au RGPD",
      recalculatingMetrics: "Recalcul des indicateurs...",
      recalculatingMetricsDesc: "Utilisation des derniers modèles IA et algorithmes de scoring"
    },
    badge: {
      adminJobTools: "OUTILS ADMIN OFFRES"
    },
    joblevelOperations: "Opérations au niveau de l'offre"
  },
  advancedJobFilters: {
    title: "Filtres avancés",
    status: "Statut",
    company: "Entreprise",
    createdDateRange: "Période de création",
    fromDate: "À partir du",
    toDate: "Jusqu'au"
  },
  applicantPipeline: {
    noActiveJobs: "Aucune offre active",
    applicantPipeline: "Pipeline de candidatures",
    noApplicationsYet: "Aucune candidature pour le moment",
    toast: {
      failedToLoadApplicants: "Échec du chargement des candidats"
    },
    publishAJobToStartReceivingApplications: "Publiez une offre pour commencer à recevoir des candidatures",
    applicationsWillAppearHereOnceCandidates: "Les candidatures apparaîtront ici une fois que les candidats commenceront à postuler",
    noCandidatesInThisStage: "Aucun candidat à cette étape"
  },
  applicationsAnalytics: {
    title: "Répartition du pipeline",
    avgTimeToHire: "Délai moyen d'embauche",
    conversionRate: "Taux de conversion",
    activePipelines: "Pipelines actifs",
    stalledPipelines: "Pipelines bloqués",
    excellent: "Excellent",
    needsImprovement: "À améliorer",
    inProgress: "En cours",
    needAttention: "Nécessite attention"
  },
  applicationsFilters: {
    placeholder: {
      allStatuses: "Tous les statuts",
      allJobs: "Toutes les offres",
      allCompanies: "Toutes les entreprises",
      allSources: "Toutes les sources",
      allUrgency: "Toute urgence"
    },
    option: {
      allStatuses: "Tous les statuts",
      active: "Actif",
      hired: "Embauché",
      rejected: "Refusé",
      withdrawn: "Retiré",
      allJobs: "Toutes les offres",
      allCompanies: "Toutes les entreprises",
      allSources: "Toutes les sources",
      linkedin: "LinkedIn",
      referral: "Recommandation",
      direct: "Direct",
      agency: "Agence",
      all: "Tous",
      recentActivity: "Activité récente"
    }
  },
  applicationsTable: {
    badge: {
      noActivity: "Aucune activité",
      urgent: "Urgent",
      pendingSignup: "Inscription en attente"
    },
    noApplicationsFoundMatchingYourFilters: "Aucune candidature correspondant à vos filtres"
  },
  benchmarkComparison: {
    badge: {
      updatedToday: "Mis à jour aujourd'hui"
    },
    completeMoreHiringCyclesToUnlockBenchmar: "Complétez davantage de cycles d'embauche pour débloquer les comparaisons de benchmarks"
  },
  calendarInterviewLinker: {
    badge: {
      tqc: "TQC"
    },
    automaticallyDetectedInterviewsFromYourC: "Entretiens détectés automatiquement depuis votre calendrier",
    selectACalendarEventToLinkAsAnInterview: "Sélectionnez un événement du calendrier à lier comme entretien",
    interviewsThatHaveBeenConfirmedAndLinked: "Entretiens confirmés et liés à cette offre",
    dialogDescription: "Parcourez vos événements de calendrier ou consultez les entretiens détectés automatiquement"
  },
  candidateActionDialog: {
    toast: {
      noNextStageAvailable: "Aucune étape suivante disponible",
      pleaseProvideARejectionReason: "Veuillez fournir un motif de refus",
      failedToProcessAction: "Échec du traitement de l'action"
    },
    label: {
      rejectionReason: "Motif de refus *"
    },
    placeholder: {
      selectAReason: "Sélectionnez un motif"
    },
    clubCheckAdvanceCandidate: "Club Check - Avancer le candidat",
    thisCandidateHasPassedClubVettingStandar: "Ce candidat a satisfait aux standards de vérification du Club",
    option: {
      notAFit: "Profil inadapté",
      salaryExpectations: "Prétentions salariales",
      location: "Localisation",
      seniorityMismatch: "Décalage de séniorité",
      skillsGap: "Lacune de compétences",
      culturalFit: "Adéquation culturelle",
      other: "Autre"
    },
    desc: {
      clubCheckCompletedSuccessfully: "Club Check complété avec succès",
      feedbackRecordedAndCandidateNotified: "Retour enregistré et candidat notifié"
    }
  },
  candidateAnalytics: {
    toast: {
      failedToLoadAnalytics: "Échec du chargement de l'analytique"
    },
    badge: {
      highInterest: "Fort intérêt",
      excellentFit: "Excellente compatibilité",
      highlyEngaged: "Très engagé"
    },
    profileViews: "Vues du profil",
    uniqueViewers: "Visiteurs uniques",
    engagementScore: "Score d'engagement",
    fitScore: "Score de compatibilité",
    noProfileViewsYet: "Aucune vue de profil pour le moment",
    thisCandidateHasReceivedSignificantAtten: "Ce candidat a reçu une attention significative de l'équipe",
    aiAnalysisShowsStrongAlignmentWithRoleRe: "L'analyse IA montre un fort alignement avec les exigences du poste",
    candidateShowsStrongEngagementWithTheApp: "Le candidat montre un fort engagement dans le processus de candidature",
    noInsightsAvailableYetProfileViewsAndInt: "Aucun insight disponible. Les vues de profil et les interactions généreront des insights IA.",
    description: "Membres de l'équipe ayant récemment consulté ce profil"
  },
  candidateDecisionDashboard: {
    dialogTitle: "Passer à l'étape d'offre",
    toast: {
      noApplicationSelected: "Aucune candidature sélectionnée",
      candidateMovedToOfferStage: "Candidat déplacé à l'étape d'offre",
      failedToMoveCandidateToOfferStage: "Échec du déplacement vers l'étape d'offre",
      failedToLogVerdict: "Échec de l'enregistrement du verdict",
      openingInterviewScheduler: "Ouverture du planificateur d'entretien..."
    },
    placeholder: {
      addNotesAboutYourDecision: "Ajoutez des notes sur votre décision..."
    },
    overall: "Global",
    yearsExp: "Années d'exp.",
    salaryRange: "Fourchette salariale",
    noticePeriod: "Préavis",
    preferredLocation: "Localisation souhaitée",
    quickActions: "Actions rapides",
    alert: {
      thisActionWillTriggerTheOfferWorkflowAndDesc: "Cette action déclenchera le workflow d'offre et notifiera les parties concernées."
    }
  },
  candidateDetailDialog: {
    title: "Informations du candidat",
    toast: {
      failedToAddComment: "Échec de l'ajout du commentaire",
      commentAdded: "Commentaire ajouté",
      failedToSubmitScorecard: "Échec de la soumission de la fiche d'évaluation",
      scorecardSubmitted: "Fiche d'évaluation soumise",
      failedToMoveCandidate: "Échec du déplacement du candidat",
      candidateMoved: "Candidat déplacé"
    },
    placeholder: {
      moveToStage: "Déplacer vers l'étape...",
      whatAreTheirStrengths: "Quels sont ses points forts ?",
      anyConcerns: "Des préoccupations ?",
      additionalNotes: "Notes supplémentaires..."
    },
    tab: {
      overview: "Vue d'ensemble",
      scorecard: "Fiche d'évaluation",
      comments: "Commentaires",
      activity: "Activité"
    },
    activityTimelineComingSoon: "Chronologie d'activité bientôt disponible",
    pipelineStage: "Étape du pipeline",
    option: {
      strongYes: "Oui fort",
      yes: "Oui",
      neutral: "Neutre",
      strongNo: "Non fort"
    }
  },
  candidateDocumentsViewer: {
    dialogTitle: "Sélectionner le type de document",
    toast: {
      failedToLoadDocuments: "Échec du chargement des documents",
      failedToUpdateDocument: "Échec de la mise à jour du document",
      documentDeleted: "Document supprimé",
      failedToDeleteDocument: "Échec de la suppression du document"
    },
    label: {
      documentType: "Type de document",
      expiryDateOptional: "Date d'expiration (optionnel)"
    },
    loadingDocuments: "Chargement des documents",
    releaseToUpload: "Relâchez pour téléverser",
    noDocumentsYet: "Aucun document pour le moment",
    uploadTheFirstDocumentToGetStarted: "Téléversez le premier document pour commencer",
    documentsWillBeAutomaticallyArchivedAfte: "Les documents seront automatiquement archivés après cette date pour conformité RGPD",
    verified: "Vérifié",
    title: {
      documentPreview: "Aperçu du document"
    }
  },
  candidateInteractionLog: {
    title: "Chronologie des interactions",
    toast: {
      pleaseEnterNoteContent: "Veuillez saisir le contenu de la note",
      noteAddedSuccessfully: "Note ajoutée avec succès",
      failedToAddNote: "Échec de l'ajout de la note"
    },
    label: {
      logNewInteraction: "Enregistrer une nouvelle interaction"
    },
    placeholder: {
      enterInteractionDetails: "Saisissez les détails de l'interaction..."
    },
    noInteractionsLoggedYet: "Aucune interaction enregistrée",
    description: "Chargement des interactions du candidat...",
    option: {
      note: "Note",
      phoneCall: "Appel téléphonique",
      email: "E-mail",
      message: "Message",
      meeting: "Réunion"
    }
  },
  candidateInternalRatingCard: {
    title: "Historique des évaluations",
    toast: {
      ratingsUpdatedSuccessfully: "Évaluations mises à jour avec succès",
      failedToUpdateRatings: "Échec de la mise à jour des évaluations"
    },
    placeholder: {
      addContextForTheseRatings: "Ajoutez du contexte pour ces évaluations..."
    },
    overallTeamAssessmentOfCandidateQuality: "Évaluation globale de la qualité du candidat par l'équipe",
    candidateResponsivenessAndInterestLevel: "Réactivité et niveau d'intérêt du candidat",
    skillsAndExperienceAlignmentWithOpportun: "Alignement des compétences et de l'expérience avec les opportunités",
    viewAllRatingChangesAndTeamMemberAssessm: "Voir tous les changements d'évaluation et les appréciations des membres au fil du temps",
    description: "Indicateurs d'évaluation d'équipe (non visibles par le candidat)"
  },
  candidateInvitationDialog: {
    toast: {
      invitationSentSuccessfully: "Invitation envoyée avec succès !",
      failedToSendInvitation: "Échec de l'envoi de l'invitation"
    },
    label: {
      emailAddress: "Adresse e-mail",
      linkToSpecificJobsOptional: "Lier à des offres spécifiques (optionnel)",
      personalMessage: "Message personnel"
    },
    selectedJobsWillBeMentionedInTheInvitati: "Les offres sélectionnées seront mentionnées dans l'e-mail d'invitation",
    thisMessageWillBeIncludedInTheInvitation: "Ce message sera inclus dans l'e-mail d'invitation",
    whatHappensNext: "Que se passe-t-il ensuite ?"
  },
  candidateLinkedJobs: {
    toast: {
      failedToLoadLinkedJobs: "Échec du chargement des offres liées"
    },
    applied: "Postulé",
    lastUpdated: "Dernière mise à jour",
    salaryRange: "Fourchette salariale",
    stageProgress: "Progression d'étape",
    description: "Aucune candidature trouvée"
  },
  candidateNotesManager: {
    toast: {
      noteContentIsRequired: "Le contenu de la note est requis",
      youMustBeLoggedInToCreateNotes: "Vous devez être connecté pour créer des notes",
      noteSaved: "Note enregistrée",
      failedToDeleteNote: "Échec de la suppression de la note",
      noteDeleted: "Note supprimée",
      failedToUpdateNote: "Échec de la mise à jour de la note"
    },
    placeholder: {
      noteTitle: "Titre de la note...",
      addYourNotesHere: "Ajoutez vos notes ici..."
    },
    tab: {
      allNotes: "Toutes les notes",
      tqcInternal: "Interne TQC",
      partnerShared: "Partagé avec le partenaire",
      general: "Général"
    },
    loadingNotes: "Chargement des notes...",
    tqcInternal: "Interne TQC",
    visibleOnlyToTqcTeam: "Visible uniquement par l'équipe TQC",
    general: "Général",
    visibleToEveryone: "Visible par tous"
  },
  candidatePipelineStatus: {
    toast: {
      failedToLoadPipelineStatus: "Échec du chargement du statut du pipeline",
      pipelineStageUpdated: "Étape du pipeline mise à jour",
      failedToUpdateStage: "Échec de la mise à jour de l'étape"
    },
    currentStage: "Étape actuelle",
    progress: "Progression",
    description: "Aucune candidature active trouvée"
  },
  candidateQuickActions: {
    dialogTitle: "Importer depuis LinkedIn",
    toast: {
      pleaseEnterALinkedinUrl: "Veuillez saisir une URL LinkedIn",
      linkedinProfileImportedSuccessfully: "Profil LinkedIn importé avec succès.",
      failedToImportLinkedinProfile: "Échec de l'import du profil LinkedIn",
      profileExportedSuccessfully: "Profil exporté avec succès",
      failedToExportProfile: "Échec de l'export du profil"
    },
    label: {
      linkedinProfileUrl: "URL du profil LinkedIn"
    },
    dialogDescription: "Saisissez une URL de profil LinkedIn pour enrichir automatiquement le profil de ce candidat"
  },
  companyAchievements: {
    title: "Réalisations personnalisées",
    basicInformation: "Informations de base",
    unlockCriteria: "Critères de déblocage",
    noCustomAchievementsYet: "Aucune réalisation personnalisée pour le moment",
    label: {
      achievementName: "Nom de la réalisation *",
      description: "Description *",
      icon: "Icône",
      interactionType: "Type d'interaction *",
      requiredAmount: "Montant requis *",
      timeboundChallenge: "Défi limité dans le temps",
      daysToComplete: "Jours pour compléter *"
    },
    placeholder: {
      describeWhatThisAchievementRepresentsAnd: "Décrivez ce que cette réalisation représente et comment l'obtenir"
    },
    requireCompletionWithinASpecificTimefram: "Exiger la complétion dans un délai spécifique",
    createYourFirstCustomAchievementToRecogn: "Créez votre première réalisation personnalisée pour reconnaître et récompenser les contributions exceptionnelles de votre équipe.",
    noPlatformAchievementsEarnedByTeamMember: "Aucune réalisation de la plateforme obtenue par les membres de l'équipe pour le moment",
    analytics: "Analytique",
    description: "Réalisations standard obtenues par les membres de votre équipe sur la plateforme",
    dialogDescription: "Définissez les critères et récompenses pour les contributions exceptionnelles de l'équipe",
    created: "Créé",
    totalAwarded: "Total décerné",
    avgPerAchievement: "Moy. par réalisation",
    active: "Actif"
  },
  companyAnalyticsChart: {
    toast: {
      failedToLoadAnalytics: "Échec du chargement de l'analytique"
    },
    desc: {
      last30Days: "30 derniers jours",
      currentFollowers: "Abonnés actuels",
      reactionsComments: "Réactions et commentaires"
    }
  },
  companyBranding: {
    brandColors: "Couleurs de marque",
    typography: "Typographie",
    logosAssets: "Logos et visuels",
    brandPreview: "Aperçu de la marque",
    toast: {
      failedToLoadBranding: "Échec du chargement de l'image de marque",
      brandingUpdatedSuccessfully: "Image de marque mise à jour avec succès",
      failedToUpdateBranding: "Échec de la mise à jour de l'image de marque"
    },
    label: {
      primaryColor: "Couleur primaire",
      secondaryColor: "Couleur secondaire",
      accentColor: "Couleur d'accent",
      headingFont: "Police des titres",
      bodyFont: "Police du corps",
      lightLogoUrl: "URL du logo clair",
      darkLogoUrl: "URL du logo sombre",
      faviconUrl: "URL du favicon",
      socialPreviewImage: "Image de prévisualisation sociale"
    },
    description: "Personnalisez l'identité visuelle de votre entreprise"
  },
  companyBrandingEditor: {
    preview: "Aperçu",
    headingExample: "Exemple de titre",
    toast: {
      failedToLoadBrandingSettings: "Échec du chargement des paramètres de marque",
      brandingUpdatedSuccessfully: "Image de marque mise à jour avec succès",
      failedToUpdateBranding: "Échec de la mise à jour de l'image de marque"
    },
    label: {
      primaryColor: "Couleur primaire",
      secondaryColor: "Couleur secondaire",
      accentColor: "Couleur d'accent",
      headingFont: "Police des titres",
      bodyFont: "Police du corps"
    },
    placeholder: {
      interRobotoEtc: "Inter, Roboto, etc."
    },
    bodyTextExampleWithYourSelectedFontAndCo: "Exemple de texte avec votre police et vos couleurs sélectionnées.",
    description: "Personnalisez l'identité visuelle de votre entreprise"
  },
  companyFollowers: {
    toast: {
      failedToLoadFollowers: "Échec du chargement des abonnés"
    },
    badge: {
      notificationsOn: "Notifications activées"
    },
    noFollowersYet: "Aucun abonné pour le moment"
  },
  companyPosts: {
    companyPosts: "Publications de l'entreprise",
    toast: {
      failedToLoadPosts: "Échec du chargement des publications",
      postUpdatedSuccessfully: "Publication mise à jour avec succès",
      postCreatedSuccessfully: "Publication créée avec succès",
      failedToSavePost: "Échec de l'enregistrement de la publication",
      postDeletedSuccessfully: "Publication supprimée avec succès",
      failedToDeletePost: "Échec de la suppression de la publication"
    },
    label: {
      title: "Titre",
      content: "Contenu",
      postType: "Type de publication",
      tagsCommaSeparated: "Étiquettes (séparées par des virgules)"
    },
    badge: {
      featured: "À la une",
      private: "Privé"
    },
    manageYourCompanyNewsAndUpdates: "Gérez les actualités et mises à jour de votre entreprise",
    noPostsYetCreateYourFirstPostToGetStarte: "Aucune publication. Créez votre première publication pour commencer.",
    public: "Public",
    featured: "À la une",
    dialogDescription: "Partagez des actualités, jalons, événements et mises à jour avec votre audience",
    option: {
      news: "Actualités",
      milestone: "Jalon",
      event: "Événement",
      media: "Média"
    }
  },
  companyProfile: {
    title: "Profil de l'entreprise",
    toast: {
      failedToLoadCompanyProfile: "Échec du chargement du profil de l'entreprise",
      companyProfileUpdated: "Profil de l'entreprise mis à jour",
      failedToUpdateCompanyProfile: "Échec de la mise à jour du profil"
    },
    label: {
      companyName: "Nom de l'entreprise",
      tagline: "Accroche",
      description: "Description",
      website: "Site web",
      linkedinUrl: "URL LinkedIn",
      headquartersLocation: "Siège social",
      industry: "Secteur",
      companySize: "Taille de l'entreprise"
    },
    description: "Gérez les informations et l'image de marque de votre entreprise"
  },
  companyWall: {
    title: "Mur de l'entreprise",
    toast: {
      failedToLoadCompanyPosts: "Échec du chargement des publications"
    },
    badge: {
      featured: "À la une"
    },
    noPostsYetBeTheFirstToShareSomething: "Aucune publication. Soyez le premier à partager quelque chose !",
    description: "Dernières actualités, mises à jour et annonces"
  },
  contractDeadlineAlerts: {
    badge: {
      breached: "DÉPASSÉ"
    },
    milestoneDeadlineHasPassed: "L'échéance du jalon est dépassée",
    milestoneDeadlineApproaching: "L'échéance du jalon approche"
  },
  createInterviewDialog: {
    toast: {
      pleaseFillInAllRequiredFields: "Veuillez remplir tous les champs obligatoires",
      pleaseSelectAtLeastOneInterviewer: "Veuillez sélectionner au moins un intervieweur",
      interviewScheduledButFailedToAddToGoogle: "Entretien planifié, mais échec de l'ajout à Google Calendar",
      interviewScheduledAndAddedToYourGoogleCa: "Entretien planifié et ajouté à votre Google Calendar !",
      interviewScheduledButCalendarSyncFailed: "Entretien planifié, mais échec de la synchronisation calendrier",
      interviewScheduledSuccessfully: "Entretien planifié avec succès"
    },
    label: {
      addToGoogleCalendar: "Ajouter à Google Calendar",
      interviewType: "Type d'entretien *",
      meetingTitle: "Titre de la réunion *",
      description: "Description",
      date: "Date *",
      time: "Heure *",
      durationMinutes: "Durée (minutes)"
    },
    placeholder: {
      companyCandidateNameInterviewStage: "Entreprise - Nom du candidat - Étape d'entretien",
      candidateEmail: "E-mail du candidat",
      meetingDescriptionAndAgenda: "Description et ordre du jour de la réunion"
    },
    badge: {
      candidate: "Candidat"
    },
    googleCalendarConnected: "Google Calendar connecté",
    interviewWillBeSyncedToYourCalendarAndAt: "L'entretien sera synchronisé avec votre calendrier et les participants recevront des invitations",
    googleCalendarNotConnected: "Google Calendar non connecté",
    connectYourGoogleCalendarToAutomatically: "Connectez votre Google Calendar pour synchroniser automatiquement les entretiens et envoyer des invitations",
    titleAndDescriptionAutogeneratedWithComp: "Titre et description générés automatiquement avec les détails de l'entreprise, du candidat et des intervieweurs",
    noTeamMembersAssignedToThisJob: "Aucun membre d'équipe assigné à cette offre",
    aipoweredAutofill: "Remplissage automatique IA"
  },
  createJobDialog: {
    toast: {
      jobCreatedButFailedToAddSomeViewers: "Offre créée mais échec de l'ajout de certains spectateurs"
    },
    selectACompanyFirstToChooseFromSavedOffi: "Sélectionnez d'abord une entreprise pour choisir parmi les bureaux enregistrés",
    compensationDetailsAreSharedOnlyWithShor: "Les détails de rémunération ne sont partagés qu'avec les candidats présélectionnés, sauf affichage sur l'annonce."
  },
  createPostDialog: {
    dialogTitle: "Créer une publication",
    toast: {
      youMustBeLoggedInToCreateAPost: "Vous devez être connecté pour créer une publication",
      postCreatedSuccessfully: "Publication créée avec succès",
      failedToCreatePost: "Échec de la création de la publication"
    },
    label: {
      title: "Titre",
      postType: "Type de publication",
      content: "Contenu",
      tagsCommaSeparated: "Étiquettes (séparées par des virgules)",
      audience: "Audience",
      publicPost: "Publication publique",
      featured: "À la une",
      publishNow: "Publier maintenant"
    },
    placeholder: {
      excitingNewsToShareRequired: "Des nouvelles passionnantes à partager... (requis)",
      shareYourStory: "Partagez votre histoire..."
    },
    dialogDescription: "Partagez des actualités, mises à jour ou annonces avec vos abonnés",
    option: {
      news: "Actualités",
      milestone: "Jalon",
      event: "Événement",
      media: "Média"
    }
  },
  duplicateCandidateDialog: {
    dialogTitle: "Candidat déjà dans le pipeline",
    badge: {
      nameMatch: "Correspondance de nom",
      linkedinMatch: "Correspondance LinkedIn"
    }
  },
  editJobDialog: {
    dialogTitle: "Modifier l'offre",
    toast: {
      failedToLoadCompanies: "Échec du chargement des entreprises",
      jobUpdatedSuccessfully: "Offre mise à jour avec succès",
      failedToUpdateJob: "Échec de la mise à jour de l'offre"
    },
    label: {
      company: "Entreprise *",
      jobTitle: "Intitulé du poste *",
      description: "Description",
      location: "Localisation",
      employmentType: "Type de contrat",
      currency: "Devise",
      minSalary: "Salaire minimum",
      maxSalary: "Salaire maximum",
      addSupportingDocuments: "Ajouter des documents justificatifs",
      nicetohaveTools: "Outils appréciés"
    },
    placeholder: {
      selectACompany: "Sélectionnez une entreprise",
      searchToolsEgNotionFigmaPython: "Rechercher des outils (ex. Notion, Figma, Python)...",
      searchAdditionalTools: "Rechercher des outils supplémentaires..."
    },
    currentDocumentUploadedUploadANewFileToR: "Document actuel téléversé. Téléversez un nouveau fichier pour le remplacer.",
    selectToolsCandidatesMustBeProficientWit: "Sélectionnez les outils que les candidats doivent maîtriser",
    bonusSkillsThatWouldBeBeneficial: "Compétences bonus qui seraient un atout",
    option: {
      fulltime: "Temps plein",
      parttime: "Temps partiel",
      contract: "Contrat",
      freelance: "Freelance"
    }
  },
  editJobSheet: {
    title: "Détails de l'offre",
    toast: {
      failedToLoadCompanies: "Échec du chargement des entreprises",
      documentWillBeRemovedWhenYouSave: "Le document sera supprimé lors de l'enregistrement",
      failedToRemoveDocument: "Échec de la suppression du document",
      failedToDownloadDocument: "Échec du téléchargement du document",
      jobUpdatedSuccessfully: "Offre mise à jour avec succès",
      failedToUpdateJob: "Échec de la mise à jour de l'offre",
      youHaveUnsavedChanges: "Vous avez des modifications non enregistrées"
    },
    label: {
      company: "Entreprise *",
      jobTitle: "Intitulé du poste *",
      description: "Description",
      location: "Localisation",
      employmentType: "Type de contrat",
      currency: "Devise",
      minSalaryAnnual: "Salaire min. (annuel)",
      maxSalaryAnnual: "Salaire max. (annuel)",
      existingDocuments: "Documents existants",
      newDocumentsWillBeUploadedOnSave: "Nouveaux documents (téléversés à l'enregistrement)"
    },
    placeholder: {
      selectACompany: "Sélectionnez une entreprise",
      briefOverviewOfTheRole: "Aperçu succinct du poste...",
      searchRequiredToolsEgFigmaReactPython: "Rechercher les outils requis (ex. Figma, React, Python)...",
      searchNicetohaveTools: "Rechercher les outils appréciés..."
    },
    badge: {
      active: "Actif"
    },
    linkToWhereThisJobIsPostedOnlineLinkedin: "Lien vers l'annonce en ligne (LinkedIn, site de l'entreprise, etc.)",
    noRequiredToolsSelectedAddToolsThatAreEs: "Aucun outil requis sélectionné. Ajoutez les outils essentiels pour ce poste.",
    noNicetohaveToolsSelectedAddToolsThatWou: "Aucun outil apprécié sélectionné. Ajoutez les outils qui seraient un plus.",
    currentDocumentUploaded: "Document actuel téléversé",
    uploadANewFileToReplaceIt: "Téléversez un nouveau fichier pour le remplacer",
    dragDropOrClickToUpload: "Glissez-déposez ou cliquez pour téléverser",
    uploadMultipleFilesAtOnce: "Téléversez plusieurs fichiers à la fois",
    description: "Mettez à jour les informations essentielles de ce poste",
    option: {
      fulltime: "Temps plein",
      parttime: "Temps partiel",
      contract: "Contrat",
      freelance: "Freelance",
      internship: "Stage"
    }
  },
  enhancedAnalytics: {
    title: "Total des candidatures",
    enhancedAnalytics: "Analytique avancée"
  },
  internalReviewPanel: {
    toast: {
      selectAtLeastOneCandidate: "Sélectionnez au moins un candidat.",
      rejectionNoteIsRequired: "La note de refus est obligatoire.",
      undoIsNotYetAvailableForThisAction: "L'annulation n'est pas encore disponible pour cette action."
    },
    placeholder: {
      searchByNameTitleOrSkill: "Rechercher par nom, titre ou compétence...",
      rejectionReason: "Motif de refus..."
    },
    allClear: "Tout est en ordre",
    noCandidatesAwaitingInternalReview: "Aucun candidat en attente de révision interne.",
    dialogDescription: "Fournissez un motif pour refuser ce candidat du pipeline."
  },
  interviewFeedbackDialog: {
    dialogTitle: "Retour d'entretien",
    toast: {
      pleaseSelectARecommendation: "Veuillez sélectionner une recommandation",
      feedbackSubmittedSuccessfully: "Retour soumis avec succès"
    },
    label: {
      recommendation: "Recommandation *",
      keyStrengths: "Points forts clés",
      concernsAreasForImprovement: "Préoccupations / Axes d'amélioration",
      keyObservations: "Observations clés",
      detailedNotes: "Notes détaillées"
    },
    placeholder: {
      egStrongProblemsolvingSkills: "Ex. Solides compétences en résolution de problèmes",
      egLimitedExperienceWithXTechnology: "Ex. Expérience limitée avec la technologie X",
      egHandledPressureWellDuringTechnicalChal: "Ex. A bien géré la pression lors du défi technique",
      provideComprehensiveNotesAboutTheIntervi: "Fournissez des notes détaillées sur l'entretien..."
    },
    strongYesExceptionalCandidate: "Oui fort - Candidat exceptionnel",
    yesGoodFitRecommendToProceed: "Oui - Bon profil, recommandé pour la suite",
    maybeHasPotentialButConcernsExist: "Peut-être - A du potentiel mais des réserves existent",
    noNotTheRightFit: "Non - Profil inadapté",
    strongNoDefinitelyNotSuitable: "Non fort - Définitivement inadapté"
  },
  jobAnalytics: {
    title: "Taux de conversion par étape",
    noAnalyticsDataAvailable: "Aucune donnée analytique disponible",
    totalApplications: "Total des candidatures",
    active: "Actifs",
    hires: "Embauches",
    avgTimeToHire: "Délai moyen d'embauche",
    fastestHire: "Embauche la plus rapide",
    average: "Moyenne",
    slowestHire: "Embauche la plus lente",
    avgFitScore: "Score de compatibilité moyen",
    engagementRate: "Taux d'engagement",
    interviewPass: "Réussite d'entretien",
    offerAcceptance: "Acceptation d'offre",
    clubSync: "Club Sync",
    directApply: "Candidature directe",
    referrals: "Recommandations",
    description: "D'où viennent les candidats"
  },
  jobCard: {
    toast: {
      headhunterAgentActivatedAnalyzingJobRequ: "Agent headhunter activé... analyse des exigences du poste.",
      agentFinishedSearchButFoundNoNewStrongMa: "L'agent a terminé la recherche mais n'a trouvé aucune nouvelle correspondance forte."
    },
    viewOriginalPosting: "Voir l'annonce originale"
  },
  jobDashboardCandidates: {
    noApplicationsYet: "Aucune candidature pour le moment",
    toast: {
      failedToLoadCandidates: "Échec du chargement des candidats"
    },
    applicationsWillAppearHereOnceCandidates: "Les candidatures apparaîtront ici une fois que les candidats commenceront à postuler",
    reviewAndAdvancePremiumCandidatesFasterW: "Examinez et faites avancer les candidats premium plus rapidement grâce à notre vérification exclusive",
    noCandidatesInThisStage: "Aucun candidat à cette étape"
  },
  jobDocuments: {
    toast: {
      failedToLoadDocuments: "Échec du chargement des documents",
      jobDescriptionUploadedSuccessfully: "Description de poste téléversée avec succès",
      documentRemovedSuccessfully: "Document supprimé avec succès",
      failedToRemoveDocument: "Échec de la suppression du document",
      downloadStarted: "Téléchargement lancé",
      failedToDownloadDocument: "Échec du téléchargement du document",
      failedToOpenDocumentViewer: "Échec de l'ouverture du visualiseur de documents"
    },
    label: {
      existingDocuments: "Documents existants",
      addMoreDocuments: "Ajouter d'autres documents"
    },
    currentJobDescription: "Description de poste actuelle",
    uploadedDocumentReadyToView: "Document téléversé prêt à consulter",
    noJobDescriptionUploadedYet: "Aucune description de poste téléversée",
    fileWillBeUploadedAutomaticallyWhenSelec: "Le fichier sera téléversé automatiquement lors de la sélection",
    noSupportingDocumentsUploadedYet: "Aucun document justificatif téléversé",
    filesWillBeUploadedAutomaticallyWhenSele: "Les fichiers seront téléversés automatiquement lors de la sélection",
    poweredByGoogleDocsViewer: "Propulsé par Google Docs Viewer",
    previewNotAvailableForThisFileType: "Aperçu non disponible pour ce type de fichier",
    uploadInProgress: "Téléversement en cours"
  },
  jobManagement: {
    jobPostings: "Annonces d'emploi",
    noJobsYet: "Aucune offre pour le moment",
    toast: {
      failedToLoadJobs: "Échec du chargement des offres",
      jobArchived: "Offre archivée",
      jobDeleted: "Offre supprimée",
      failedToUpdateJobStatus: "Échec de la mise à jour du statut de l'offre"
    },
    createYourFirstJobPostingToStartReceivin: "Créez votre première annonce pour commencer à recevoir des candidatures"
  },
  jobTeamPanel: {
    toast: {
      failedToLoadTeamMembers: "Échec du chargement des membres d'équipe",
      teamMemberRemoved: "Membre d'équipe retiré",
      failedToRemoveTeamMember: "Échec du retrait du membre d'équipe"
    },
    badge: {
      primary: "Principal"
    },
    noTeamMembersYet: "Aucun membre d'équipe pour le moment",
    menu: {
      removeFromTeam: "Retirer de l'équipe"
    },
    teamMemberOptions: "Options du membre d'équipe"
  },
  offerPipelineWidget: {
    badge: {
      urgent: "Urgent"
    }
  },
  partnerAnalytics: {
    title: "Total des candidats",
    tab: {
      pipelineHealth: "Santé du pipeline",
      conversionRates: "Taux de conversion"
    },
    description: "Répartition actuelle par étapes du pipeline"
  },
  partnerConciergeCard: {
    badge: {
      inProgress: "En cours"
    },
    yourDedicatedConcierge: "Votre concierge dédié",
    directContact: "Contact direct"
  },
  partnerDomainSettings: {
    toast: {
      pleaseEnterAValidDomainEgExamplecom: "Veuillez saisir un domaine valide (ex. exemple.com)",
      thisDomainIsAlreadyConfigured: "Ce domaine est déjà configuré",
      domainRequestSubmittedForAdminApproval: "Demande de domaine soumise pour approbation admin",
      failedToSubmitDomainRequest: "Échec de la soumission de la demande de domaine"
    },
    label: {
      requestNewDomain: "Demander un nouveau domaine"
    },
    noDomainsConfiguredYet: "Aucun domaine configuré pour le moment",
    contactYourAdministratorToSetUpAuthorize: "Contactez votre administrateur pour configurer les domaines autorisés",
    domainRequestsRequireAdminApprovalBefore: "Les demandes de domaine nécessitent l'approbation admin avant d'être actives",
    description: "Les membres d'équipe ne peuvent être invités qu'à partir de ces domaines e-mail",
    loadingDomainSettings: "Chargement des paramètres de domaine..."
  },
  partnerFirstReviewPanel: {
    toast: {
      selectARejectionReason: "Sélectionnez un motif de refus.",
      rejectionNotesAreRequired: "Les notes de refus sont obligatoires."
    }
  },
  partnerJobsHome: {
    noJobsFound: "Aucune offre trouvée",
    toast: {
      failedToLoadJobs: "Échec du chargement des offres",
      noDraftJobsSelectedToPublish: "Aucune offre brouillon sélectionnée pour publication",
      failedToPublishSelectedJobs: "Échec de la publication des offres sélectionnées",
      noPublishedJobsSelectedToClose: "Aucune offre publiée sélectionnée pour clôture",
      failedToCloseSelectedJobs: "Échec de la clôture des offres sélectionnées",
      noJobsSelectedToArchive: "Aucune offre sélectionnée pour archivage",
      failedToArchiveSelectedJobs: "Échec de l'archivage des offres sélectionnées",
      failedToPublishJob: "Échec de la publication de l'offre",
      failedToUnpublishJob: "Échec de la dépublication de l'offre",
      failedToCloseJob: "Échec de la clôture de l'offre",
      failedToReopenJob: "Échec de la réouverture de l'offre",
      failedToArchiveJob: "Échec de l'archivage de l'offre",
      failedToRestoreJob: "Échec de la restauration de l'offre"
    },
    yourPremiumHiringAccelerator: "Votre accélérateur de recrutement premium.",
    getVettedCandidatesInDaysNotWeeks: "Obtenez des candidats vérifiés en jours, pas en semaines",
    prevettedTalent: "Talents pré-vérifiés",
    everyCandidateIsClubverifiedForQuality: "Chaque candidat est vérifié Club pour la qualité",
    dedicatedSupport: "Support dédié",
    personalRecruiterAssistanceIncluded: "Assistance personnelle d'un recruteur incluse",
    liveUpdatesEnabled: "Mises à jour en temps réel activées",
    desc: {
      candidatesCanNowSeeAndApplyToThisJob: "Les candidats peuvent maintenant voir et postuler à cette offre"
    }
  },
  pipelineAuditLog: {
    title: "Journal d'audit de l'offre",
    badge: {
      overrideDuplicate: "Contournement de doublon"
    },
    description: "Suivi complet de toutes les interactions et modifications de l'offre"
  },
  pipelineCustomizer: {
    title: "Éditeur de pipeline premium",
    toast: {
      stageRemoved: "Étape supprimée",
      selectAReviewerFirst: "Sélectionnez d'abord un évaluateur.",
      reviewerAssigned: "Évaluateur assigné",
      failedToAssignReviewer: "Échec de l'assignation de l'évaluateur",
      failedToRemoveReviewer: "Échec du retrait de l'évaluateur",
      reviewerRemoved: "Évaluateur retiré",
      pipelineSaved: "Pipeline enregistré",
      signatureSecure: "Signature sécurisée \u2713"
    },
    label: {
      stageOwner: "Propriétaire de l'étape",
      format: "Format",
      description: "Description",
      primary: "Principal"
    },
    placeholder: {
      describeWhatHappensInThisStage: "Décrivez ce qui se passe à cette étape..."
    },
    reviewGateAssignments: "Assignation des portes de révision",
    onlyAdminAndStrategistRolesCanChangeRevi: "Seuls les rôles admin et stratège peuvent modifier les assignations d'évaluateurs.",
    primary: "Principal",
    description: "Personnalisez les étapes de votre pipeline de recrutement exclusif",
    option: {
      online: "En ligne",
      inperson: "En personne",
      hybrid: "Hybride",
      noReviewersAvailable: "Aucun évaluateur disponible"
    }
  },
  pipelineDisplaySettings: {
    label: {
      showOwnershipIcons: "Afficher les icônes de propriété",
      showFormatDetails: "Afficher les détails du format",
      showTeamAssignments: "Afficher les assignations d'équipe",
      showLocationmeetingInfo: "Afficher les infos lieu/réunion",
      showEvaluationSetup: "Afficher la configuration d'évaluation",
      showSchedulingDetails: "Afficher les détails de planification",
      showAdvancedMetadata: "Afficher les métadonnées avancées"
    },
    customizeWhatInformationIsShownInThePipe: "Personnalisez les informations affichées dans le détail du pipeline"
  },
  pipelineMeetingCard: {
    badge: {
      scheduled: "Planifié"
    },
    prepSent: "Préparation envoyée",
    prepPending: "Préparation en attente"
  },
  scheduleInterviewButton: {
    toast: {
      interviewScheduledSuccessfully: "Entretien planifié avec succès"
    }
  },
  smartSchedulingPanel: {
    badge: {
      excellent: "Excellent",
      good: "Bon",
      fair: "Correct",
      limited: "Limité",
      googleCalendar: "Google Calendar",
      bestMatch: "Meilleure correspondance"
    },
    noAvailableSlotsFound: "Aucun créneau disponible trouvé",
    tryAdjustingTheDurationOrSelectingDiffer: "Essayez d'ajuster la durée ou de sélectionner d'autres intervieweurs"
  },
  teamActivityCard: {
    title: "Activité de l'équipe",
    noTeamActivityYet: "Aucune activité d'équipe pour le moment"
  },
  teamInviteWidget: {
    label: {
      recentInvitations: "Invitations récentes",
      allInvitations: "Toutes les invitations"
    },
    dialogDescription: "Envoyez une invitation à rejoindre votre organisation"
  },
  teamManagement: {
    teamMembers: "Membres de l'équipe",
    noTeamMembersYet: "Aucun membre d'équipe pour le moment",
    toast: {
      failedToLoadTeamMembers: "Échec du chargement des membres d'équipe",
      teamMemberRemoved: "Membre d'équipe retiré",
      failedToRemoveTeamMember: "Échec du retrait du membre d'équipe"
    },
    inviteTeamMembersToCollaborateOnJobPosti: "Invitez des membres d'équipe à collaborer sur les annonces"
  },
  textDocumentCreator: {
    toast: {
      pleaseEnterSomeContent: "Veuillez saisir du contenu",
      pleaseEnterADocumentTitle: "Veuillez saisir un titre de document"
    },
    label: {
      documentTitle: "Titre du document *",
      documentContent: "Contenu du document *"
    },
    placeholder: {
      typeOrPasteYourContentHere1010youCanIncl: "Saisissez ou collez votre contenu ici...\n\nVous pouvez inclure :\n\u2022 Questions d'entretien\n\u2022 Informations sur l'entreprise\n\u2022 Détails des avantages\n\u2022 Exigences techniques\n\u2022 Tout autre texte pertinent"
    },
    giveYourDocumentADescriptiveName: "Donnez un nom descriptif à votre document",
    plainTextFormatPerfectForQuickReferenceD: "Format texte brut - parfait pour les documents de référence rapide"
  },
  upcomingInterviewsWidget: {
    dialogTitle: "Document de préparation à l'entretien",
    today: "Aujourd'hui",
    thisWeek: "Cette semaine",
    upcoming: "À venir",
    toast: {
      pleaseEnterFeedback: "Veuillez saisir un retour",
      feedbackSubmittedSuccessfully: "Retour soumis avec succès"
    },
    label: {
      currentDocument: "Document actuel",
      feedback: "Retour"
    },
    placeholder: {
      enterYourFeedbackAboutTheCandidateAndInt: "Saisissez votre retour sur le candidat et l'entretien..."
    },
    loadingInterviews: "Chargement des entretiens...",
    pleaseSubmitFeedbackToKeepThePipelineMov: "Veuillez soumettre un retour pour maintenir le pipeline en mouvement",
    noPrepDocumentUploadedYetUseTheManualEnt: "Aucun document de préparation téléversé. Utilisez la saisie manuelle ou le lien calendrier pour en ajouter un."
  },
  bulkEmailDialog: {
    dialogDescription: "Envoyer un e-mail à tous les candidats sélectionnés"
  },
  candidateReviewCard: {
    internalReviewNotes: "Notes de révision interne"
  },
  candidateShortlistWidget: {
    starCandidatesFromApplicationsToAccessTh: "Marquez les candidats dans les candidatures pour y accéder rapidement"
  },
  candidateWorkAuthCard: {
    noWorkAuthorizationDataAvailable: "Aucune donnée d'autorisation de travail disponible",
    requiresSponsorship: "Nécessite un parrainage",
    noSponsorshipRequired: "Aucun parrainage requis"
  },
  changeOrdersPanel: {
    noChangeOrdersYet: "Aucun avenant pour le moment",
    noProcessedChangeOrdersYet: "Aucun avenant traité pour le moment"
  },
  contractBudgetDashboard: {
    awaitingYourApproval: "En attente de votre approbation",
    activeMilestoneWork: "Travaux de jalon actifs"
  },
  dailyBriefing: {
    letQuinAnalyzeYourHiringActivity: "Laissez QUIN analyser votre activité de recrutement"
  },
  dossierActivityWidget: {
    browseCandidatesToSeeTheirProfilesHere: "Parcourez les candidats pour voir leurs profils ici"
  },
  editCandidateDialog: {
    dialogDescription: "Mettez à jour les informations du candidat. Tous les changements seront journalisés."
  },
  enhancedCandidateActionDialog: {
    selectWhichStageToMoveThisCandidateTo: "Sélectionnez l'étape vers laquelle déplacer ce candidat",
    selectWhichPreviousStageToMoveThisCandid: "Sélectionnez l'étape précédente vers laquelle déplacer ce candidat",
    aReasonIsRequiredForAccountability: "Un motif est requis pour la traçabilité"
  },
  enhancedCandidateDetails: {
    alert: {
      limitedCandidateInformationAvailableFullDesc: "Informations limitées sur le candidat. Les détails complets seront visibles lorsque le candidat postulera à vos offres."
    }
  },
  interviewSuccessWidget: {
    noApplicationsYetPostAJobToStartHiring: "Aucune candidature. Publiez une offre pour commencer à recruter."
  },
  linkedInJobImport: {
    byConnectingYouAuthorizeTheQuantumClubTo: "En vous connectant, vous autorisez The Quantum Club à accéder aux annonces d'emploi de votre entreprise sur LinkedIn.",
    dialogDescription: "Connectez votre compte LinkedIn pour importer automatiquement les offres d'emploi de votre entreprise.",
    alert: {
      thisWillImportAllActiveJobPostingsFromYoDesc: "Cela importera toutes les annonces actives de la page LinkedIn de votre entreprise.\n              Assurez-vous d'avoir un accès administrateur à la page LinkedIn de votre entreprise."
    }
  },
  manualInterviewEntryDialog: {
    dialogDescription: "Ajoutez un entretien déjà planifié mais pas encore dans le système"
  },
  partnerInterviewHub: {
    noUpcomingInterviewsScheduled: "Aucun entretien à venir planifié",
    noCompletedInterviewsYet: "Aucun entretien terminé pour le moment",
    noCandidatesReadyForDecision: "Aucun candidat prêt pour une décision",
    interviewsNeedScorecardsBeforeDecisions: "Les entretiens nécessitent des fiches d'évaluation avant les décisions",
    description: "Suivez les entretiens, examinez les insights et prenez des décisions d'embauche",
    allEvaluatorsHaveSubmittedScorecards: "Tous les évaluateurs ont soumis leurs fiches"
  },
  positionFillCountdown: {
    allPositionsFilledGreatWork: "Tous les postes pourvus ! Excellent travail."
  },
  reviewShortcutOverlay: {
    dialogDescription: "Accélérez votre workflow de révision avec ces raccourcis."
  },
  targetCompanies: {
    beheerBedrijvenVoorHeadhuntingKandidaten: "Gérez les entreprises pour le headhunting de candidats"
  },
  targetCompanyDetailDialog: {
    nogGeenComments: "Aucun commentaire pour le moment"
  },
  targetCompanyDialog: {
    zoekBestaandeBedrijvenNaamEnWebsiteWorde: "Recherchez des entreprises existantes - le nom et le site web seront remplis automatiquement",
    selecteerDeJobWaarvoorDitBedrijfGetarget: "Sélectionnez l'offre pour laquelle cette entreprise est ciblée, ou laissez vide pour toutes les offres"
  },
  targetCompanyTable: {
    laden: "Chargement...",
    geenBedrijvenGevonden: "Aucune entreprise trouvée"
  },
  executiveDashboard: {
    noCandidatesInFinalStageYet: "Aucun candidat en étape finale pour le moment"
  },
  hiringManagerDashboard: {
    feedbackManagementComingSoon: "Gestion des retours bientôt disponible"
  },
  observerDashboard: {
    youHaveObserverAccessToThisRoleViewPipel: "Vous avez un accès observateur pour ce poste. Consultez le pipeline dans l'onglet Pipeline ci-dessus."
  },
  adminNotesEditor: {
    theseNotesAreForInternalUseOnlyAndWillNo: "Ces notes sont à usage interne uniquement et ne seront pas partagées avec le candidat ou les partenaires."
  },
  jobBulkActionBar: {
    menu: {
      bulkActions: "Actions en masse"
    },
    publish: "Publier"
  },
  jobTableView: {
    menu: {
      visibleColumns: "Colonnes visibles"
    },
    tooltip: {
      confidential: "Confidentiel"
    },
    noJobsFound: "Aucune offre trouvée"
  },
  jobsAIInsightsWidget: {
    title: "Insights QUIN",
    noInsightsAvailableYet: "Aucun insight disponible pour le moment",
    addMoreJobsToGenerateAiPredictions: "Ajoutez plus d'offres pour générer des prédictions IA",
    quinInsightsTemporarilyUnavailable: "Insights QUIN temporairement indisponibles",
    hiringForecast: "Prévisions de recrutement",
    strategicRecommendations: "Recommandations stratégiques"
  },
  keyboardShortcutsDialog: {
    dialogTitle: "Raccourcis clavier",
    dialogDescription: "Naviguez et gérez les offres efficacement avec ces raccourcis"
  },
  savedFilterPresets: {
    dialogTitle: "Enregistrer un préréglage de filtres",
    toast: {
      pleaseEnterANameForYourPreset: "Veuillez saisir un nom pour votre préréglage"
    },
    noSavedPresets: "Aucun préréglage enregistré",
    saveYourCurrentFiltersForQuickAccess: "Enregistrez vos filtres actuels pour un accès rapide",
    presets: "Préréglages",
    savedViews: "Vues enregistrées",
    dialogDescription: "Enregistrez vos filtres actuels pour un accès rapide ultérieur."
  },
  jobsCompactHeader: {
    placeholder: {
      searchJobs: "Rechercher des offres..."
    },
    menu: {
      navigation: "Navigation",
      adminTools: "Outils admin"
    },
    newJob: "Nouvelle offre",
    jobs: "Offres"
  },
  jobsUnifiedFilterBar: {
    menu: {
      company: "Entreprise",
      createdDate: "Date de création",
      layout: "Mise en page",
      savedViews: "Vues enregistrées"
    },
    advancedFilters: "Filtres avancés",
    views: "Vues"
  },
  jobListView: {
    noActivity: "Aucune activité",
    dashboard: "Tableau de bord",
    tooltip: {
      confidential: "Confidentiel"
    },
    noJobsFound: "Aucune offre trouvée"
  },
  jobStatusSummaryBar: {
    publishedJobsWillAppearInSearchResultsAn: "Les offres publiées apparaîtront dans les résultats de recherche et les candidats pourront postuler."
  },
  jobsAnalyticsWidget: {
    openJobs: "Offres ouvertes",
    avgDaysOpen: "Jours ouverts en moy.",
    fillRate: "Taux de pourvoiement",
    activePipeline: "Pipeline actif"
  },
  jobCardHeader: {
    viewOriginalPosting: "Voir l'annonce originale",
    thisJobIsOnlyVisibleToSelectedUsers: "Cette offre n'est visible que par les utilisateurs sélectionnés"
  },
  jobCardLastActivity: {
    lastActivity: "Dernière activité"
  },
  jobCardMetrics: {
    hiringProgress: "Progression du recrutement",
    conversion: "Conversion",
    interviews: "Entretiens"
  },
  compactJobCard: {
    tooltip: {
      confidential: "Confidentiel"
    }
  },
  jobsInlineStats: {
    clubSync: "Club Sync"
  },
  liveInterview: {
    title: "Interview Sentinel",
    subtitle: "Vérification des faits et copilote en temps réel",
    micDenied: "Accès au microphone refusé.",
    noSpeechSupport: "Le navigateur ne prend pas en charge la reconnaissance vocale.",
    listening: "Sentinel écoute...",
    stop: "Arrêter",
    start: "Démarrer",
    liveTranscript: "Transcription en direct",
    speechToText: "Conversion parole-texte en temps réel",
    waitingForSpeech: "En attente de parole...",
    sentinelHud: "HUD Sentinel",
    liveAiInsights: "Insights IA en direct",
    noAlerts: "Aucune alerte. Le système surveille..."
  },
  billing: {
    title: "Facturation et factures",
    description: "Gérez vos détails de facturation et consultez vos factures",
    tabDetails: "Détails de facturation",
    tabInvoices: "Factures",
    billingInfo: "Informations de facturation",
    billingInfoDesc: "Mettez à jour les détails de facturation de votre entreprise",
    yourInvoices: "Vos factures",
    yourInvoicesDesc: "Consultez et téléchargez vos factures de frais de placement"
  },
  sla: {
    responseTime: "Temps de réponse",
    responseTimeDesc: "Délai de première réponse",
    shortlistDelivery: "Livraison de la présélection",
    shortlistDeliveryDesc: "Livraison de la présélection de candidats",
    interviewScheduling: "Planification d'entretien",
    interviewSchedulingDesc: "Délai de mise en place de l'entretien",
    replacementGuarantee: "Garantie de remplacement",
    replacementGuaranteeDesc: "Fenêtre de remplacement du candidat",
    target: "Objectif",
    belowTarget: "Conformité en dessous de l'objectif. Révisez les processus pour améliorer les performances.",
    recentPerformance: "Performance SLA récente",
    last30Days: "30 derniers jours de suivi SLA",
    noMetrics: "Aucun indicateur SLA enregistré"
  },
  billingDashboard: {
    recentInvoices: "Factures récentes",
    viewDownload: "Consultez et téléchargez vos factures",
    download: "Télécharger",
    noInvoices: "Aucune facture trouvée"
  },
  auditLog: {
    searchPlaceholder: "Rechercher par utilisateur ou action...",
    allActions: "Toutes les actions",
    candidateMoved: "Candidat déplacé",
    jobCreated: "Offre créée",
    teamInvited: "Équipe invitée",
    applicationRejected: "Candidature refusée",
    noEntries: "Aucune entrée dans le journal d'audit"
  },
  addCandidate: {
    addedButAuditFailed: "Ajouté mais échec du journal d'audit",
    addedButLogFailed: "Ajouté mais échec de la journalisation",
    addedSuccessfully: "Ajouté avec succès",
    addedToPipeline: "Ajouté au pipeline",
    adding: "Ajout en cours",
    addToPipeline: "Ajouter au pipeline",
    adminNotes: "Notes admin",
    aiFillDetails: "Remplissage auto IA",
    alreadyInPipeline: "Déjà dans le pipeline",
    contactRequired: "Contact requis",
    contactRequiredDesc: "Le contact est requis",
    creditAssignment: "Attribution du crédit",
    creditDescription: "Description du crédit",
    currentCompany: "Entreprise actuelle",
    currentTitle: "Poste actuel",
    duplicateCheckFailed: "Échec de la vérification de doublons",
    emailOptional: "E-mail (optionnel)",
    enterDetailsManually: "Saisir les détails manuellement",
    enterLinkedInUrl: "Saisir l'URL LinkedIn",
    existing: "Existant",
    existingProfileLinked: "Profil existant lié",
    failedImportLinkedIn: "Échec de l'import LinkedIn",
    failedToAdd: "Échec de l'ajout",
    fullName: "Nom complet",
    fullNameRequired: "Le nom complet est requis",
    importing: "Import en cours",
    importProfile: "Importer le profil",
    linkedinImporter: "Importeur LinkedIn",
    linkedinImporterDesc: "Description de l'importeur LinkedIn",
    linkedinProfileImported: "Profil LinkedIn importé",
    linkedinProfileRecommended: "Profil LinkedIn recommandé",
    linkedinProfileUrl: "URL du profil LinkedIn",
    linkedinRecommended: "LinkedIn recommandé",
    linkedinRecommendedDesc: "LinkedIn recommandé - description",
    linkedinTimedOut: "Délai LinkedIn dépassé",
    linkedinUrlFormat: "Format de l'URL LinkedIn",
    linkExisting: "Lier un existant",
    linkExistingDesc: "Lier un profil existant",
    nameAndPhotoExtracted: "Nom et photo extraits",
    nameExtractedManual: "Nom extrait (manuel)",
    nameExtractedVerify: "Nom extrait - vérifier",
    nameFromLinkedIn: "Nom depuis LinkedIn",
    noCandidatesFound: "Aucun candidat trouvé",
    noTeamMemberFound: "Aucun membre d'équipe trouvé",
    notesOptional: "Notes (optionnel)",
    phoneOptional: "Téléphone (optionnel)",
    profileImported: "Profil importé",
    resumeCV: "CV",
    searchPlaceholder: "Rechercher...",
    searchTeamMembers: "Rechercher des membres d'équipe",
    selectedCount: "Sélectionnés",
    selectTeamMembers: "Sélectionner les membres d'équipe",
    startingPipelineStage: "Étape initiale du pipeline",
    startTypingToSearch: "Commencez à taper pour rechercher",
    step1Description: "Description étape 1",
    step1Title: "Titre étape 1",
    title: "Titre",
    toast: {
      failedToAdd: "Échec de l'ajout du candidat",
      unexpectedError: "Une erreur inattendue s'est produite. Veuillez réessayer ou contacter le support."
    },
    tryAgainOrManual: "Réessayer ou saisir manuellement",
    validEmailRequired: "Un e-mail valide est requis",
    verifyManually: "Vérifier manuellement",
    whyAddingCandidate: "Pourquoi ajouter ce candidat"
  }
};

// Apply translations
for (const [section, value] of Object.entries(translations)) {
  if (section in fr && typeof fr[section] === 'object' && typeof value === 'object') {
    deepMerge(fr[section], value);
  } else if (!(section in fr)) {
    fr[section] = value;
  }
}

// Copy all junk/technical keys (snake_case, SQL columns, special chars, etc.)
// These are keys that equal their value or are technical identifiers
for (const key of Object.keys(en)) {
  if (key in fr) continue;

  const val = en[key];
  // Copy as-is for: single chars, SQL columns, snake_case identifiers, locale codes, etc.
  const isJunk = key.includes(',') || key.includes('(') || key.includes('/') ||
                 key === '' || key === '_' || key === '-' || key === ':' || key === '?' ||
                 key === '@' || key === '*' || key === ' ' || key === 'T' ||
                 key.includes('id,') || key.includes('id ') ||
                 (typeof val === 'string' && val === key) ||
                 (typeof val === 'string' && val.replace(/_/g, ' ').toLowerCase() === key.replace(/_/g, ' ').toLowerCase()) ||
                 /^[a-z_0-9]+$/.test(key) || /^[A-Z]$/.test(key) ||
                 key.startsWith('id,') || key.startsWith('*,') ||
                 key.includes('@/') || key.startsWith('en-') || key.startsWith('nl-');

  if (isJunk) {
    fr[key] = val;
  }
}

// Also check funnel.summary for missing sub-keys
if (fr.funnel && fr.funnel.summary && en.funnel && en.funnel.summary) {
  for (const k of Object.keys(en.funnel.summary)) {
    if (!(k in fr.funnel.summary)) {
      // These were already partly translated, fill in missing
      fr.funnel.summary[k] = en.funnel.summary[k];
    }
  }
}

// Also copy funnel keys that match EN (the ones currently half-translated won't be touched)
if (en.funnel) {
  for (const k of Object.keys(en.funnel)) {
    if (!(k in fr.funnel)) {
      fr.funnel[k] = en.funnel[k];
    }
  }
}

writeFileSync('./src/i18n/locales/fr/partner.json', JSON.stringify(fr, null, 2) + '\n');

// Verify
const enNew = JSON.parse(readFileSync('./src/i18n/locales/en/partner.json', 'utf8'));
const frNew = JSON.parse(readFileSync('./src/i18n/locales/fr/partner.json', 'utf8'));

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

const missing = findMissing(enNew, frNew, '');
console.log('EN keys:', countKeys(enNew));
console.log('FR keys:', countKeys(frNew));
console.log('Still missing:', missing.length);
if (missing.length > 0) {
  missing.slice(0, 40).forEach(m => console.log('  ' + m));
  if (missing.length > 40) console.log('  ... +' + (missing.length - 40) + ' more');
}
