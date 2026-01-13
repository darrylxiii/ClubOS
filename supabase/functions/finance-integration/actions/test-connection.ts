import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMoneybirdConfig, MONEYBIRD_API_BASE } from "../utils/moneybird.ts";

export async function handleTestConnection(supabase: SupabaseClient, payload: any) {
    // No strict payload schema needed, but we could validate empty object
    const { accessToken, administrationId } = getMoneybirdConfig();

    const response = await fetch(`${MONEYBIRD_API_BASE}/${administrationId}.json`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        return {
            connected: false,
            error: `API error: ${response.status} ${await response.text()}`
        };
    }

    const admin = await response.json();
    return {
        connected: true,
        administrationId: admin.id,
        administrationName: admin.name,
        country: admin.country,
        currency: admin.currency
    };
}
