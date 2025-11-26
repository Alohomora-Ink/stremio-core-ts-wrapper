import type { AddonDescriptor } from "./addon";
import type { LibraryItem } from "./library";

export interface UserProfile {
    _id: string;
    email: string;
    avatar?: string;
    fbId?: string;
    gdpr_consent?: {
        tos: boolean;
        privacy: boolean;
        marketing: boolean;
        from: string;
    };
    token?: string;
}

export interface CtxState {
    profile: UserProfile | null;
    library: {
        items: Record<string, LibraryItem>;
    };
    addons: {
        catalogs: AddonDescriptor[];
        installed: AddonDescriptor[];
    };
    notifications: {
        items: Record<string, any[]>;
    };
    watched: Record<string, boolean>;
}