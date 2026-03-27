#!/usr/bin/env node
/**
 * European Portuguese (PT-PT) translation helper.
 * Reads EN JSON, applies systematic translations, outputs PT JSON.
 * This is a bulk-translation tool for large files (admin, partner, meetings, common).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const LOCALES = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');

// Common English -> PT-PT word/phrase mappings
const TRANSLATIONS = new Map([
  // Actions
  ['Save', 'Guardar'],
  ['Cancel', 'Cancelar'],
  ['Delete', 'Eliminar'],
  ['Edit', 'Editar'],
  ['Apply', 'Aplicar'],
  ['Submit', 'Submeter'],
  ['Continue', 'Continuar'],
  ['Back', 'Voltar'],
  ['Next', 'Seguinte'],
  ['Previous', 'Anterior'],
  ['Loading...', 'A carregar...'],
  ['Processing...', 'A processar...'],
  ['Search', 'Pesquisar'],
  ['Filter', 'Filtro'],
  ['Download', 'Transferir'],
  ['Upload', 'Carregar'],
  ['View', 'Ver'],
  ['Close', 'Fechar'],
  ['Confirm', 'Confirmar'],
  ['Resend', 'Reenviar'],
  ['Verify', 'Verificar'],
  ['Save Changes', 'Guardar Alteracoes'],
  ['Start', 'Iniciar'],
  ['Join', 'Aderir'],
  ['Join Now', 'Aderir Agora'],
  ['Refresh', 'Atualizar'],
  ['Try Again', 'Tentar Novamente'],
  ['Retry', 'Tentar Novamente'],
  ['Retrying...', 'A tentar novamente...'],
  ['Reload Page', 'Recarregar Pagina'],
  ['Archive', 'Arquivar'],
  ['Restore', 'Restaurar'],
  ['Create', 'Criar'],
  ['Update', 'Atualizar'],
  ['Remove', 'Remover'],
  ['Add', 'Adicionar'],
  ['Select', 'Selecionar'],
  ['Enable', 'Ativar'],
  ['Disable', 'Desativar'],
  ['Configure', 'Configurar'],
  ['Manage', 'Gerir'],
  ['Export', 'Exportar'],
  ['Import', 'Importar'],
  ['Copy', 'Copiar'],
  ['Paste', 'Colar'],
  ['Share', 'Partilhar'],
  ['Send', 'Enviar'],
  ['Receive', 'Receber'],
  ['Accept', 'Aceitar'],
  ['Reject', 'Rejeitar'],
  ['Decline', 'Recusar'],
  ['Approve', 'Aprovar'],
  ['Deny', 'Negar'],
  ['Reset', 'Repor'],
  ['Clear', 'Limpar'],
  ['Connect', 'Ligar'],
  ['Disconnect', 'Desligar'],

  // Status
  ['Active', 'Ativo'],
  ['Inactive', 'Inativo'],
  ['Pending', 'Pendente'],
  ['Approved', 'Aprovado'],
  ['Declined', 'Recusado'],
  ['Rejected', 'Rejeitado'],
  ['Completed', 'Concluido'],
  ['In Progress', 'Em Curso'],
  ['Draft', 'Rascunho'],
  ['Published', 'Publicado'],
  ['Archived', 'Arquivado'],
  ['Expired', 'Expirado'],
  ['Failed', 'Falhado'],
  ['Success', 'Sucesso'],
  ['Error', 'Erro'],
  ['Warning', 'Aviso'],
  ['Info', 'Informacao'],
  ['Enabled', 'Ativado'],
  ['Disabled', 'Desativado'],
  ['Connected', 'Ligado'],
  ['Disconnected', 'Desligado'],
  ['Online', 'Online'],
  ['Offline', 'Offline'],

  // Common nouns
  ['Settings', 'Definicoes'],
  ['Profile', 'Perfil'],
  ['Account', 'Conta'],
  ['Dashboard', 'Dashboard'],
  ['Password', 'Palavra-passe'],
  ['Email', 'Email'],
  ['Phone', 'Telefone'],
  ['Name', 'Nome'],
  ['Description', 'Descricao'],
  ['Title', 'Titulo'],
  ['Date', 'Data'],
  ['Time', 'Hora'],
  ['Duration', 'Duracao'],
  ['Location', 'Localizacao'],
  ['Address', 'Endereco'],
  ['Company', 'Empresa'],
  ['Team', 'Equipa'],
  ['Member', 'Membro'],
  ['Members', 'Membros'],
  ['User', 'Utilizador'],
  ['Users', 'Utilizadores'],
  ['Role', 'Funcao'],
  ['Permission', 'Permissao'],
  ['Permissions', 'Permissoes'],
  ['Notification', 'Notificacao'],
  ['Notifications', 'Notificacoes'],
  ['Message', 'Mensagem'],
  ['Messages', 'Mensagens'],
  ['Document', 'Documento'],
  ['Documents', 'Documentos'],
  ['File', 'Ficheiro'],
  ['Files', 'Ficheiros'],
  ['Folder', 'Pasta'],
  ['Report', 'Relatorio'],
  ['Reports', 'Relatorios'],
  ['Analytics', 'Analytics'],
  ['Meeting', 'Reuniao'],
  ['Meetings', 'Reunioes'],
  ['Interview', 'Entrevista'],
  ['Interviews', 'Entrevistas'],
  ['Candidate', 'Candidato'],
  ['Candidates', 'Candidatos'],
  ['Job', 'Vaga'],
  ['Jobs', 'Vagas'],
  ['Contract', 'Contrato'],
  ['Contracts', 'Contratos'],
  ['Invoice', 'Fatura'],
  ['Invoices', 'Faturas'],
  ['Payment', 'Pagamento'],
  ['Payments', 'Pagamentos'],
  ['Subscription', 'Subscricao'],
  ['Feature', 'Funcionalidade'],
  ['Features', 'Funcionalidades'],
  ['Integration', 'Integracao'],
  ['Integrations', 'Integracoes'],
  ['Template', 'Modelo'],
  ['Templates', 'Modelos'],
  ['Category', 'Categoria'],
  ['Categories', 'Categorias'],
  ['Tag', 'Etiqueta'],
  ['Tags', 'Etiquetas'],
  ['Note', 'Nota'],
  ['Notes', 'Notas'],
  ['Comment', 'Comentario'],
  ['Comments', 'Comentarios'],
  ['Feedback', 'Feedback'],
  ['Review', 'Revisao'],
  ['Skill', 'Competencia'],
  ['Skills', 'Competencias'],
  ['Experience', 'Experiencia'],
  ['Education', 'Formacao'],
  ['Language', 'Idioma'],
  ['Languages', 'Idiomas'],
  ['Currency', 'Moeda'],
  ['Amount', 'Montante'],
  ['Total', 'Total'],
  ['Overview', 'Visao Geral'],
  ['Summary', 'Resumo'],
  ['Details', 'Detalhes'],
  ['History', 'Historico'],
  ['Activity', 'Atividade'],
  ['Security', 'Seguranca'],
  ['Privacy', 'Privacidade'],
  ['Compliance', 'Conformidade'],
  ['Administration', 'Administracao'],
  ['Admin', 'Administrador'],
  ['Configuration', 'Configuracao'],
  ['Preferences', 'Preferencias'],
  ['Options', 'Opcoes'],
  ['Help', 'Ajuda'],
  ['Support', 'Suporte'],

  // Common phrases
  ['No results found', 'Nenhum resultado encontrado'],
  ['No data available', 'Sem dados disponiveis'],
  ['Are you sure?', 'Tem a certeza?'],
  ['This action cannot be undone', 'Esta acao nao pode ser revertida'],
  ['Something went wrong', 'Algo correu mal'],
  ['Please try again', 'Por favor, tente novamente'],
  ['Successfully saved', 'Guardado com sucesso'],
  ['Successfully created', 'Criado com sucesso'],
  ['Successfully updated', 'Atualizado com sucesso'],
  ['Successfully deleted', 'Eliminado com sucesso'],
  ['Failed to save', 'Falha ao guardar'],
  ['Failed to create', 'Falha ao criar'],
  ['Failed to update', 'Falha ao atualizar'],
  ['Failed to delete', 'Falha ao eliminar'],
  ['Failed to load', 'Falha ao carregar'],
  ['Loading', 'A carregar'],
  ['Saving...', 'A guardar...'],
  ['Required', 'Obrigatorio'],
  ['Optional', 'Opcional'],
  ['Coming Soon', 'Em Breve'],
  ['Learn More', 'Saber Mais'],
  ['See All', 'Ver Tudo'],
  ['Show More', 'Mostrar Mais'],
  ['Show Less', 'Mostrar Menos'],
  ['All', 'Todos'],
  ['None', 'Nenhum'],
  ['Yes', 'Sim'],
  ['No', 'Nao'],
  ['Today', 'Hoje'],
  ['Yesterday', 'Ontem'],
  ['Tomorrow', 'Amanha'],
  ['This Week', 'Esta Semana'],
  ['Last Week', 'Ultima Semana'],
  ['This Month', 'Este Mes'],
  ['Last Month', 'Ultimo Mes'],
]);

function translateValue(value) {
  if (typeof value !== 'string') return value;

  // Don't translate empty strings
  if (!value.trim()) return value;

  // Check exact match first
  if (TRANSLATIONS.has(value)) {
    return TRANSLATIONS.get(value);
  }

  // Return original for now - manual review needed for complex strings
  return value;
}

function translateObject(obj) {
  if (typeof obj === 'string') {
    return translateValue(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(translateObject);
  }
  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = translateObject(value);
    }
    return result;
  }
  return obj;
}

// Process a namespace
function processNamespace(ns) {
  const enPath = join(LOCALES, 'en', `${ns}.json`);
  const ptPath = join(LOCALES, 'pt', `${ns}.json`);

  const enData = JSON.parse(readFileSync(enPath, 'utf8'));
  const ptData = translateObject(enData);

  writeFileSync(ptPath, JSON.stringify(ptData, null, 2) + '\n', 'utf8');
  console.log(`Processed ${ns}: ${Object.keys(enData).length} top-level keys`);
}

const ns = process.argv[2];
if (ns) {
  processNamespace(ns);
} else {
  console.log('Usage: node translate-to-pt.mjs <namespace>');
}
