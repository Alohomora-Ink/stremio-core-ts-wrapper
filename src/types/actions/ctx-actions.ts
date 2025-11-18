import type { MetaItem } from '../common/meta-item';
import type { AddonDescriptor } from '../common/addon';

/**
 * Context-related actions
 * These modify user state, library, and addons
 */
export type ActionCtx =
    // Library actions
    | { AddToLibrary: MetaItem }
    | { RemoveFromLibrary: string }
    | { ToggleNotifications: string }
    | { RewindLibraryItem: string }

    // Addon actions
    | { InstallAddon: AddonDescriptor }
    | { UninstallAddon: string }
    | { UpgradeAddon: AddonDescriptor }

    // Auth actions
    | {
        Authenticate: {
            type: 'Login' | 'Register' | 'Guest';
            email?: string;
            password?: string;
        }
    }
    | { Logout: null };

/**
 * Wrapper for Ctx actions
 */
export type CtxAction = {
    Ctx: ActionCtx;
};
