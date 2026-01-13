import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2';

export interface ActionContext {
    supabase: SupabaseClient;
    payload: any;
}

export const getMoneybirdConfig = () => {
    const accessToken = Deno.env.get('MONEYBIRD_ACCESS_TOKEN');
    const administrationId = Deno.env.get('MONEYBIRD_ADMINISTRATION_ID');

    if (!accessToken || !administrationId) {
        throw new Error("Moneybird configuration missing (ACCESS_TOKEN or ADMINISTRATION_ID)");
    }

    return { accessToken, administrationId };
};
