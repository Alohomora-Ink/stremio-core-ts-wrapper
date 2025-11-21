import type { MetaItem, AddonDescriptor } from "../types/models";
import type { ProfileSettings } from "../types/actions/ctx/settings";

// ============================================================================
//  1. ROOT ACTION HELPERS
// ============================================================================

/**
 * Builds a Root Action with NO arguments (Unit Variant).
 * Pattern: { "action": "Name", "args": null }
 */
const buildActionNullArgs = (action: string) => {
    return JSON.stringify({
        action: action,
        args: null,
    });
};

/**
 * Builds a Root Action with EMPTY arguments (Empty Struct Variant).
 * Pattern: { "action": "Name", "args": {} }
 */
const buildActionEmptyArgs = (action: string) => {
    return JSON.stringify({
        action: action,
        args: {},
    });
};

/**
 * Builds a Root Action with specific arguments (Tuple/Struct Variant).
 * Pattern: { "action": "Name", "args": ... }
 */
const buildActionWithArgs = (action: string, args: any) => {
    return JSON.stringify({
        action: action,
        args: args,
    });
};

// ============================================================================
//  2. NESTED ACTION HELPERS (Root -> SubAction)
// ============================================================================

/**
 * Builds a Nested Action where the SubAction has NO arguments (Unit Variant).
 * Pattern: { "action": "Root", "args": { "action": "Sub", "args": null } }
 */
const buildActionWithArgsSubActionNullArgs = (root: string, subAction: string) => {
    return JSON.stringify({
        action: root,
        args: {
            action: subAction,
            args: null,
        },
    });
};

/**
 * Builds a Nested Action where the SubAction has EMPTY arguments (Empty Struct Variant).
 * Pattern: { "action": "Root", "args": { "action": "Sub", "args": {} } }
 */
const buildActionWithArgsSubActionEmptyArgs = (root: string, subAction: string) => {
    return JSON.stringify({
        action: root,
        args: {
            action: subAction,
            args: {},
        },
    });
};

/**
 * Builds a Nested Action where the SubAction has specific arguments.
 * Pattern: { "action": "Root", "args": { "action": "Sub", "args": ... } }
 */
const buildActionWithArgsSubActionWithArgs = (root: string, subAction: string, args: any) => {
    return JSON.stringify({
        action: root,
        args: {
            action: subAction,
            args: args,
        },
    });
};

// ============================================================================
//  3. LOAD MODEL HELPER
// ============================================================================

/**
 * Builds a Load Action for a specific Model.
 * Pattern: { "action": "Load", "args": { "model": "Name", "args": ... } }
 */
const buildLoadAction = (modelName: string, args: any) => {
    return JSON.stringify({
        action: "Load",
        args: {
            model: modelName,
            args: args ?? {},
        },
    });
};

// ============================================================================
//  ACTION BUILDER CLASS
// ============================================================================

