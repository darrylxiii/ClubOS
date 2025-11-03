export interface ProfileState {
  fullName: string;
  currentTitle: string;
  bio: string;
  locationCity: string;
  phoneNumber: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  linkedinUrl: string;
  preferredWorkLocations: string[];
  remoteWorkPreference: boolean;
}

export type ProfileAction =
  | { type: 'SET_FULL_NAME'; payload: string }
  | { type: 'SET_CURRENT_TITLE'; payload: string }
  | { type: 'SET_BIO'; payload: string }
  | { type: 'SET_LOCATION_CITY'; payload: string }
  | { type: 'SET_PHONE_NUMBER'; payload: string }
  | { type: 'SET_PHONE_VERIFIED'; payload: boolean }
  | { type: 'SET_EMAIL_VERIFIED'; payload: boolean }
  | { type: 'SET_LINKEDIN_URL'; payload: string }
  | { type: 'SET_PREFERRED_WORK_LOCATIONS'; payload: string[] }
  | { type: 'SET_REMOTE_WORK_PREFERENCE'; payload: boolean }
  | { type: 'LOAD_PROFILE'; payload: Partial<ProfileState> }
  | { type: 'RESET' };

export const initialProfileState: ProfileState = {
  fullName: "",
  currentTitle: "",
  bio: "",
  locationCity: "",
  phoneNumber: "",
  phoneVerified: false,
  emailVerified: false,
  linkedinUrl: "",
  preferredWorkLocations: [],
  remoteWorkPreference: false,
};

export function profileReducer(state: ProfileState, action: ProfileAction): ProfileState {
  switch (action.type) {
    case 'SET_FULL_NAME':
      return { ...state, fullName: action.payload };
    case 'SET_CURRENT_TITLE':
      return { ...state, currentTitle: action.payload };
    case 'SET_BIO':
      return { ...state, bio: action.payload };
    case 'SET_LOCATION_CITY':
      return { ...state, locationCity: action.payload };
    case 'SET_PHONE_NUMBER':
      return { ...state, phoneNumber: action.payload };
    case 'SET_PHONE_VERIFIED':
      return { ...state, phoneVerified: action.payload };
    case 'SET_EMAIL_VERIFIED':
      return { ...state, emailVerified: action.payload };
    case 'SET_LINKEDIN_URL':
      return { ...state, linkedinUrl: action.payload };
    case 'SET_PREFERRED_WORK_LOCATIONS':
      return { ...state, preferredWorkLocations: action.payload };
    case 'SET_REMOTE_WORK_PREFERENCE':
      return { ...state, remoteWorkPreference: action.payload };
    case 'LOAD_PROFILE':
      return { ...state, ...action.payload };
    case 'RESET':
      return initialProfileState;
    default:
      return state;
  }
}
