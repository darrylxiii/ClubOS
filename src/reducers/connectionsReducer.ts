export interface SocialConnection {
  linkedin: boolean;
  instagram: boolean;
  twitter: boolean;
  github: boolean;
  instagramUsername: string;
  twitterUsername: string;
  githubUsername: string;
}

export interface MusicConnection {
  spotifyConnected: boolean;
  appleMusicConnected: boolean;
  spotifyPlaylists: any[];
  appleMusicPlaylists: any[];
}

export interface ConnectionsState {
  social: SocialConnection;
  music: MusicConnection;
}

export type ConnectionsAction =
  | { type: 'SET_SOCIAL_CONNECTION'; payload: { platform: keyof SocialConnection; value: boolean | string } }
  | { type: 'SET_MUSIC_CONNECTION'; payload: { platform: keyof MusicConnection; value: boolean | any[] } }
  | { type: 'LOAD_SOCIAL_CONNECTIONS'; payload: Partial<SocialConnection> }
  | { type: 'LOAD_MUSIC_CONNECTIONS'; payload: Partial<MusicConnection> }
  | { type: 'LOAD_ALL_CONNECTIONS'; payload: Partial<ConnectionsState> }
  | { type: 'RESET' };

export const initialConnectionsState: ConnectionsState = {
  social: {
    linkedin: false,
    instagram: false,
    twitter: false,
    github: false,
    instagramUsername: '',
    twitterUsername: '',
    githubUsername: '',
  },
  music: {
    spotifyConnected: false,
    appleMusicConnected: false,
    spotifyPlaylists: [],
    appleMusicPlaylists: [],
  },
};

export function connectionsReducer(state: ConnectionsState, action: ConnectionsAction): ConnectionsState {
  switch (action.type) {
    case 'SET_SOCIAL_CONNECTION':
      return {
        ...state,
        social: {
          ...state.social,
          [action.payload.platform]: action.payload.value,
        },
      };
    case 'SET_MUSIC_CONNECTION':
      return {
        ...state,
        music: {
          ...state.music,
          [action.payload.platform]: action.payload.value,
        },
      };
    case 'LOAD_SOCIAL_CONNECTIONS':
      return {
        ...state,
        social: {
          ...state.social,
          ...action.payload,
        },
      };
    case 'LOAD_MUSIC_CONNECTIONS':
      return {
        ...state,
        music: {
          ...state.music,
          ...action.payload,
        },
      };
    case 'LOAD_ALL_CONNECTIONS':
      return {
        ...state,
        ...action.payload,
        social: {
          ...state.social,
          ...(action.payload.social || {}),
        },
        music: {
          ...state.music,
          ...(action.payload.music || {}),
        },
      };
    case 'RESET':
      return initialConnectionsState;
    default:
      return state;
  }
}
