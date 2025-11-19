import type { AddonDescriptor } from "../common/addon";

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
    // TODO: uth token is handled internally by Core, but sometimes exposed here
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