export class ActionBuilder {
    // ==========================================================================
    //  CTX: AUTHENTICATION
    // ==========================================================================
    static Auth = {
        /**
         * Authenticate with Email/Password
         * Pattern: Ctx -> Authenticate(Login)
         */
        login: (email: string, password: string): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "Authenticate", {
                type: "Login",
                email,
                password,
            });
        },

        /**
         * Register a new account
         * Pattern: Ctx -> Authenticate(Register)
         */
        register: (email: string, password: string, consent: any): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "Authenticate", {
                type: "Register",
                email,
                password,
                gdpr_consent: consent,
            });
        },

        /**
         * Logout current user
         * Pattern: Ctx -> Logout (Unit Variant)
         */
        logout: (): string => {
            return buildActionWithArgsSubActionNullArgs("Ctx", "Logout");
        },
    };

    // ==========================================================================
    //  CTX: LIBRARY & USER DATA
    // ==========================================================================
    static User = {
        /**
         * Pull user profile data from API
         * Pattern: Ctx -> PullUserFromAPI (Struct Variant {})
         */
        pullUser: (): string => {
            return buildActionWithArgsSubActionEmptyArgs("Ctx", "PullUserFromAPI");
        },

        /**
         * Pull installed addons from API
         * Pattern: Ctx -> PullAddonsFromAPI (Unit Variant null)
         */
        pullAddons: (): string => {
            return buildActionWithArgsSubActionNullArgs("Ctx", "PullAddonsFromAPI");
        },

        /**
         * Sync library items
         * Pattern: Ctx -> SyncLibraryWithAPI (Unit Variant null)
         */
        syncLibrary: (): string => {
            return buildActionWithArgsSubActionNullArgs("Ctx", "SyncLibraryWithAPI");
        },

        /**
         * Update user profile settings
         * Pattern: Ctx -> UpdateSettings(Settings)
         */
        updateSettings: (settings: ProfileSettings): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "UpdateSettings", settings);
        },
    };

    // ==========================================================================
    //  CTX: LIBRARY MANAGEMENT
    // ==========================================================================
    static Library = {
        /**
         * Add a meta item to the library
         * Pattern: Ctx -> AddToLibrary(MetaItem)
         */
        addItem: (item: MetaItem): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "AddToLibrary", item);
        },

        /**
         * Remove an item from the library
         * Pattern: Ctx -> RemoveFromLibrary(ID)
         */
        removeItem: (id: string): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "RemoveFromLibrary", id);
        },

        /**
         * Rewind a library item
         * Pattern: Ctx -> RewindLibraryItem(ID)
         */
        rewind: (id: string): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "RewindLibraryItem", id);
        },

        /**
         * Toggle notifications for a library item
         * Pattern: Ctx -> ToggleNotifications(ID)
         */
        toggleNotifications: (id: string): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "ToggleNotifications", id);
        },
    };

    // ==========================================================================
    //  CTX: ADDONS MANAGEMENT
    // ==========================================================================
    static Addons = {
        /**
         * Install an addon
         * Pattern: Ctx -> InstallAddon(Descriptor)
         */
        install: (descriptor: AddonDescriptor): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "InstallAddon", descriptor);
        },

        /**
         * Uninstall an addon
         * Pattern: Ctx -> UninstallAddon(TransportUrl)
         */
        uninstall: (transportUrl: string): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "UninstallAddon", transportUrl);
        },

        /**
         * Upgrade an addon
         * Pattern: Ctx -> UpgradeAddon(Descriptor)
         */
        upgrade: (descriptor: AddonDescriptor): string => {
            return buildActionWithArgsSubActionWithArgs("Ctx", "UpgradeAddon", descriptor);
        },
    };

    // ==========================================================================
    //  LOAD: NAVIGATION (Routing)
    // ==========================================================================
    static Load = {
        /**
         * Load the Board (Catalog Board)
         * Pattern: Load -> CatalogsWithExtra
         */
        board: (extra: { name: string; value: string }[] = []): string => {
            return buildLoadAction("CatalogsWithExtra", { extra });
        },

        /**
         * Load the Library Page
         * Pattern: Load -> LibraryWithFilters
         */
        library: (
            type: string | null,
            sort: "lastwatched" | "name" | "timeswatched" = "lastwatched",
            page: number = 1
        ): string => {
            return buildLoadAction("LibraryWithFilters", {
                request: { type, sort, page },
            });
        },

        /**
         * Load a Discover Page (Catalog)
         * Pattern: Load -> CatalogWithFilters
         */
        discover: (
            addonUrl: string,
            type: string,
            id: string,
            extra: { name: string; value: string }[] = []
        ): string => {
            return buildLoadAction("CatalogWithFilters", {
                request: {
                    base: addonUrl,
                    path: { resource: "catalog", type, id, extra },
                },
            });
        },

        /**
         * Load the Calendar
         * Pattern: Load -> Calendar
         */
        calendar: (year?: number, month?: number): string => {
            const date = new Date();
            return buildLoadAction("Calendar", {
                filters: [],
                year: year ?? date.getFullYear(),
                month: month ?? date.getMonth() + 1,
            });
        },

        /**
         * Load Meta Details
         * Pattern: Load -> MetaDetails
         */
        metaDetails: (type: string, id: string, video_id?: string): string => {
            return buildLoadAction("MetaDetails", { type, id, video_id });
        },

        /**
         * Load the Player
         * Pattern: Load -> Player
         */
        player: (
            type: string,
            id: string,
            video_id?: string,
            stream?: any
        ): string => {
            return buildLoadAction("Player", { type, id, video_id, stream });
        },

        /**
         * Load Continue Watching Preview (For Board)
         * Pattern: Load -> ContinueWatchingPreview
         */
        continueWatchingPreview: (): string => {
            return buildLoadAction("ContinueWatchingPreview", {});
        },
    };

    // ==========================================================================
    //  PLAYER: PLAYBACK SYNC
    // ==========================================================================
    static Player = {
        /**
         * Update time watched
         * Pattern: Player -> TimeChanged(Args)
         */
        timeChanged: (
            time: number,
            duration: number,
            device: string = "web"
        ): string => {
            return buildActionWithArgsSubActionWithArgs("Player", "TimeChanged", {
                time,
                duration,
                device,
            });
        },

        /**
         * Mark playback as ended
         * Pattern: Player -> Ended(Args)
         */
        ended: (
            time: number,
            duration: number,
            device: string = "web"
        ): string => {
            return buildActionWithArgsSubActionWithArgs("Player", "Ended", { time, duration, device });
        },

        /**
         * Pause playback
         * Pattern: Player -> Paused (Unit Variant)
         */
        paused: (): string => {
            return buildActionWithArgsSubActionNullArgs("Player", "Paused");
        },

        /**
         * Resume playback
         * Pattern: Player -> Playing (Unit Variant)
         */
        playing: (): string => {
            return buildActionWithArgsSubActionNullArgs("Player", "Playing");
        },

        /**
         * Update stream stats
         * Pattern: Player -> UpdateStats(Args)
         */
        updateStats: (hash: string, size: number): string => {
            return buildActionWithArgsSubActionWithArgs("Player", "UpdateStats", { hash, size });
        },
    };

    // ==========================================================================
    //  STREAMING SERVER
    // ==========================================================================
    static StreamingServer = {
        /**
         * Reload the streaming server
         * Pattern: StreamingServer -> Reload (Unit Variant)
         */
        reload: (): string => {
            return buildActionWithArgsSubActionNullArgs("StreamingServer", "Reload");
        },
    };
}