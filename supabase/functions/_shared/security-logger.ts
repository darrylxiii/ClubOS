import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

/**
 * Enhanced Security Logger for SOC 2 Compliance
 * Uses comprehensive_audit_logs table for enterprise-grade audit trails
 */

export interface AuditLogEvent {
  eventType: 'data_access' | 'data_modification' | 'authentication' | 'authorization' | 'configuration_change' | 'export' | 'delete';
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'login' | 'logout' | 'failed_login';
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  description?: string;
  beforeValue?: Record<string, any>;
  afterValue?: Record<string, any>;
  changedFields?: string[];
  metadata?: Record<string, any>;
  complianceTags?: string[];
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  success?: boolean;
  errorMessage?: string;
}

export async function logAuditEvent(event: AuditLogEvent) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { error } = await supabase.from('comprehensive_audit_logs').insert({
      actor_id: event.userId,
      actor_email: event.userEmail,
      actor_role: event.userRole,
      actor_ip_address: event.ipAddress,
      actor_user_agent: event.userAgent,
      event_type: event.eventType,
      event_category: 'security',
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      resource_name: event.resourceName,
      before_value: event.beforeValue,
      after_value: event.afterValue,
      changed_fields: event.changedFields,
      description: event.description,
      metadata: event.metadata,
      compliance_tags: event.complianceTags || ['soc2'],
      success: event.success ?? true,
      error_message: event.errorMessage,
      event_timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

// Legacy compatibility
export interface SecurityLogEvent {
  eventType: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
}

export async function logSecurityEvent(event: SecurityLogEvent) {
  return logAuditEvent({
    eventType: 'authentication',
    action: event.eventType.includes('login') ? 'login' : 'read',
    description: event.eventType,
    metadata: event.details,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    userId: event.userId
  });
}

export async function logPIIAccess(params: {
  dataSubjectId: string;
  dataSubjectType: string;
  piiFields: string[];
  accessReason?: string;
  accessorId: string;
  accessorRole?: string;
  ipAddress?: string;
}) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { error } = await supabase.from('pii_access_logs').insert({
      accessor_id: params.accessorId,
      accessor_role: params.accessorRole,
      accessor_ip_address: params.ipAddress,
      data_subject_id: params.dataSubjectId,
      data_subject_type: params.dataSubjectType,
      pii_fields_accessed: params.piiFields,
      access_reason: params.accessReason,
      lawful_basis: 'legitimate_interest'
    });

    if (error) {
      console.error('Failed to log PII access:', error);
    }
  } catch (error) {
    console.error('Error logging PII access:', error);
  }
}
