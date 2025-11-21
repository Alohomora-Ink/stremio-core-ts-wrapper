import type { AddonDescriptor } from "./addon";

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
        items: Record<string, unknown>;
    };
    addons: {
        catalogs: AddonDescriptor[];
        installed: AddonDescriptor[];
    };
    notifications: {
        items: Record<string, unknown>;
    };
}