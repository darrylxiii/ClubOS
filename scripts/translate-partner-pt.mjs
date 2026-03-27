#!/usr/bin/env node
/**
 * Translates partner.json EN -> PT-PT (European Portuguese)
 * Handles the structured section (lines 1-1683) with proper translations
 * and preserves the technical snake_case section (lines 1684+) as-is.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const LOCALES = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');
const enData = JSON.parse(readFileSync(join(LOCALES, 'en', 'partner.json'), 'utf8'));

// Comprehensive PT-PT translations map for partner.json values
const T = new Map([
  // Top level
  ["Partner Portal", "Portal de Parceiros"],
  ["Manage your hiring and recruitment", "Gerir o seu recrutamento e contratacao"],

  // dashboard
  ["Dashboard", "Painel"],
  ["Welcome back", "Bem-vindo de volta"],
  ["Overview", "Visao Geral"],
  ["Recent Activity", "Atividade Recente"],
  ["Quick Actions", "Acoes Rapidas"],
  ["Your Stats", "As Suas Estatisticas"],

  // candidates
  ["Candidates", "Candidatos"],
  ["Active Candidates", "Candidatos Ativos"],
  ["Candidate Pipeline", "Pipeline de Candidatos"],
  ["Shortlisted", "Pre-selecionados"],
  ["Interviewed", "Entrevistados"],
  ["Offers Extended", "Propostas Enviadas"],
  ["Hired", "Contratados"],
  ["View All Candidates", "Ver Todos os Candidatos"],
  ["Add Candidate", "Adicionar Candidato"],
  ["Search Candidates", "Pesquisar Candidatos"],

  // jobs
  ["Jobs", "Vagas"],
  ["Active Jobs", "Vagas Ativas"],
  ["Draft Jobs", "Vagas em Rascunho"],
  ["Closed Jobs", "Vagas Encerradas"],
  ["Create Job", "Criar Vaga"],
  ["View All Jobs", "Ver Todas as Vagas"],
  ["Applications Received", "Candidaturas Recebidas"],
  ["Positions Filled", "Posicoes Preenchidas"],

  // analytics
  ["Analytics", "Analytics"],
  ["Hiring Metrics", "Metricas de Contratacao"],
  ["Time to Hire", "Tempo de Contratacao"],
  ["Cost per Hire", "Custo por Contratacao"],
  ["Offer Acceptance Rate", "Taxa de Aceitacao de Propostas"],
  ["Source Effectiveness", "Eficacia das Fontes"],
  ["Pipeline Health", "Saude do Pipeline"],

  // team
  ["Team", "Equipa"],
  ["Team Members", "Membros da Equipa"],
  ["Add Team Member", "Adicionar Membro da Equipa"],
  ["Roles & Permissions", "Funcoes e Permissoes"],
  ["Team Activity", "Atividade da Equipa"],
  ["Invite Member", "Convidar Membro"],

  // settings
  ["Settings", "Definicoes"],
  ["Company Profile", "Perfil da Empresa"],
  ["Branding", "Identidade Visual"],
  ["Integrations", "Integracoes"],
  ["Notifications", "Notificacoes"],
  ["Billing", "Faturacao"],
  ["API Access", "Acesso API"],

  // company
  ["Company Name", "Nome da Empresa"],
  ["Company Logo", "Logotipo da Empresa"],
  ["Description", "Descricao"],
  ["Industry", "Setor"],
  ["Company Size", "Dimensao da Empresa"],
  ["Headquarters", "Sede"],
  ["Website", "Website"],
  ["Company Culture", "Cultura Empresarial"],
  ["Benefits & Perks", "Beneficios e Regalias"],

  // pipeline
  ["Hiring Pipeline", "Pipeline de Contratacao"],
  ["Pipeline Stages", "Fases do Pipeline"],
  ["Customize Stages", "Personalizar Fases"],
  ["Stage Metrics", "Metricas por Fase"],
  ["Bottlenecks", "Estrangulamentos"],
  ["Pipeline Velocity", "Velocidade do Pipeline"],

  // interviews
  ["Interviews", "Entrevistas"],
  ["Scheduled Interviews", "Entrevistas Agendadas"],
  ["Pending Feedback", "Feedback Pendente"],
  ["Completed", "Concluido"],
  ["Schedule Interview", "Agendar Entrevista"],
  ["Submit Feedback", "Submeter Feedback"],
  ["Scorecards", "Fichas de Avaliacao"],

  // offers
  ["Offers", "Propostas"],
  ["Pending Offers", "Propostas Pendentes"],
  ["Accepted", "Aceite"],
  ["Declined", "Recusado"],
  ["Create Offer", "Criar Proposta"],
  ["Offer Templates", "Modelos de Proposta"],
  ["Approval Workflow", "Fluxo de Aprovacao"],

  // reports
  ["Reports", "Relatorios"],
  ["Generate Report", "Gerar Relatorio"],
  ["Scheduled Reports", "Relatorios Agendados"],
  ["Download", "Transferir"],
  ["Share Report", "Partilhar Relatorio"],
  ["Hiring Report", "Relatorio de Contratacao"],
  ["Diversity Report", "Relatorio de Diversidade"],
  ["Pipeline Report", "Relatorio de Pipeline"],
  ["Source Report", "Relatorio de Fontes"],

  // integrations
  ["ATS Integration", "Integracao ATS"],
  ["Calendar Sync", "Sincronizacao de Calendario"],
  ["Email Integration", "Integracao de Email"],
  ["LinkedIn", "LinkedIn"],
  ["Slack", "Slack"],
  ["Microsoft Teams", "Microsoft Teams"],

  // notifications
  ["New application received", "Nova candidatura recebida"],
  ["Interview scheduled", "Entrevista agendada"],
  ["Feedback pending", "Feedback pendente"],
  ["Offer accepted", "Proposta aceite"],
  ["Candidate update", "Atualizacao de candidato"],

  // actions
  ["View Details", "Ver Detalhes"],
  ["Edit", "Editar"],
  ["Delete", "Eliminar"],
  ["Archive", "Arquivar"],
  ["Export", "Exportar"],
  ["Share", "Partilhar"],

  // filters
  ["All", "Todos"],
  ["By Job", "Por Vaga"],
  ["By Stage", "Por Fase"],
  ["By Date", "Por Data"],
  ["By Source", "Por Fonte"],
  ["By Recruiter", "Por Recrutador"],

  // empty
  ["No candidates yet", "Sem candidatos ainda"],
  ["No jobs posted", "Nenhuma vaga publicada"],
  ["No interviews scheduled", "Nenhuma entrevista agendada"],
  ["No pending offers", "Nenhuma proposta pendente"],

  // status
  ["Active", "Ativo"],
  ["Inactive", "Inativo"],
  ["Pending", "Pendente"],
  ["Verified", "Verificado"],

  // referrals
  ["Referrals", "Referenciacoes"],
  ["My Referrals", "As Minhas Referenciacoes"],
  ["Referral Earnings", "Ganhos de Referenciacoes"],
  ["Pending Rewards", "Recompensas Pendentes"],
  ["Refer a Candidate", "Referenciar um Candidato"],
  ["Refer a Company", "Referenciar uma Empresa"],

  // support
  ["Support", "Suporte"],
  ["Help Center", "Centro de Ajuda"],
  ["Contact Support", "Contactar Suporte"],
  ["Documentation", "Documentacao"],
  ["FAQ", "FAQ"],

  // funnel
  ["About you", "Sobre si"],
  ["Your brief", "O seu briefing"],
  ["Review", "Revisao"],
  ["Partner Request", "Pedido de Parceria"],
  ["Begin your search", "Inicie a sua pesquisa"],
  ["And your name?", "E o seu nome?"],
  ["We'll follow up at this address", "Faremos o seguimento neste endereco"],
  ["So we know who to reach out to", "Para sabermos quem contactar"],
  ["Work email", "Email profissional"],
  ["Your data is never shared with third parties.", "Os seus dados nunca sao partilhados com terceiros."],
  ["Continue", "Continuar"],
  ["We couldn't verify this email address. You can try a different one or verify with a code.", "Nao foi possivel verificar este endereco de email. Pode tentar outro ou verificar com um codigo."],
  ["Use different email", "Usar email diferente"],
  ["Verify with code", "Verificar com codigo"],
  ["Enter the 6-digit code sent to", "Introduza o codigo de 6 digitos enviado para"],
  ["Didn't receive it?", "Nao recebeu?"],
  ["Resend code", "Reenviar codigo"],
  ["Your name", "O seu nome"],
  ["Tell us about the role", "Fale-nos sobre a funcao"],
  ["The more context you share, the better your shortlist.", "Quanto mais contexto partilhar, melhor sera a sua lista de candidatos."],
  ["What role are you looking to fill?", "Que funcao pretende preencher?"],
  ["e.g. VP of Engineering, CFO, Head of Product", "ex. VP de Engenharia, CFO, Diretor de Produto"],
  ["What's driving this hire?", "O que motiva esta contratacao?"],
  ["Growth \u2014 scaling the team", "Crescimento \u2014 escalar a equipa"],
  ["Replacement \u2014 someone left", "Substituicao \u2014 alguem saiu"],
  ["New function \u2014 building from scratch", "Nova funcao \u2014 construir de raiz"],
  ["Confidential \u2014 discreet search", "Confidencial \u2014 pesquisa discreta"],
  ["Seniority level", "Nivel de senioridade"],
  ["Director / VP", "Diretor / VP"],
  ["C-Suite", "C-Suite"],
  ["Head of / Senior Lead", "Head of / Senior Lead"],
  ["Specialist IC", "Especialista IC"],
  ["Anything else we should know?", "Mais alguma coisa que devamos saber?"],
  ["Team size, reporting line, challenges with previous hires, specific skills\u2026", "Dimensao da equipa, linha de reporte, desafios com contratacoes anteriores, competencias especificas\u2026"],
  ["optional", "opcional"],
  ["Where are you based?", "Onde esta localizado?"],
  ["Almost there", "Quase la"],
  ["Add any final details and review your brief.", "Adicione os ultimos detalhes e reveja o seu briefing."],
  ["Best number to reach you", "Melhor numero para o contactar"],
  ["Your strategist may call to discuss your brief. WhatsApp or phone.", "O seu estratega podera ligar para discutir o briefing. WhatsApp ou telefone."],
  ["Your details", "Os seus dados"],
  ["Name", "Nome"],
  ["Email", "Email"],
  ["Company", "Empresa"],
  ["Role", "Funcao"],
  ["Seniority", "Senioridade"],
  ["Driving this hire", "Motivo da contratacao"],
  ["Location", "Localizacao"],
  ["Phone", "Telefone"],
  ["Additional context", "Contexto adicional"],
  ["Restoring your progress\u2026", "A restaurar o seu progresso\u2026"],
  ["Back", "Voltar"],
  ["Get my shortlist", "Obter a minha lista de candidatos"],
  ["Welcome back!", "Bem-vindo de volta!"],
  ["Your progress has been restored.", "O seu progresso foi restaurado."],
  ["Resuming your progress\u2026", "A retomar o seu progresso\u2026"],
  ["Please enter a valid email address", "Por favor, introduza um endereco de email valido"],
  ["Verification code sent", "Codigo de verificacao enviado"],
  ["Could not send verification code", "Nao foi possivel enviar o codigo de verificacao"],
  ["Invalid verification code", "Codigo de verificacao invalido"],
  ["Verification failed", "Verificacao falhada"],
  ["Please complete all required fields", "Por favor, preencha todos os campos obrigatorios"],
  ["Please enter the role you're looking to fill", "Por favor, introduza a funcao que pretende preencher"],
  ["Request submitted!", "Pedido submetido!"],
  ["A strategist will be in touch soon.", "Um estratega entrara em contacto brevemente."],
  ["A strategist will be in touch within 24 hours.", "Um estratega entrara em contacto dentro de 24 horas."],
  ["Could not verify your request", "Nao foi possivel verificar o seu pedido"],
  ["Something went wrong", "Algo correu mal"],

  // funnelAnalytics
  ["Funnel Analytics", "Analytics do Funil"],
  ["Real-time partner request tracking and insights", "Acompanhamento em tempo real de pedidos de parceiros e informacoes"],
  ["Total Views", "Total de Visualizacoes"],
  ["Unique Sessions", "Sessoes Unicas"],
  ["Submissions", "Submissoes"],
  ["Conversion Rate", "Taxa de Conversao"],
  ["Drop-off Rate", "Taxa de Abandono"],
  ["Funnel Step Progression", "Progressao das Fases do Funil"],
  ["Request Status Distribution", "Distribuicao do Estado dos Pedidos"],
  ["Partner Requests", "Pedidos de Parceiros"],
  ["Filter by status", "Filtrar por estado"],
  ["All Statuses", "Todos os Estados"],
  ["In Review", "Em Revisao"],
  ["Approved", "Aprovado"],
  ["Rejected", "Rejeitado"],
  ["Date", "Data"],
  ["Contact", "Contacto"],
  ["Type", "Tipo"],
  ["Status", "Estado"],
  ["Source", "Fonte"],

  // partnerAnalyticsDashboard
  ["No company associated with your account", "Nenhuma empresa associada a sua conta"],
  ["Pipeline", "Pipeline"],
  ["Trends", "Tendencias"],
  ["Benchmarks", "Benchmarks"],

  // partnerFunnel
  ["Describe the role. We handle the rest.", "Descreva a funcao. Nos tratamos do resto."],
  ["No fees until you hire. No long-term contracts.", "Sem custos ate contratar. Sem contratos de longo prazo."],
  ["Quantum Club", "Quantum Club"],
  ["Partnership Applications Temporarily Paused", "Candidaturas de Parceria Temporariamente Pausadas"],
  ["Share your brief", "Partilhe o seu briefing"],
  ["Speak with a strategist", "Fale com um estratega"],
  ["Review your shortlist", "Reveja a sua lista de candidatos"],

  // partnerRejections
  ["Talent Pool Opportunity", "Oportunidade no Pool de Talentos"],
  ["Search candidates...", "Pesquisar candidatos..."],
  ["All Jobs", "Todas as Vagas"],
  ["All Reasons", "Todos os Motivos"],

  // partnerRelationships
  ["Candidate Relationships", "Relacoes com Candidatos"],
  ["Monitor and nurture your candidate connections", "Monitorize e cultive as suas relacoes com candidatos"],

  // partnerSetup
  ["Click the camera icon to upload", "Clique no icone da camara para carregar"],
  ["We can import your profile photo from LinkedIn automatically.", "Podemos importar a sua foto de perfil do LinkedIn automaticamente."],

  // partnerWelcome
  ["What's Next", "Proximos Passos"],
  ["Your Organization", "A Sua Organizacao"],
  ["Your Dedicated Strategist", "O Seu Estratega Dedicado"],
  ["Explore Open Roles", "Explorar Funcoes Abertas"],
  ["Browse exclusive opportunities curated for your network", "Explore oportunidades exclusivas selecionadas para a sua rede"],
  ["Submit Candidates", "Submeter Candidatos"],
  ["Introduce top talent through our streamlined process", "Apresente talentos de topo atraves do nosso processo simplificado"],
  ["Schedule Your Onboarding Call", "Agende a Sua Chamada de Onboarding"],

  // addCandidateDialog
  ["Duplicate Email Detected", "Email Duplicado Detetado"],
  ["A candidate with this email already exists. Please search for the existing candidate or use a different email.", "Ja existe um candidato com este email. Por favor, pesquise o candidato existente ou utilize um email diferente."],
  ["Database Error", "Erro na Base de Dados"],
  ["Unable to link candidate data. Please try again or contact support if the issue persists.", "Nao foi possivel associar os dados do candidato. Por favor, tente novamente ou contacte o suporte se o problema persistir."],
  ["Permission Denied", "Permissao Negada"],
  ["You don't have permission to add candidates. Please contact an administrator.", "Nao tem permissao para adicionar candidatos. Por favor, contacte um administrador."],
  ["Duplicate Candidate", "Candidato Duplicado"],
  ["This candidate already exists in the system. Please check existing applications.", "Este candidato ja existe no sistema. Por favor, verifique as candidaturas existentes."],
  ["John Doe", "Joao Silva"],
  ["Tech Corp", "Tech Corp"],
  ["Senior Developer", "Programador Senior"],
  ["Why this candidate? Source? Special considerations?", "Porque este candidato? Fonte? Consideracoes especiais?"],

  // addJobTeamMemberDialog
  ["Failed to load team members", "Falha ao carregar membros da equipa"],
  ["Failed to load TQC team members", "Falha ao carregar membros da equipa TQC"],
  ["Please select a team member", "Por favor, selecione um membro da equipa"],
  ["Please select a user", "Por favor, selecione um utilizador"],
  ["Please provide a reason for this assignment", "Por favor, forneca um motivo para esta atribuicao"],
  ["Team member added successfully", "Membro da equipa adicionado com sucesso"],
  ["Team Member", "Membro da Equipa"],
  ["Permissions", "Permissoes"],
  ["Select TQC Team Member", "Selecionar Membro da Equipa TQC"],
  ["Assignment Reason", "Motivo da Atribuicao"],
  ["Select a team member", "Selecionar um membro da equipa"],
  ["Search TQC team by name or email...", "Pesquisar equipa TQC por nome ou email..."],
  ["Why is this person being assigned to this job?", "Porque esta esta pessoa a ser atribuida a esta vaga?"],
  ["Admin", "Administrador"],
  ["Strategist", "Estratega"],
  ["No matching team members found", "Nenhum membro da equipa encontrado"],
  ["External users receive limited, time-boxed access with audit logging", "Utilizadores externos recebem acesso limitado e temporario com registo de auditoria"],
  ["Assign a team member or external user to this job with specific role and permissions.", "Atribua um membro da equipa ou utilizador externo a esta vaga com funcao e permissoes especificas."],
  ["Hiring Manager", "Gestor de Contratacao"],
  ["Founder/Executive Reviewer", "Fundador/Revisor Executivo"],
  ["Technical Interviewer", "Entrevistador Tecnico"],
  ["Behavioral Interviewer", "Entrevistador Comportamental"],
  ["Panel Member", "Membro do Painel"],
  ["Interview Coordinator", "Coordenador de Entrevistas"],
  ["Observer", "Observador"],

  // addStageDialog
  ["Add New Pipeline Stage", "Adicionar Nova Fase ao Pipeline"],
  ["Building/Room number, Reception instructions, Parking information, Accessibility notes...", "Numero do edificio/sala, Instrucoes de recepcao, Informacoes de estacionamento, Notas de acessibilidade..."],
  ["List materials candidates should prepare (portfolio, references, certificates, etc.)", "Liste materiais que os candidatos devem preparar (portfolio, referencias, certificados, etc.)"],
  ["Configure every detail for a luxury, tailored candidate experience", "Configure cada detalhe para uma experiencia de candidato premium e personalizada"],
  ["Candidates can choose between online or in-person. Configure both options above or provide flexible instructions.", "Os candidatos podem escolher entre online ou presencial. Configure ambas as opcoes acima ou forneca instrucoes flexiveis."],
  ["This helps evaluators provide consistent, structured feedback", "Isto ajuda os avaliadores a fornecer feedback consistente e estruturado"],
  ["Quick-start with pre-configured stage templates", "Inicio rapido com modelos de fase pre-configurados"],
  ["No team members available", "Nenhum membro da equipa disponivel"],
  ["Stage configuration saved and audit logged", "Configuracao da fase guardada e auditoria registada"],

  // addToJobDialog
  ["Add to Job Pipeline", "Adicionar ao Pipeline da Vaga"],
  ["Candidate added but interaction log failed", "Candidato adicionado mas registo de interacao falhou"],
  ["Candidate added but audit log failed", "Candidato adicionado mas registo de auditoria falhou"],
  ["Failed to add candidate to job", "Falha ao adicionar candidato a vaga"],
  ["Starting Stage", "Fase Inicial"],
  ["Notes (optional)", "Notas (opcional)"],
  ["Search jobs by title or company...", "Pesquisar vagas por titulo ou empresa..."],
  ["Why are you adding this candidate?", "Porque esta a adicionar este candidato?"],
  ["Already in pipeline", "Ja no pipeline"],
  ["No active jobs found.", "Nenhuma vaga ativa encontrada."],

  // adminBoardTools
  ["Global Analytics", "Analytics Globais"],
  ["Cross-company insights and platform-wide metrics", "Informacoes entre empresas e metricas da plataforma"],
  ["Talent Pool Access Granted", "Acesso ao Pool de Talentos Concedido"],
  ["Full access to 12,847 candidate profiles", "Acesso completo a 12.847 perfis de candidatos"],
  ["Company Management", "Gestao de Empresas"],
  ["Manage all partner companies and their access levels", "Gerir todas as empresas parceiras e os seus niveis de acesso"],
  ["Bulk Operations", "Operacoes em Massa"],
  ["Perform bulk actions across multiple jobs and candidates", "Realizar acoes em massa em varias vagas e candidatos"],
  ["Platform Settings", "Definicoes da Plataforma"],
  ["Configure global platform rules, AI models, and workflows", "Configurar regras globais da plataforma, modelos de IA e fluxos de trabalho"],
  ["AI Configuration", "Configuracao de IA"],
  ["Adjust matching algorithms, scoring weights, and ML models", "Ajustar algoritmos de correspondencia, pesos de pontuacao e modelos ML"],
  ["System Health: Optimal", "Saude do Sistema: Otimo"],
  ["All services running normally. 99.97% uptime", "Todos os servicos a funcionar normalmente. 99,97% de disponibilidade"],
  ["Global Data Export", "Exportacao de Dados Globais"],
  ["Exporting anonymized platform analytics...", "A exportar analytics anonimizados da plataforma..."],
  ["Access Control", "Controlo de Acesso"],
  ["Manage roles, permissions, and security policies", "Gerir funcoes, permissoes e politicas de seguranca"],
  ["QUANTUM CLUB ADMIN", "ADMIN QUANTUM CLUB"],
  ["Platform-wide management & analytics", "Gestao e analytics de toda a plataforma"],
  ["View & manage all partners", "Ver e gerir todos os parceiros"],
  ["Cross-job actions at scale", "Acoes entre vagas em escala"],
  ["AI Model Config", "Configuracao de Modelos IA"],
  ["Tune matching algorithms", "Ajustar algoritmos de correspondencia"],
  ["System Health", "Saude do Sistema"],
  ["Platform status & uptime", "Estado e disponibilidade da plataforma"],
  ["Roles & permissions", "Funcoes e permissoes"],
  ["Global configurations", "Configuracoes globais"],
  ["Export Global Data", "Exportar Dados Globais"],
  ["Platform-wide analytics", "Analytics de toda a plataforma"],
  ["Refresh All Metrics", "Atualizar Todas as Metricas"],
  ["Recalculate everything", "Recalcular tudo"],

  // adminJobTools
  ["Email Dump", "Exportacao de Emails"],
  ["Metrics updated successfully", "Metricas atualizadas com sucesso"],
  ["AI Matching Engine", "Motor de Correspondencia IA"],
  ["Analyzing global talent pool for perfect matches...", "A analisar o pool de talentos global para correspondencias perfeitas..."],
  ["Found 23 high-potential candidates", "Encontrados 23 candidatos de alto potencial"],
  ["Advanced AI scoring applied. Review in pipeline.", "Pontuacao avancada de IA aplicada. Reveja no pipeline."],
  ["Bulk Import", "Importacao em Massa"],
  ["Upload CSV or connect ATS to import candidates", "Carregar CSV ou ligar ATS para importar candidatos"],
  ["Pipeline Health: 94%", "Saude do Pipeline: 94%"],
  ["Excellent flow. Avg time-to-hire: 12 days", "Fluxo excelente. Tempo medio de contratacao: 12 dias"],
  ["Exporting pipeline data", "A exportar dados do pipeline"],
  ["Full analytics export with GDPR compliance", "Exportacao completa de analytics em conformidade com o RGPD"],
  ["Recalculating metrics...", "A recalcular metricas..."],
  ["Using latest AI models and scoring algorithms", "A utilizar os modelos de IA e algoritmos de pontuacao mais recentes"],
  ["ADMIN JOB TOOLS", "FERRAMENTAS ADMIN DE VAGAS"],
  ["Job-level operations", "Operacoes ao nivel da vaga"],

  // advancedJobFilters
  ["Advanced Filters", "Filtros Avancados"],
  ["Created Date Range", "Intervalo de Datas de Criacao"],
  ["From date", "Data de inicio"],
  ["To date", "Data de fim"],

  // applicantPipeline
  ["No active jobs", "Nenhuma vaga ativa"],
  ["Applicant Pipeline", "Pipeline de Candidatos"],
  ["No applications yet", "Sem candidaturas ainda"],
  ["Failed to load applicants", "Falha ao carregar candidatos"],
  ["Publish a job to start receiving applications", "Publique uma vaga para comecar a receber candidaturas"],
  ["Applications will appear here once candidates start applying", "As candidaturas aparecerao aqui assim que os candidatos comecem a candidatar-se"],
  ["No candidates in this stage", "Sem candidatos nesta fase"],

  // applicationsAnalytics
  ["Pipeline Distribution", "Distribuicao do Pipeline"],
  ["Avg. Time to Hire", "Tempo Medio de Contratacao"],
  ["Active Pipelines", "Pipelines Ativos"],
  ["Stalled Pipelines", "Pipelines Parados"],
  ["Excellent", "Excelente"],
  ["Needs improvement", "Necessita melhorias"],
  ["In progress", "Em curso"],
  ["Need attention", "Necessita atencao"],

  // applicationsFilters
  ["All statuses", "Todos os estados"],
  ["All jobs", "Todas as vagas"],
  ["All companies", "Todas as empresas"],
  ["All sources", "Todas as fontes"],
  ["All urgency", "Toda a urgencia"],
  ["All Sources", "Todas as Fontes"],
  ["All Companies", "Todas as Empresas"],
  ["Referral", "Referenciacao"],
  ["Direct", "Direto"],
  ["Agency", "Agencia"],
  ["Recent Activity", "Atividade Recente"],
  ["Withdrawn", "Retirado"],

  // applicationsTable
  ["No Activity", "Sem Atividade"],
  ["Urgent", "Urgente"],
  ["Pending Signup", "Registo Pendente"],
  ["No applications found matching your filters", "Nenhuma candidatura encontrada com os seus filtros"],

  // benchmarkComparison
  ["Updated today", "Atualizado hoje"],
  ["Complete more hiring cycles to unlock benchmark comparisons", "Complete mais ciclos de contratacao para desbloquear comparacoes de benchmark"],

  // calendarInterviewLinker
  ["TQC", "TQC"],
  ["Automatically detected interviews from your calendar", "Entrevistas detetadas automaticamente do seu calendario"],
  ["Select a calendar event to link as an interview", "Selecione um evento do calendario para associar como entrevista"],
  ["Interviews that have been confirmed and linked to this job", "Entrevistas que foram confirmadas e associadas a esta vaga"],
  ["Browse your calendar events or view automatically detected interviews", "Explore os seus eventos de calendario ou veja entrevistas detetadas automaticamente"],

  // candidateActionDialog
  ["No next stage available", "Nenhuma fase seguinte disponivel"],
  ["Please provide a rejection reason", "Por favor, forneca um motivo de rejeicao"],
  ["Failed to process action", "Falha ao processar acao"],
  ["Rejection Reason *", "Motivo de Rejeicao *"],
  ["Select a reason", "Selecionar um motivo"],
  ["Club Check - Advance Candidate", "Club Check - Avancar Candidato"],
  ["This candidate has passed Club vetting standards", "Este candidato passou os padroes de avaliacao do Club"],
  ["Not a fit", "Nao adequado"],
  ["Salary expectations", "Expectativas salariais"],
  ["Seniority mismatch", "Desadequacao de senioridade"],
  ["Skills gap", "Lacuna de competencias"],
  ["Cultural fit", "Adequacao cultural"],
  ["Other", "Outro"],
  ["Club Check completed successfully", "Club Check concluido com sucesso"],
  ["Feedback recorded and candidate notified", "Feedback registado e candidato notificado"],

  // candidateAnalytics
  ["Failed to load analytics", "Falha ao carregar analytics"],
  ["High Interest", "Alto Interesse"],
  ["Excellent Fit", "Excelente Adequacao"],
  ["Highly Engaged", "Muito Envolvido"],
  ["Profile Views", "Visualizacoes do Perfil"],
  ["Unique Viewers", "Visualizadores Unicos"],
  ["Engagement Score", "Pontuacao de Envolvimento"],
  ["Fit Score", "Pontuacao de Adequacao"],
  ["No profile views yet", "Sem visualizacoes de perfil ainda"],
  ["This candidate has received significant attention from the team", "Este candidato recebeu atencao significativa da equipa"],
  ["AI analysis shows strong alignment with role requirements", "A analise de IA mostra forte alinhamento com os requisitos da funcao"],
  ["Candidate shows strong engagement with the application process", "O candidato demonstra forte envolvimento com o processo de candidatura"],
  ["No insights available yet. Profile views and interactions will generate AI insights.", "Sem informacoes disponiveis ainda. Visualizacoes de perfil e interacoes gerarao informacoes de IA."],
  ["Team members who recently viewed this profile", "Membros da equipa que visualizaram recentemente este perfil"],

  // candidateDecisionDashboard
  ["Move to Offer Stage", "Mover para Fase de Proposta"],
  ["No application selected", "Nenhuma candidatura selecionada"],
  ["Candidate moved to Offer stage", "Candidato movido para fase de Proposta"],
  ["Failed to move candidate to offer stage", "Falha ao mover candidato para fase de proposta"],
  ["Failed to log verdict", "Falha ao registar veredicto"],
  ["Opening interview scheduler...", "A abrir agendador de entrevistas..."],
  ["Add notes about your decision...", "Adicione notas sobre a sua decisao..."],
  ["Overall", "Geral"],
  ["Years Exp", "Anos Exp"],
  ["Salary Range", "Intervalo Salarial"],
  ["Notice Period", "Periodo de Aviso Previo"],
  ["Preferred Location", "Localizacao Preferida"],
  ["This action will trigger the offer workflow and notify relevant stakeholders.", "Esta acao ira acionar o fluxo de proposta e notificar as partes interessadas."],

  // candidateDetailDialog
  ["Candidate Info", "Info do Candidato"],
  ["Failed to add comment", "Falha ao adicionar comentario"],
  ["Comment added", "Comentario adicionado"],
  ["Failed to submit scorecard", "Falha ao submeter ficha de avaliacao"],
  ["Scorecard submitted", "Ficha de avaliacao submetida"],
  ["Failed to move candidate", "Falha ao mover candidato"],
  ["Candidate moved", "Candidato movido"],
  ["Move to stage...", "Mover para fase..."],
  ["What are their strengths?", "Quais sao os seus pontos fortes?"],
  ["Any concerns?", "Alguma preocupacao?"],
  ["Additional notes...", "Notas adicionais..."],
  ["Scorecard", "Ficha de Avaliacao"],
  ["Comments", "Comentarios"],
  ["Activity", "Atividade"],
  ["Activity timeline coming soon", "Cronologia de atividade brevemente disponivel"],
  ["Pipeline Stage", "Fase do Pipeline"],
  ["Strong Yes", "Sim Forte"],
  ["Yes", "Sim"],
  ["Neutral", "Neutro"],
  ["Strong No", "Nao Forte"],

  // candidateDocumentsViewer
  ["Select Document Type", "Selecionar Tipo de Documento"],
  ["Failed to load documents", "Falha ao carregar documentos"],
  ["Failed to update document", "Falha ao atualizar documento"],
  ["Document deleted", "Documento eliminado"],
  ["Failed to delete document", "Falha ao eliminar documento"],
  ["Document Type", "Tipo de Documento"],
  ["Expiry Date (Optional)", "Data de Validade (Opcional)"],
  ["Loading documents", "A carregar documentos"],
  ["Release to upload", "Solte para carregar"],
  ["No documents yet", "Sem documentos ainda"],
  ["Upload the first document to get started", "Carregue o primeiro documento para comecar"],
  ["Documents will be automatically archived after this date for GDPR compliance", "Os documentos serao automaticamente arquivados apos esta data para conformidade com o RGPD"],
  ["Document preview", "Pre-visualizacao do documento"],

  // candidateInteractionLog
  ["Interaction Timeline", "Cronologia de Interacoes"],
  ["Please enter note content", "Por favor, introduza o conteudo da nota"],
  ["Note added successfully", "Nota adicionada com sucesso"],
  ["Failed to add note", "Falha ao adicionar nota"],
  ["Log New Interaction", "Registar Nova Interacao"],
  ["Enter interaction details...", "Introduza detalhes da interacao..."],
  ["No interactions logged yet", "Sem interacoes registadas ainda"],
  ["Loading candidate interactions...", "A carregar interacoes do candidato..."],
  ["Note", "Nota"],
  ["Phone Call", "Chamada Telefonica"],
  ["Message", "Mensagem"],
  ["Meeting", "Reuniao"],

  // candidateInternalRatingCard
  ["Rating History", "Historico de Avaliacoes"],
  ["Ratings updated successfully", "Avaliacoes atualizadas com sucesso"],
  ["Failed to update ratings", "Falha ao atualizar avaliacoes"],
  ["Add context for these ratings...", "Adicione contexto para estas avaliacoes..."],
  ["Overall team assessment of candidate quality", "Avaliacao geral da equipa sobre a qualidade do candidato"],
  ["Candidate responsiveness and interest level", "Capacidade de resposta e nivel de interesse do candidato"],
  ["Skills and experience alignment with opportunities", "Alinhamento de competencias e experiencia com oportunidades"],
  ["View all rating changes and team member assessments over time", "Ver todas as alteracoes de avaliacao e avaliacoes dos membros da equipa ao longo do tempo"],
  ["Team evaluation metrics (not visible to candidate)", "Metricas de avaliacao da equipa (nao visiveis para o candidato)"],

  // candidateInvitationDialog
  ["Invitation sent successfully!", "Convite enviado com sucesso!"],
  ["Failed to send invitation", "Falha ao enviar convite"],
  ["Email Address", "Endereco de Email"],
  ["Link to Specific Jobs (Optional)", "Associar a Vagas Especificas (Opcional)"],
  ["Personal Message", "Mensagem Pessoal"],
  ["Selected jobs will be mentioned in the invitation email", "As vagas selecionadas serao mencionadas no email de convite"],
  ["This message will be included in the invitation email", "Esta mensagem sera incluida no email de convite"],
  ["What happens next?", "O que acontece a seguir?"],

  // candidateLinkedJobs
  ["Failed to load linked jobs", "Falha ao carregar vagas associadas"],
  ["Applied", "Candidatou-se"],
  ["Last Updated", "Ultima Atualizacao"],
  ["Stage Progress", "Progresso da Fase"],
  ["No job applications found", "Nenhuma candidatura encontrada"],

  // candidateNotesManager
  ["Note content is required", "O conteudo da nota e obrigatorio"],
  ["You must be logged in to create notes", "Tem de ter sessao iniciada para criar notas"],
  ["Note saved", "Nota guardada"],
  ["Failed to delete note", "Falha ao eliminar nota"],
  ["Note deleted", "Nota eliminada"],
  ["Failed to update note", "Falha ao atualizar nota"],
  ["Note title...", "Titulo da nota..."],
  ["Add your notes here...", "Adicione as suas notas aqui..."],
  ["All Notes", "Todas as Notas"],
  ["TQC Internal", "TQC Interno"],
  ["Partner Shared", "Partilhado com Parceiro"],
  ["General", "Geral"],
  ["Loading notes...", "A carregar notas..."],
  ["Visible only to TQC team", "Visivel apenas para a equipa TQC"],
  ["Visible to everyone", "Visivel para todos"],

  // candidatePipelineStatus
  ["Failed to load pipeline status", "Falha ao carregar estado do pipeline"],
  ["Pipeline stage updated", "Fase do pipeline atualizada"],
  ["Failed to update stage", "Falha ao atualizar fase"],
  ["Current Stage", "Fase Atual"],
  ["Progress", "Progresso"],
  ["No active applications found", "Nenhuma candidatura ativa encontrada"],

  // candidateQuickActions
  ["Import from LinkedIn", "Importar do LinkedIn"],
  ["Please enter a LinkedIn URL", "Por favor, introduza um URL do LinkedIn"],
  ["LinkedIn profile imported successfully.", "Perfil LinkedIn importado com sucesso."],
  ["Failed to import LinkedIn profile", "Falha ao importar perfil LinkedIn"],
  ["Profile exported successfully", "Perfil exportado com sucesso"],
  ["Failed to export profile", "Falha ao exportar perfil"],
  ["LinkedIn Profile URL", "URL do Perfil LinkedIn"],
  ["Enter a LinkedIn profile URL to automatically enrich this candidate's profile", "Introduza um URL de perfil LinkedIn para enriquecer automaticamente o perfil deste candidato"],

  // companyAchievements
  ["Custom Achievements", "Conquistas Personalizadas"],
  ["Basic Information", "Informacoes Basicas"],
  ["Unlock Criteria", "Criterios de Desbloqueio"],
  ["No custom achievements yet", "Sem conquistas personalizadas ainda"],
  ["Achievement Name *", "Nome da Conquista *"],
  ["Description *", "Descricao *"],
  ["Icon", "Icone"],
  ["Interaction Type *", "Tipo de Interacao *"],
  ["Required Amount *", "Quantidade Necessaria *"],
  ["Time-Bound Challenge", "Desafio com Prazo"],
  ["Days to Complete *", "Dias para Completar *"],
  ["Describe what this achievement represents and how to earn it", "Descreva o que esta conquista representa e como obte-la"],
  ["Require completion within a specific timeframe", "Exigir conclusao dentro de um prazo especifico"],
  ["Create your first custom achievement to recognize and reward exceptional contributions from your team.", "Crie a sua primeira conquista personalizada para reconhecer e recompensar contribuicoes excecionais da sua equipa."],
  ["No platform achievements earned by team members yet", "Nenhuma conquista da plataforma obtida por membros da equipa ainda"],
  ["Standard achievements earned by your team members across the platform", "Conquistas padrao obtidas pelos membros da sua equipa em toda a plataforma"],
  ["Define criteria and rewards for exceptional team contributions", "Defina criterios e recompensas para contribuicoes excecionais da equipa"],
  ["Created", "Criado"],
  ["Total Awarded", "Total Atribuido"],
  ["Avg per Achievement", "Media por Conquista"],

  // companyAnalyticsChart
  ["Last 30 days", "Ultimos 30 dias"],
  ["Current followers", "Seguidores atuais"],
  ["Reactions & comments", "Reacoes e comentarios"],

  // companyBranding
  ["Brand Colors", "Cores da Marca"],
  ["Typography", "Tipografia"],
  ["Logos & Assets", "Logotipos e Recursos"],
  ["Brand Preview", "Pre-visualizacao da Marca"],
  ["Failed to load branding", "Falha ao carregar identidade visual"],
  ["Branding updated successfully", "Identidade visual atualizada com sucesso"],
  ["Failed to update branding", "Falha ao atualizar identidade visual"],
  ["Primary Color", "Cor Primaria"],
  ["Secondary Color", "Cor Secundaria"],
  ["Accent Color", "Cor de Destaque"],
  ["Heading Font", "Tipo de Letra do Titulo"],
  ["Body Font", "Tipo de Letra do Corpo"],
  ["Light Logo URL", "URL do Logotipo Claro"],
  ["Dark Logo URL", "URL do Logotipo Escuro"],
  ["Favicon URL", "URL do Favicon"],
  ["Social Preview Image", "Imagem de Pre-visualizacao Social"],
  ["Customize your company's visual identity", "Personalize a identidade visual da sua empresa"],

  // companyBrandingEditor
  ["Preview", "Pre-visualizacao"],
  ["Heading Example", "Exemplo de Titulo"],
  ["Failed to load branding settings", "Falha ao carregar definicoes de identidade visual"],
  ["Inter, Roboto, etc.", "Inter, Roboto, etc."],
  ["Body text example with your selected font and colors.", "Exemplo de texto de corpo com o tipo de letra e cores selecionados."],

  // companyFollowers
  ["Failed to load followers", "Falha ao carregar seguidores"],
  ["Notifications On", "Notificacoes Ativas"],
  ["No followers yet", "Sem seguidores ainda"],

  // companyPosts
  ["Company Posts", "Publicacoes da Empresa"],
  ["Failed to load posts", "Falha ao carregar publicacoes"],
  ["Post updated successfully", "Publicacao atualizada com sucesso"],
  ["Post created successfully", "Publicacao criada com sucesso"],
  ["Failed to save post", "Falha ao guardar publicacao"],
  ["Post deleted successfully", "Publicacao eliminada com sucesso"],
  ["Failed to delete post", "Falha ao eliminar publicacao"],
  ["Title", "Titulo"],
  ["Content", "Conteudo"],
  ["Post Type", "Tipo de Publicacao"],
  ["Tags (comma separated)", "Etiquetas (separadas por virgulas)"],
  ["Featured", "Destaque"],
  ["Private", "Privado"],
  ["Manage your company news and updates", "Gerir as noticias e atualizacoes da sua empresa"],
  ["No posts yet. Create your first post to get started.", "Sem publicacoes ainda. Crie a sua primeira publicacao para comecar."],
  ["Public", "Publico"],
  ["Share news, milestones, events, and updates with your audience", "Partilhe noticias, marcos, eventos e atualizacoes com o seu publico"],
  ["News", "Noticias"],
  ["Milestone", "Marco"],
  ["Event", "Evento"],
  ["Media", "Media"],

  // companyProfile
  ["Failed to load company profile", "Falha ao carregar perfil da empresa"],
  ["Company profile updated", "Perfil da empresa atualizado"],
  ["Failed to update company profile", "Falha ao atualizar perfil da empresa"],
  ["Tagline", "Tagline"],
  ["LinkedIn URL", "URL do LinkedIn"],
  ["Headquarters Location", "Localizacao da Sede"],
  ["Manage your company information and branding", "Gerir as informacoes e identidade visual da sua empresa"],

  // companyWall
  ["Company Wall", "Mural da Empresa"],
  ["Failed to load company posts", "Falha ao carregar publicacoes da empresa"],
  ["No posts yet. Be the first to share something!", "Sem publicacoes ainda. Seja o primeiro a partilhar algo!"],
  ["Latest news, updates, and announcements", "Ultimas noticias, atualizacoes e anuncios"],

  // contractDeadlineAlerts
  ["BREACHED", "VIOLADO"],
  ["Milestone deadline has passed", "O prazo do marco foi ultrapassado"],
  ["Milestone deadline approaching", "Prazo do marco a aproximar-se"],

  // createInterviewDialog
  ["Please fill in all required fields", "Por favor, preencha todos os campos obrigatorios"],
  ["Please select at least one interviewer", "Por favor, selecione pelo menos um entrevistador"],
  ["Interview scheduled, but failed to add to Google Calendar", "Entrevista agendada, mas falha ao adicionar ao Google Calendar"],
  ["Interview scheduled and added to your Google Calendar!", "Entrevista agendada e adicionada ao seu Google Calendar!"],
  ["Interview scheduled, but calendar sync failed", "Entrevista agendada, mas sincronizacao com calendario falhou"],
  ["Interview scheduled successfully", "Entrevista agendada com sucesso"],
  ["Add to Google Calendar", "Adicionar ao Google Calendar"],
  ["Interview Type *", "Tipo de Entrevista *"],
  ["Meeting Title *", "Titulo da Reuniao *"],
  ["Date *", "Data *"],
  ["Time *", "Hora *"],
  ["Duration (minutes)", "Duracao (minutos)"],
  ["Company - Candidate Name - Interview Stage", "Empresa - Nome do Candidato - Fase da Entrevista"],
  ["Candidate email", "Email do candidato"],
  ["Meeting description and agenda", "Descricao e agenda da reuniao"],
  ["Candidate", "Candidato"],
  ["Google Calendar Connected", "Google Calendar Ligado"],
  ["Interview will be synced to your calendar and attendees will receive invites", "A entrevista sera sincronizada com o seu calendario e os participantes receberao convites"],
  ["Google Calendar Not Connected", "Google Calendar Nao Ligado"],
  ["Connect your Google Calendar to automatically sync interviews and send calendar invites", "Ligue o seu Google Calendar para sincronizar entrevistas automaticamente e enviar convites de calendario"],
  ["Title and description auto-generated with company, candidate, and interviewer details", "Titulo e descricao gerados automaticamente com dados da empresa, candidato e entrevistador"],
  ["No team members assigned to this job", "Nenhum membro da equipa atribuido a esta vaga"],
  ["AI-Powered Auto-Fill", "Preenchimento Automatico com IA"],

  // createJobDialog
  ["Job created but failed to add some viewers", "Vaga criada mas falha ao adicionar alguns visualizadores"],
  ["Select a company first to choose from saved offices", "Selecione uma empresa primeiro para escolher entre escritorios guardados"],
  ["Compensation details are shared only with shortlisted candidates unless displayed on the listing.", "Os detalhes de compensacao sao partilhados apenas com candidatos pre-selecionados, exceto se apresentados no anuncio."],

  // createPostDialog
  ["Create Post", "Criar Publicacao"],
  ["You must be logged in to create a post", "Tem de ter sessao iniciada para criar uma publicacao"],
  ["Failed to create post", "Falha ao criar publicacao"],
  ["Audience", "Publico"],
  ["Public Post", "Publicacao Publica"],
  ["Publish Now", "Publicar Agora"],
  ["Exciting news to share... required", "Noticias empolgantes para partilhar... obrigatorio"],
  ["Share your story...", "Partilhe a sua historia..."],
  ["Share news, updates, or announcements with your followers", "Partilhe noticias, atualizacoes ou anuncios com os seus seguidores"],

  // duplicateCandidateDialog
  ["Candidate Already in Pipeline", "Candidato Ja no Pipeline"],
  ["Name Match", "Correspondencia de Nome"],
  ["LinkedIn Match", "Correspondencia LinkedIn"],

  // editJobDialog
  ["Edit Job", "Editar Vaga"],
  ["Failed to load companies", "Falha ao carregar empresas"],
  ["Job updated successfully", "Vaga atualizada com sucesso"],
  ["Failed to update job", "Falha ao atualizar vaga"],
  ["Company *", "Empresa *"],
  ["Job Title *", "Titulo da Vaga *"],
  ["Employment Type", "Tipo de Emprego"],
  ["Currency", "Moeda"],
  ["Min Salary", "Salario Minimo"],
  ["Max Salary", "Salario Maximo"],
  ["Add Supporting Documents", "Adicionar Documentos de Apoio"],
  ["Nice-to-Have Tools", "Ferramentas Desejaveis"],
  ["Select a company", "Selecionar uma empresa"],
  ["Search tools (e.g., Notion, Figma, Python)...", "Pesquisar ferramentas (ex., Notion, Figma, Python)..."],
  ["Search additional tools...", "Pesquisar ferramentas adicionais..."],
  ["Current document uploaded. Upload a new file to replace it.", "Documento atual carregado. Carregue um novo ficheiro para o substituir."],
  ["Select tools candidates must be proficient with", "Selecione ferramentas em que os candidatos devem ser proficientes"],
  ["Bonus skills that would be beneficial", "Competencias bonus que seriam beneficas"],
  ["Full-time", "Tempo inteiro"],
  ["Part-time", "Part-time"],
  ["Contract", "Contrato"],
  ["Freelance", "Freelance"],

  // editJobSheet
  ["Job Details", "Detalhes da Vaga"],
  ["Document will be removed when you save", "O documento sera removido quando guardar"],
  ["Failed to remove document", "Falha ao remover documento"],
  ["Failed to download document", "Falha ao transferir documento"],
  ["You have unsaved changes", "Tem alteracoes nao guardadas"],
  ["Min Salary (Annual)", "Salario Minimo (Anual)"],
  ["Max Salary (Annual)", "Salario Maximo (Anual)"],
  ["Existing Documents", "Documentos Existentes"],
  ["New Documents (will be uploaded on save)", "Novos Documentos (serao carregados ao guardar)"],
  ["Brief overview of the role...", "Breve descricao da funcao..."],
  ["Search required tools (e.g., Figma, React, Python)...", "Pesquisar ferramentas obrigatorias (ex., Figma, React, Python)..."],
  ["Search nice-to-have tools...", "Pesquisar ferramentas desejaveis..."],
  ["Link to where this job is posted online (LinkedIn, company website, etc.)", "Link para onde esta vaga esta publicada online (LinkedIn, website da empresa, etc.)"],
  ["No required tools selected. Add tools that are essential for this role.", "Nenhuma ferramenta obrigatoria selecionada. Adicione ferramentas essenciais para esta funcao."],
  ["No nice-to-have tools selected. Add tools that would be a plus.", "Nenhuma ferramenta desejavel selecionada. Adicione ferramentas que seriam uma mais-valia."],
  ["Current document uploaded", "Documento atual carregado"],
  ["Upload a new file to replace it", "Carregue um novo ficheiro para o substituir"],
  ["Drag & drop or click to upload", "Arraste e solte ou clique para carregar"],
  ["Upload multiple files at once", "Carregar multiplos ficheiros de uma vez"],
  ["Update the core information about this position", "Atualizar as informacoes principais sobre esta posicao"],
  ["Internship", "Estagio"],

  // enhancedAnalytics
  ["Total Applications", "Total de Candidaturas"],
  ["Enhanced Analytics", "Analytics Avancados"],

  // internalReviewPanel
  ["Select at least one candidate.", "Selecione pelo menos um candidato."],
  ["Rejection note is required.", "A nota de rejeicao e obrigatoria."],
  ["Undo is not yet available for this action.", "Anular nao esta ainda disponivel para esta acao."],
  ["Search by name, title, or skill...", "Pesquisar por nome, titulo ou competencia..."],
  ["Rejection reason...", "Motivo de rejeicao..."],
  ["All clear", "Tudo limpo"],
  ["No candidates awaiting internal review.", "Nenhum candidato a aguardar revisao interna."],
  ["Provide a reason for rejecting this candidate from the pipeline.", "Forneca um motivo para rejeitar este candidato do pipeline."],

  // interviewFeedbackDialog
  ["Interview Feedback", "Feedback de Entrevista"],
  ["Please select a recommendation", "Por favor, selecione uma recomendacao"],
  ["Feedback submitted successfully", "Feedback submetido com sucesso"],
  ["Recommendation *", "Recomendacao *"],
  ["Key Strengths", "Pontos Fortes"],
  ["Concerns / Areas for Improvement", "Preocupacoes / Areas de Melhoria"],
  ["Key Observations", "Observacoes Principais"],
  ["Detailed Notes", "Notas Detalhadas"],
  ["E.g., Strong problem-solving skills", "Ex., Fortes competencias de resolucao de problemas"],
  ["E.g., Limited experience with X technology", "Ex., Experiencia limitada com tecnologia X"],
  ["E.g., Handled pressure well during technical challenge", "Ex., Lidou bem com pressao durante o desafio tecnico"],
  ["Provide comprehensive notes about the interview...", "Forneca notas abrangentes sobre a entrevista..."],
  ["Strong Yes - Exceptional candidate", "Sim Forte - Candidato excecional"],
  ["Yes - Good fit, recommend to proceed", "Sim - Boa adequacao, recomendo prosseguir"],
  ["Maybe - Has potential but concerns exist", "Talvez - Tem potencial mas existem preocupacoes"],
  ["No - Not the right fit", "Nao - Nao e o adequado"],
  ["Strong No - Definitely not suitable", "Nao Forte - Definitivamente nao adequado"],

  // jobAnalytics
  ["Stage Conversion Rates", "Taxas de Conversao por Fase"],
  ["No analytics data available", "Sem dados de analytics disponiveis"],
  ["Hires", "Contratacoes"],
  ["Avg Time to Hire", "Tempo Medio de Contratacao"],
  ["Fastest Hire", "Contratacao Mais Rapida"],
  ["Average", "Media"],
  ["Slowest Hire", "Contratacao Mais Lenta"],
  ["Avg Fit Score", "Pontuacao Media de Adequacao"],
  ["Engagement Rate", "Taxa de Envolvimento"],
  ["Interview Pass", "Aprovacao em Entrevista"],
  ["Offer Acceptance", "Aceitacao de Proposta"],
  ["Club Sync", "Club Sync"],
  ["Direct Apply", "Candidatura Direta"],
  ["Where candidates are coming from", "De onde vem os candidatos"],

  // jobCard
  ["Headhunter Agent activated... analyzing job requirements.", "Agente Headhunter ativado... a analisar requisitos da vaga."],
  ["Agent finished search but found no new strong matches.", "O agente concluiu a pesquisa mas nao encontrou novas correspondencias fortes."],
  ["View original posting", "Ver publicacao original"],

  // jobDashboardCandidates
  ["Failed to load candidates", "Falha ao carregar candidatos"],
  ["Review and advance premium candidates faster with our exclusive vetting", "Reveja e avance candidatos premium mais rapidamente com a nossa avaliacao exclusiva"],

  // jobDocuments
  ["Job description uploaded successfully", "Descricao da vaga carregada com sucesso"],
  ["Document removed successfully", "Documento removido com sucesso"],
  ["Download started", "Transferencia iniciada"],
  ["Failed to open document viewer", "Falha ao abrir visualizador de documentos"],
  ["Add More Documents", "Adicionar Mais Documentos"],
  ["Current Job Description", "Descricao da Vaga Atual"],
  ["Uploaded document ready to view", "Documento carregado pronto para visualizar"],
  ["No job description uploaded yet", "Nenhuma descricao de vaga carregada ainda"],
  ["File will be uploaded automatically when selected", "O ficheiro sera carregado automaticamente quando selecionado"],
  ["No supporting documents uploaded yet", "Nenhum documento de apoio carregado ainda"],
  ["Files will be uploaded automatically when selected", "Os ficheiros serao carregados automaticamente quando selecionados"],
  ["Powered by Google Docs Viewer", "Disponibilizado pelo Google Docs Viewer"],
  ["Preview not available for this file type", "Pre-visualizacao nao disponivel para este tipo de ficheiro"],
  ["Upload in progress", "Carregamento em curso"],

  // jobManagement
  ["Job Postings", "Publicacoes de Vagas"],
  ["No jobs yet", "Sem vagas ainda"],
  ["Failed to load jobs", "Falha ao carregar vagas"],
  ["Job archived", "Vaga arquivada"],
  ["Job deleted", "Vaga eliminada"],
  ["Failed to update job status", "Falha ao atualizar estado da vaga"],
  ["Create your first job posting to start receiving applications", "Crie a sua primeira publicacao de vaga para comecar a receber candidaturas"],

  // jobTeamPanel
  ["Team member removed", "Membro da equipa removido"],
  ["Failed to remove team member", "Falha ao remover membro da equipa"],
  ["Primary", "Principal"],
  ["No team members yet", "Sem membros da equipa ainda"],
  ["Remove from team", "Remover da equipa"],
  ["Team Member Options", "Opcoes do Membro da Equipa"],

  // offerPipelineWidget - already covered

  // partnerAnalytics
  ["Total Candidates", "Total de Candidatos"],
  ["Conversion Rates", "Taxas de Conversao"],
  ["Current distribution across pipeline stages", "Distribuicao atual pelas fases do pipeline"],

  // partnerConciergeCard
  ["In Progress", "Em Curso"],
  ["Your Dedicated Concierge", "O Seu Concierge Dedicado"],
  ["Direct Contact", "Contacto Direto"],

  // partnerDomainSettings
  ["Please enter a valid domain (e.g., example.com)", "Por favor, introduza um dominio valido (ex., exemplo.com)"],
  ["This domain is already configured", "Este dominio ja esta configurado"],
  ["Domain request submitted for admin approval", "Pedido de dominio submetido para aprovacao do administrador"],
  ["Failed to submit domain request", "Falha ao submeter pedido de dominio"],
  ["Request New Domain", "Solicitar Novo Dominio"],
  ["No domains configured yet", "Nenhum dominio configurado ainda"],
  ["Contact your administrator to set up authorized domains", "Contacte o seu administrador para configurar dominios autorizados"],
  ["Domain requests require admin approval before they become active", "Os pedidos de dominio requerem aprovacao do administrador antes de ficarem ativos"],
  ["Team members can only be invited from these email domains", "Os membros da equipa so podem ser convidados a partir destes dominios de email"],
  ["Loading domain settings...", "A carregar definicoes de dominio..."],

  // partnerFirstReviewPanel
  ["Select a rejection reason.", "Selecione um motivo de rejeicao."],
  ["Rejection notes are required.", "As notas de rejeicao sao obrigatorias."],

  // partnerJobsHome
  ["No jobs found", "Nenhuma vaga encontrada"],
  ["No draft jobs selected to publish", "Nenhuma vaga em rascunho selecionada para publicar"],
  ["Failed to publish selected jobs", "Falha ao publicar vagas selecionadas"],
  ["No published jobs selected to close", "Nenhuma vaga publicada selecionada para encerrar"],
  ["Failed to close selected jobs", "Falha ao encerrar vagas selecionadas"],
  ["No jobs selected to archive", "Nenhuma vaga selecionada para arquivar"],
  ["Failed to archive selected jobs", "Falha ao arquivar vagas selecionadas"],
  ["Failed to publish job", "Falha ao publicar vaga"],
  ["Failed to unpublish job", "Falha ao despublicar vaga"],
  ["Failed to close job", "Falha ao encerrar vaga"],
  ["Failed to reopen job", "Falha ao reabrir vaga"],
  ["Failed to archive job", "Falha ao arquivar vaga"],
  ["Failed to restore job", "Falha ao restaurar vaga"],
  ["Your premium hiring accelerator.", "O seu acelerador premium de contratacao."],
  ["Get vetted candidates in days, not weeks", "Obtenha candidatos verificados em dias, nao semanas"],
  ["Pre-Vetted Talent", "Talentos Pre-Verificados"],
  ["Every candidate is Club-verified for quality", "Cada candidato e verificado pelo Club quanto a qualidade"],
  ["Dedicated Support", "Suporte Dedicado"],
  ["Personal recruiter assistance included", "Assistencia pessoal de recrutador incluida"],
  ["Live updates enabled", "Atualizacoes em tempo real ativadas"],
  ["Candidates can now see and apply to this job", "Os candidatos podem agora ver e candidatar-se a esta vaga"],

  // pipelineAuditLog
  ["Job Audit Log", "Registo de Auditoria da Vaga"],
  ["Override Duplicate", "Substituir Duplicado"],
  ["Comprehensive tracking of all job interactions and modifications", "Acompanhamento abrangente de todas as interacoes e modificacoes da vaga"],

  // pipelineCustomizer
  ["Premium Pipeline Editor", "Editor Premium de Pipeline"],
  ["Stage removed", "Fase removida"],
  ["Select a reviewer first.", "Selecione um revisor primeiro."],
  ["Reviewer assigned", "Revisor atribuido"],
  ["Failed to assign reviewer", "Falha ao atribuir revisor"],
  ["Failed to remove reviewer", "Falha ao remover revisor"],
  ["Reviewer removed", "Revisor removido"],
  ["Pipeline saved", "Pipeline guardado"],
  ["Stage Owner", "Responsavel da Fase"],
  ["Format", "Formato"],
  ["Describe what happens in this stage...", "Descreva o que acontece nesta fase..."],
  ["Review Gate Assignments", "Atribuicoes de Revisao"],
  ["Only admin and strategist roles can change reviewer assignments.", "Apenas funcoes de administrador e estratega podem alterar as atribuicoes de revisores."],
  ["Customize your exclusive hiring pipeline stages", "Personalize as suas fases exclusivas de pipeline de contratacao"],
  ["Online", "Online"],
  ["In-Person", "Presencial"],
  ["Hybrid", "Hibrido"],
  ["No reviewers available", "Nenhum revisor disponivel"],

  // pipelineDisplaySettings
  ["Show Ownership Icons", "Mostrar Icones de Propriedade"],
  ["Show Format Details", "Mostrar Detalhes de Formato"],
  ["Show Team Assignments", "Mostrar Atribuicoes da Equipa"],
  ["Show Location/Meeting Info", "Mostrar Info de Localizacao/Reuniao"],
  ["Show Evaluation Setup", "Mostrar Configuracao de Avaliacao"],
  ["Show Scheduling Details", "Mostrar Detalhes de Agendamento"],
  ["Show Advanced Metadata", "Mostrar Metadados Avancados"],
  ["Customize what information is shown in the pipeline breakdown", "Personalize que informacoes sao apresentadas na reparticao do pipeline"],

  // pipelineMeetingCard
  ["Scheduled", "Agendado"],
  ["Prep sent", "Preparacao enviada"],
  ["Prep pending", "Preparacao pendente"],

  // scheduleInterviewButton - already covered

  // smartSchedulingPanel
  ["Good", "Bom"],
  ["Fair", "Razoavel"],
  ["Limited", "Limitado"],
  ["Google Calendar", "Google Calendar"],
  ["Best Match", "Melhor Correspondencia"],
  ["No available slots found", "Nenhuma disponibilidade encontrada"],
  ["Try adjusting the duration or selecting different interviewers", "Tente ajustar a duracao ou selecionar entrevistadores diferentes"],

  // teamActivityCard
  ["No team activity yet", "Sem atividade da equipa ainda"],

  // teamInviteWidget
  ["Recent Invitations", "Convites Recentes"],
  ["All Invitations", "Todos os Convites"],
  ["Send an invitation to join your organization", "Envie um convite para aderir a sua organizacao"],

  // teamManagement
  ["Invite team members to collaborate on job postings", "Convide membros da equipa para colaborar em publicacoes de vagas"],

  // textDocumentCreator
  ["Please enter some content", "Por favor, introduza algum conteudo"],
  ["Please enter a document title", "Por favor, introduza um titulo de documento"],
  ["Document Title *", "Titulo do Documento *"],
  ["Document Content *", "Conteudo do Documento *"],
  ["Give your document a descriptive name", "De ao seu documento um nome descritivo"],
  ["Plain text format - perfect for quick reference documents", "Formato de texto simples - perfeito para documentos de referencia rapida"],

  // upcomingInterviewsWidget
  ["Interview Prep Document", "Documento de Preparacao para Entrevista"],
  ["Today", "Hoje"],
  ["This Week", "Esta Semana"],
  ["Upcoming", "Proximos"],
  ["Please enter feedback", "Por favor, introduza feedback"],
  ["Current Document", "Documento Atual"],
  ["Feedback", "Feedback"],
  ["Enter your feedback about the candidate and interview...", "Introduza o seu feedback sobre o candidato e entrevista..."],
  ["Loading interviews...", "A carregar entrevistas..."],
  ["Please submit feedback to keep the pipeline moving", "Por favor, submeta feedback para manter o pipeline em movimento"],
  ["No prep document uploaded yet. Use the manual entry or calendar linker to add one.", "Nenhum documento de preparacao carregado ainda. Utilize a entrada manual ou o associador de calendario para adicionar um."],

  // bulkEmailDialog
  ["Send an email to all selected candidates", "Enviar um email a todos os candidatos selecionados"],

  // candidateReviewCard
  ["Internal Review Notes", "Notas de Revisao Interna"],

  // candidateShortlistWidget
  ["Star candidates from applications to access them quickly", "Marque candidatos das candidaturas com estrela para os aceder rapidamente"],

  // candidateWorkAuthCard
  ["No work authorization data available", "Sem dados de autorizacao de trabalho disponiveis"],
  ["Requires sponsorship", "Requer patrocinio"],
  ["No sponsorship required", "Sem necessidade de patrocinio"],

  // changeOrdersPanel
  ["No change orders yet", "Sem ordens de alteracao ainda"],
  ["No processed change orders yet", "Sem ordens de alteracao processadas ainda"],

  // contractBudgetDashboard
  ["Awaiting your approval", "A aguardar a sua aprovacao"],
  ["Active milestone work", "Trabalho de marco ativo"],

  // dailyBriefing
  ["Let QUIN analyze your hiring activity", "Deixe o QUIN analisar a sua atividade de contratacao"],

  // dossierActivityWidget
  ["Browse candidates to see their profiles here", "Explore candidatos para ver os seus perfis aqui"],

  // editCandidateDialog
  ["Update candidate information. All changes will be logged.", "Atualizar informacoes do candidato. Todas as alteracoes serao registadas."],

  // enhancedCandidateActionDialog
  ["Select which stage to move this candidate to", "Selecione para que fase mover este candidato"],
  ["Select which previous stage to move this candidate to", "Selecione para que fase anterior mover este candidato"],
  ["A reason is required for accountability", "Um motivo e necessario para responsabilizacao"],

  // enhancedCandidateDetails
  ["Limited candidate information available. Full details visible when candidate applies to your jobs.", "Informacoes limitadas do candidato disponiveis. Detalhes completos visiveis quando o candidato se candidatar as suas vagas."],

  // interviewSuccessWidget
  ["No applications yet. Post a job to start hiring.", "Sem candidaturas ainda. Publique uma vaga para comecar a contratar."],

  // linkedInJobImport
  ["By connecting, you authorize The Quantum Club to access your company's \n              job postings on LinkedIn.", "Ao ligar, autoriza o The Quantum Club a aceder as publicacoes de vagas da sua empresa no LinkedIn."],
  ["Connect your LinkedIn account to automatically import your company's job postings.", "Ligue a sua conta LinkedIn para importar automaticamente as publicacoes de vagas da sua empresa."],
  ["This will import all active job postings from your LinkedIn company page. \n              Make sure you have admin access to your company's LinkedIn page.", "Isto ira importar todas as publicacoes de vagas ativas da pagina LinkedIn da sua empresa. Certifique-se de que tem acesso de administrador a pagina LinkedIn da sua empresa."],

  // manualInterviewEntryDialog
  ["Add an interview that's already scheduled but not yet in the system", "Adicionar uma entrevista que ja esta agendada mas ainda nao esta no sistema"],

  // partnerInterviewHub
  ["No upcoming interviews scheduled", "Nenhuma entrevista futura agendada"],
  ["No completed interviews yet", "Sem entrevistas concluidas ainda"],
  ["No candidates ready for decision", "Nenhum candidato pronto para decisao"],
  ["Interviews need scorecards before decisions", "As entrevistas necessitam fichas de avaliacao antes das decisoes"],
  ["Track interviews, review insights, and make hiring decisions", "Acompanhe entrevistas, reveja informacoes e tome decisoes de contratacao"],
  ["All evaluators have submitted scorecards", "Todos os avaliadores submeteram fichas de avaliacao"],

  // positionFillCountdown
  ["All positions filled! Great work.", "Todas as posicoes preenchidas! Excelente trabalho."],

  // reviewShortcutOverlay
  ["Speed up your review workflow with these shortcuts.", "Acelere o seu fluxo de revisao com estes atalhos."],

  // executiveDashboard
  ["No candidates in final stage yet", "Sem candidatos na fase final ainda"],

  // hiringManagerDashboard
  ["Feedback management coming soon", "Gestao de feedback brevemente disponivel"],

  // observerDashboard
  ["You have observer access to this role. View pipeline in the Pipeline tab above.", "Tem acesso de observador a esta funcao. Veja o pipeline no separador Pipeline acima."],

  // adminNotesEditor
  ["These notes are for internal use only and will not be shared with the candidate or partners.", "Estas notas sao apenas para uso interno e nao serao partilhadas com o candidato ou parceiros."],

  // jobBulkActionBar
  ["Bulk Actions", "Acoes em Massa"],
  ["Publish", "Publicar"],

  // jobTableView
  ["Visible Columns", "Colunas Visiveis"],
  ["Confidential", "Confidencial"],

  // jobsAIInsightsWidget
  ["QUIN Insights", "QUIN Insights"],
  ["No insights available yet", "Sem informacoes disponiveis ainda"],
  ["Add more jobs to generate AI predictions", "Adicione mais vagas para gerar previsoes de IA"],
  ["QUIN Insights temporarily unavailable", "QUIN Insights temporariamente indisponivel"],
  ["Hiring Forecast", "Previsao de Contratacao"],
  ["Strategic Recommendations", "Recomendacoes Estrategicas"],

  // keyboardShortcutsDialog
  ["Keyboard Shortcuts", "Atalhos de Teclado"],
  ["Navigate and manage jobs efficiently with these shortcuts", "Navegue e gira vagas eficientemente com estes atalhos"],

  // savedFilterPresets
  ["Save Filter Preset", "Guardar Predefinicao de Filtro"],
  ["Please enter a name for your preset", "Por favor, introduza um nome para a sua predefinicao"],
  ["No saved presets", "Sem predefinicoes guardadas"],
  ["Save your current filters for quick access", "Guarde os seus filtros atuais para acesso rapido"],
  ["Presets", "Predefinicoes"],
  ["Saved Views", "Vistas Guardadas"],
  ["Save your current filters for quick access later.", "Guarde os seus filtros atuais para acesso rapido mais tarde."],

  // jobsCompactHeader
  ["Search jobs...", "Pesquisar vagas..."],
  ["Navigation", "Navegacao"],
  ["Admin Tools", "Ferramentas de Administrador"],
  ["New Job", "Nova Vaga"],

  // jobsUnifiedFilterBar
  ["Created Date", "Data de Criacao"],
  ["Layout", "Disposicao"],
  ["Views", "Vistas"],

  // jobListView
  ["No activity", "Sem atividade"],

  // jobStatusSummaryBar
  ["Published jobs will appear in search results and candidates can apply to them.", "As vagas publicadas aparecerao nos resultados de pesquisa e os candidatos poderao candidatar-se."],

  // jobsAnalyticsWidget
  ["Open Jobs", "Vagas Abertas"],
  ["Avg Days Open", "Media de Dias Abertas"],
  ["Fill Rate", "Taxa de Preenchimento"],
  ["Active Pipeline", "Pipeline Ativo"],

  // jobCardHeader
  ["This job is only visible to selected users", "Esta vaga e visivel apenas para utilizadores selecionados"],

  // jobCardLastActivity
  ["Last Activity", "Ultima Atividade"],

  // jobCardMetrics
  ["Hiring Progress", "Progresso de Contratacao"],
  ["Conversion", "Conversao"],

  // liveInterview
  ["Interview Sentinel", "Sentinela de Entrevista"],
  ["Real-time Fact Checking & Copilot", "Verificacao de Factos em Tempo Real e Copiloto"],
  ["Microphone access denied.", "Acesso ao microfone negado."],
  ["Browser does not support Speech Recognition.", "O navegador nao suporta Reconhecimento de Voz."],
  ["Sentinel is listening...", "O Sentinela esta a ouvir..."],
  ["Stop", "Parar"],
  ["Start", "Iniciar"],
  ["Live Transcript", "Transcricao em Direto"],
  ["Real-time speech-to-text stream", "Fluxo de voz para texto em tempo real"],
  ["Waiting for speech...", "A aguardar fala..."],
  ["Sentinel HUD", "HUD do Sentinela"],
  ["Live AI Insights", "Informacoes de IA em Direto"],
  ["No alerts yet. System is monitoring...", "Sem alertas ainda. O sistema esta a monitorizar..."],

  // billing
  ["Billing & Invoices", "Faturacao e Faturas"],
  ["Manage your billing details and view invoices", "Gerir os seus dados de faturacao e ver faturas"],
  ["Billing Details", "Dados de Faturacao"],
  ["Invoices", "Faturas"],
  ["Billing Information", "Informacoes de Faturacao"],
  ["Update your company billing details for invoicing", "Atualize os dados de faturacao da sua empresa para faturacao"],
  ["Your Invoices", "As Suas Faturas"],
  ["View and download your placement fee invoices", "Ver e transferir as suas faturas de taxas de colocacao"],

  // sla
  ["Response Time", "Tempo de Resposta"],
  ["Time to first response", "Tempo para a primeira resposta"],
  ["Shortlist Delivery", "Entrega da Lista de Candidatos"],
  ["Candidate shortlist delivery", "Entrega da lista de candidatos"],
  ["Interview Scheduling", "Agendamento de Entrevistas"],
  ["Interview setup time", "Tempo de preparacao da entrevista"],
  ["Replacement Guarantee", "Garantia de Substituicao"],
  ["Candidate replacement window", "Periodo de substituicao do candidato"],
  ["Target", "Objetivo"],
  ["Below target compliance. Review processes to improve performance.", "Conformidade abaixo do objetivo. Reveja os processos para melhorar o desempenho."],
  ["Recent SLA Performance", "Desempenho Recente de SLA"],
  ["Last 30 days of SLA tracking", "Ultimos 30 dias de acompanhamento de SLA"],
  ["No SLA metrics recorded yet", "Nenhuma metrica de SLA registada ainda"],

  // billingDashboard
  ["Recent Invoices", "Faturas Recentes"],
  ["View and download your invoices", "Ver e transferir as suas faturas"],
  ["No invoices found", "Nenhuma fatura encontrada"],

  // auditLog
  ["Search by user or action...", "Pesquisar por utilizador ou acao..."],
  ["All Actions", "Todas as Acoes"],
  ["Candidate Moved", "Candidato Movido"],
  ["Job Created", "Vaga Criada"],
  ["Team Invited", "Equipa Convidada"],
  ["Application Rejected", "Candidatura Rejeitada"],
  ["No audit log entries found", "Nenhuma entrada de registo de auditoria encontrada"],

  // addCandidate section
  ["Added But Audit Failed", "Adicionado Mas Auditoria Falhou"],
  ["Added But Log Failed", "Adicionado Mas Registo Falhou"],
  ["Added Successfully", "Adicionado com Sucesso"],
  ["Added To Pipeline", "Adicionado ao Pipeline"],
  ["Adding", "A Adicionar"],
  ["Add To Pipeline", "Adicionar ao Pipeline"],
  ["Admin Notes", "Notas de Administrador"],
  ["Ai Fill Details", "IA Preencher Detalhes"],
  ["Already In Pipeline", "Ja no Pipeline"],
  ["Contact Required", "Contacto Obrigatorio"],
  ["Contact Required Desc", "Descricao de Contacto Obrigatorio"],
  ["Credit Assignment", "Atribuicao de Credito"],
  ["Credit Description", "Descricao de Credito"],
  ["Current Company", "Empresa Atual"],
  ["Current Title", "Cargo Atual"],
  ["Duplicate Check Failed", "Verificacao de Duplicados Falhou"],
  ["Email Optional", "Email Opcional"],
  ["Enter Details Manually", "Introduzir Detalhes Manualmente"],
  ["Enter Linked In Url", "Introduzir URL do LinkedIn"],
  ["Existing", "Existente"],
  ["Existing Profile Linked", "Perfil Existente Associado"],
  ["Failed Import Linked In", "Falha na Importacao do LinkedIn"],
  ["Failed To Add", "Falha ao Adicionar"],
  ["Full Name", "Nome Completo"],
  ["Full Name Required", "Nome Completo Obrigatorio"],
  ["Importing", "A Importar"],
  ["Import Profile", "Importar Perfil"],
  ["Linkedin Importer", "Importador LinkedIn"],
  ["Linkedin Importer Desc", "Descricao do Importador LinkedIn"],
  ["Linkedin Profile Imported", "Perfil LinkedIn Importado"],
  ["Linkedin Profile Recommended", "Perfil LinkedIn Recomendado"],
  ["Linkedin Profile Url", "URL do Perfil LinkedIn"],
  ["Linkedin Recommended", "LinkedIn Recomendado"],
  ["Linkedin Recommended Desc", "Descricao do LinkedIn Recomendado"],
  ["Linkedin Timed Out", "LinkedIn Expirou"],
  ["Linkedin Url Format", "Formato do URL LinkedIn"],
  ["Link Existing", "Associar Existente"],
  ["Link Existing Desc", "Descricao de Associar Existente"],
  ["Name And Photo Extracted", "Nome e Foto Extraidos"],
  ["Name Extracted Manual", "Nome Extraido Manualmente"],
  ["Name Extracted Verify", "Nome Extraido Verificar"],
  ["Name From Linked In", "Nome do LinkedIn"],
  ["No Candidates Found", "Nenhum Candidato Encontrado"],
  ["No Team Member Found", "Nenhum Membro da Equipa Encontrado"],
  ["Notes Optional", "Notas Opcional"],
  ["Phone Optional", "Telefone Opcional"],
  ["Profile Imported", "Perfil Importado"],
  ["Resume C V", "Curriculo / CV"],
  ["Search Placeholder", "Pesquisar"],
  ["Search Team Members", "Pesquisar Membros da Equipa"],
  ["Selected Count", "Contagem Selecionada"],
  ["Select Team Members", "Selecionar Membros da Equipa"],
  ["Starting Pipeline Stage", "Fase Inicial do Pipeline"],
  ["Start Typing To Search", "Comece a Escrever para Pesquisar"],
  ["Step1 Description", "Descricao do Passo 1"],
  ["Step1 Title", "Titulo do Passo 1"],
  ["Failed to Add Candidate", "Falha ao Adicionar Candidato"],
  ["An unexpected error occurred. Please try again or contact support.", "Ocorreu um erro inesperado. Por favor, tente novamente ou contacte o suporte."],
  ["Try Again Or Manual", "Tentar Novamente ou Manual"],
  ["Valid Email Required", "Email Valido Obrigatorio"],
  ["Verify Manually", "Verificar Manualmente"],
  ["Why Adding Candidate", "Motivo para Adicionar Candidato"],
  ["Added", "Adicionado"],

  // Misc partner keys
  ["Signature Secure \u2713", "Assinatura Segura \u2713"],
  ["Type or paste your content here...&#10;&#10;You can include:&#10;\u2022 Interview questions&#10;\u2022 Company information&#10;\u2022 Benefits details&#10;\u2022 Technical requirements&#10;\u2022 Any other relevant text", "Escreva ou cole o seu conteudo aqui...&#10;&#10;Pode incluir:&#10;\u2022 Perguntas de entrevista&#10;\u2022 Informacoes da empresa&#10;\u2022 Detalhes de beneficios&#10;\u2022 Requisitos tecnicos&#10;\u2022 Qualquer outro texto relevante"],
]);

// Additional context-specific mappings
const CONTEXT_T = new Map([
  // These are for values that appear in multiple places but need different translations based on context
]);

function translateValue(val) {
  if (typeof val !== 'string') return val;
  if (!val.trim()) return val;

  // Check exact match
  if (T.has(val)) return T.get(val);

  // Handle {{count}} interpolation patterns
  const interpolated = val.replace(/\{\{[^}]+\}\}/g, '___INTERP___');
  if (T.has(interpolated)) {
    let result = T.get(interpolated);
    const matches = val.match(/\{\{[^}]+\}\}/g) || [];
    let i = 0;
    result = result.replace(/___INTERP___/g, () => matches[i++] || '');
    return result;
  }

  // Return original - it's either technical or already handled
  return val;
}

function translateObj(obj) {
  if (typeof obj === 'string') return translateValue(obj);
  if (Array.isArray(obj)) return obj.map(translateObj);
  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = translateObj(v);
    }
    return result;
  }
  return obj;
}

const ptData = translateObj(enData);
const ptPath = join(LOCALES, 'pt', 'partner.json');
writeFileSync(ptPath, JSON.stringify(ptData, null, 2) + '\n', 'utf8');

// Count translated vs untranslated
let total = 0, translated = 0;
function countStrings(en, pt) {
  if (typeof en === 'string' && typeof pt === 'string') {
    total++;
    if (en !== pt) translated++;
  } else if (typeof en === 'object' && en !== null && typeof pt === 'object' && pt !== null) {
    for (const k of Object.keys(en)) {
      if (pt[k] !== undefined) countStrings(en[k], pt[k]);
    }
  }
}
countStrings(enData, ptData);
console.log(`Partner PT: ${translated}/${total} strings translated (${(translated/total*100).toFixed(1)}%)`);
