import type { AddonDescriptor } from '../common/addon';

/**
 * User profile information
 */
export interface Profile {
    _id: string;
    email: string;
    avatar?: string;
    gdpr_consent?: {
        tos: boolean;
        privacy: boolean;
        marketing: boolean;
        from: string;
    };
}

/**
 * Library item representing content in user's library
 */
export interface LibraryItem {
    _id: string;
    name: string;
    type: 'movie' | 'series' | 'channel' | 'tv';
    poster?: string;
    removed: boolean;
    temp: boolean;
    _ctime: Date | string;
    _mtime: Date | string;
    state: {
        lastWatched?: Date | string;
        timeWatched: number;
        timeOffset: number;
        overallTimeWatched: number;
        timesWatched: number;
        flaggedWatched: boolean;
        duration: number;
        video_id?: string;
        season?: number;
        episode?: number;
    };
    behaviorHints?: {
        defaultVideoId?: string;
    };
}

/**
 * Context state - the main state model
 * Contains user info, library, addons, and settings
 */
export interface CtxState {
    profile: Profile | null;
    library: {
        items: LibraryItem[];
    };
    addons: {
        catalogs: AddonDescriptor[];
        // Other addon-related data
    };
    content?: {
        type: 'Ready' | 'Loading' | 'Error';
    };
}