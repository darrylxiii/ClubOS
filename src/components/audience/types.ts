export type AudienceType = 'public' | 'connections' | 'company_internal' | 'best_friends' | 'custom';

export interface AudienceSelection {
    type: AudienceType;
    customListIds?: string[];
    multiSelect?: {
        company: boolean;
        connections: boolean;
        bestFriends: boolean;
    };
}
