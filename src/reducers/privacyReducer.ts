export interface PrivacyState {
  blockedCompanies: string[];
  stealthModeEnabled: boolean;
  stealthModeLevel: number;
  allowStealthColdOutreach: boolean;
  settings: {
    share_full_name: boolean;
    share_email: boolean;
    share_phone: boolean;
    share_location: boolean;
    share_current_title: boolean;
    share_linkedin_url: boolean;
    share_career_preferences: boolean;
    share_resume: boolean;
    share_salary_expectations: boolean;
    share_notice_period: boolean;
  };
}

export type PrivacyAction =
  | { type: 'ADD_BLOCKED_COMPANY'; payload: string }
  | { type: 'REMOVE_BLOCKED_COMPANY'; payload: string }
  | { type: 'SET_BLOCKED_COMPANIES'; payload: string[] }
  | { type: 'SET_STEALTH_MODE_ENABLED'; payload: boolean }
  | { type: 'SET_STEALTH_MODE_LEVEL'; payload: number }
  | { type: 'SET_ALLOW_STEALTH_COLD_OUTREACH'; payload: boolean }
  | { type: 'UPDATE_PRIVACY_SETTING'; payload: { key: keyof PrivacyState['settings']; value: boolean } }
  | { type: 'UPDATE_PRIVACY_SETTINGS'; payload: Partial<PrivacyState['settings']> }
  | { type: 'LOAD_PRIVACY'; payload: Partial<PrivacyState> }
  | { type: 'RESET' };

export const initialPrivacyState: PrivacyState = {
  blockedCompanies: [],
  stealthModeEnabled: false,
  stealthModeLevel: 1,
  allowStealthColdOutreach: true,
  settings: {
    share_full_name: true,
    share_email: true,
    share_phone: true,
    share_location: true,
    share_current_title: true,
    share_linkedin_url: true,
    share_career_preferences: true,
    share_resume: true,
    share_salary_expectations: true,
    share_notice_period: true,
  },
};

export function privacyReducer(state: PrivacyState, action: PrivacyAction): PrivacyState {
  switch (action.type) {
    case 'ADD_BLOCKED_COMPANY':
      return {
        ...state,
        blockedCompanies: [...state.blockedCompanies, action.payload],
      };
    case 'REMOVE_BLOCKED_COMPANY':
      return {
        ...state,
        blockedCompanies: state.blockedCompanies.filter(id => id !== action.payload),
      };
    case 'SET_BLOCKED_COMPANIES':
      return { ...state, blockedCompanies: action.payload };
    case 'SET_STEALTH_MODE_ENABLED':
      return { ...state, stealthModeEnabled: action.payload };
    case 'SET_STEALTH_MODE_LEVEL':
      return { ...state, stealthModeLevel: action.payload };
    case 'SET_ALLOW_STEALTH_COLD_OUTREACH':
      return { ...state, allowStealthColdOutreach: action.payload };
    case 'UPDATE_PRIVACY_SETTING':
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.key]: action.payload.value,
        },
      };
    case 'UPDATE_PRIVACY_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    case 'LOAD_PRIVACY':
      return {
        ...state,
        ...action.payload,
        settings: {
          ...state.settings,
          ...(action.payload.settings || {}),
        },
      };
    case 'RESET':
      return initialPrivacyState;
    default:
      return state;
  }
}
