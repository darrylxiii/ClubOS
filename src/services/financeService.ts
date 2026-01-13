import { supabase } from "@/integrations/supabase/client";

interface CreateInvoiceParams {
    partnerInvoiceId: string;
    companyId: string;
    amount: number;
    description: string;
    invoiceNumber?: string;
    dueDate?: string;
    countryCode?: string;
    vatNumber?: string;
}

interface FetchFinancialsParams {
    year?: number;
}

interface SyncContactsParams {
    companyId?: string;
    syncAll?: boolean;
}

interface SyncInvoiceStatusParams {
    partnerInvoiceId?: string;
    syncAll?: boolean;
}

interface FinanceServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    [key: string]: any;
}

export const financeService = {
    /**
     * Create a sales invoice in Moneybird via the unified edge function
     */
    createInvoice: async (params: CreateInvoiceParams): Promise<FinanceServiceResponse> => {
        const { data, error } = await supabase.functions.invoke('finance-integration', {
            body: {
                action: 'create-invoice',
                payload: params
            }
        });

        if (error) throw error;
        return data;
    },

    /**
     * Fetch and sync financial data from Moneybird
     */
    fetchFinancials: async (params: FetchFinancialsParams = {}): Promise<FinanceServiceResponse> => {
        const { data, error } = await supabase.functions.invoke('finance-integration', {
            body: {
                action: 'fetch-financials',
                payload: params
            }
        });

        if (error) throw error;
        return data;
    },

    /**
     * Sync contacts (push companies to Moneybird)
     */
    syncContacts: async (params: SyncContactsParams): Promise<FinanceServiceResponse> => {
        const { data, error } = await supabase.functions.invoke('finance-integration', {
            body: {
                action: 'sync-contacts',
                payload: params
            }
        });

        if (error) throw error;
        return data;
    },

    /**
     * Sync invoice statuses (pull status from Moneybird)
     */
    syncInvoiceStatus: async (params: SyncInvoiceStatusParams): Promise<FinanceServiceResponse> => {
        const { data, error } = await supabase.functions.invoke('finance-integration', {
            body: {
                action: 'sync-invoice-status',
                payload: params
            }
        });

        if (error) throw error;
        return data;
    },

    /**
     * Test connection to Moneybird
     */
    testConnection: async (): Promise<any> => {
        const { data, error } = await supabase.functions.invoke('finance-integration', {
            body: {
                action: 'test-connection',
                payload: {}
            }
        });

        if (error) return { connected: false, error: error.message };
        return data;
    }
};
