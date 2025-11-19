import type { MetaItem } from "../types/common/meta-item";
import type { AddonDescriptor } from "../types/common/addon";
import type { ProfileSettings } from "../types/actions/ctx/settings";

/**
 * Helper to construct the specific JSON shape Stremio Core expects.
 * Pattern: { action: "Variant", args: Payload }
 */
const buildAction = (variant: string, args?: any) => {
    return JSON.stringify({
        action: variant,
        args: args ?? null, // Force null if undefined
    });
};

/**
 * Helper for nested enums (Ctx, Player)
 * Pattern: { action: "Root", args: { action: "SubVariant", args: Payload } }
 */
const buildNestedAction = (root: string, subVariant: string, subArgs?: any) => {
    return JSON.stringify({
        action: root,
        args: {
            action: subVariant,
            args: subArgs ?? null, // Force null if undefined
        },
    });
};

/**
 * Helper for Load actions which use 'model' instead of 'action' for the sub-variant
 * Pattern: { action: "Load", args: { model: "ModelName", args: Payload } }
 */
const buildLoadAction = (modelName: string, args?: any) => {
    return JSON.stringify({
        action: "Load",
        args: {
            model: modelName,
            args: args ?? {}, // Load usually expects a struct, so {} is safer than null
        },
    });
};

export class ActionBuilder {
    // ==========================================================================
    //  CTX: AUTHENTICATION
    // ==========================================================================
    static Auth = {
        login: (email: string, password: string): string => {
            return buildNestedAction("Ctx", "Authenticate", {
                type: "Login",
                email,
                password,
            });
        },

        register: (email: string, password: string, consent: any): string => {
            return buildNestedAction("Ctx", "Authenticate", {
                type: "Register",
                email,
                password,
                gdpr_consent: consent,
            });
        },

        logout: (): string => {
            return buildNestedAction("Ctx", "Logout");
        },
    };

    // ==========================================================================
    //  CTX: LIBRARY & USER DATA
    // ==========================================================================
    static User = {
        pullUser: (): string => {
            //  {"action":"Ctx","args":{"action":"PullUserFromAPI","args":null}}
            return buildNestedAction("Ctx", "PullUserFromAPI");
        },


        pullAddons: (): string => {
            //  {"action":"Ctx","args":{"action":"PullAddonsFromAPI","args":null}}
            return buildNestedAction("Ctx", "PullAddonsFromAPI");
        },

        syncLibrary: (): string => {
            return buildNestedAction("Ctx", "SyncLibraryWithAPI");
        },

        updateSettings: (settings: ProfileSettings): string => {
            return buildNestedAction("Ctx", "UpdateSettings", settings);
        },
    };

    // ==========================================================================
    //  CTX: LIBRARY MANAGEMENT
    // ==========================================================================
    static Library = {
        addItem: (item: MetaItem): string => {
            return buildNestedAction("Ctx", "AddToLibrary", item);
        },

        removeItem: (id: string): string => {
            return buildNestedAction("Ctx", "RemoveFromLibrary", id);
        },

        rewind: (id: string): string => {
            return buildNestedAction("Ctx", "RewindLibraryItem", id);
        },

        toggleNotifications: (id: string): string => {
            return buildNestedAction("Ctx", "ToggleNotifications", id);
        },
    };

    // ==========================================================================
    //  CTX: ADDONS MANAGEMENT
    // ==========================================================================
    static Addons = {
        install: (descriptor: AddonDescriptor): string => {
            return buildNestedAction("Ctx", "InstallAddon", descriptor);
        },

        uninstall: (transportUrl: string): string => {
            return buildNestedAction("Ctx", "UninstallAddon", transportUrl);
        },

        upgrade: (descriptor: AddonDescriptor): string => {
            return buildNestedAction("Ctx", "UpgradeAddon", descriptor);
        },
    };

    // ==========================================================================
    //  LOAD: NAVIGATION (Routing)
    //  Uses 'model' instead of 'action' in the args
    // ==========================================================================
    static Load = {
        board: (extra: { name: string; value: string }[] = []): string => {
            return buildLoadAction("CatalogsWithExtra", { extra });
        },

        library: (
            type: string | null,
            sort: "lastwatched" | "name" | "timeswatched" = "lastwatched",
            page: number = 1
        ): string => {
            return buildLoadAction("LibraryWithFilters", {
                request: { type, sort, page },
            });
        },

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

        calendar: (year?: number, month?: number): string => {
            const date = new Date();
            return buildLoadAction("Calendar", {
                filters: [],
                year: year ?? date.getFullYear(),
                month: month ?? date.getMonth() + 1,
            });
        },

        metaDetails: (type: string, id: string, video_id?: string): string => {
            return buildLoadAction("MetaDetails", { type, id, video_id });
        },

        player: (
            type: string,
            id: string,
            video_id?: string,
            stream?: any
        ): string => {
            return buildLoadAction("Player", { type, id, video_id, stream });
        },
    };

    // ==========================================================================
    //  PLAYER: PLAYBACK SYNC
    // ==========================================================================
    static Player = {
        timeChanged: (
            time: number,
            duration: number,
            device: string = "web"
        ): string => {
            return buildNestedAction("Player", "TimeChanged", {
                time,
                duration,
                device,
            });
        },

        ended: (
            time: number,
            duration: number,
            device: string = "web"
        ): string => {
            return buildNestedAction("Player", "Ended", { time, duration, device });
        },

        paused: (): string => {
            return buildNestedAction("Player", "Paused");
        },

        playing: (): string => {
            return buildNestedAction("Player", "Playing");
        },

        updateStats: (hash: string, size: number): string => {
            return buildNestedAction("Player", "UpdateStats", { hash, size });
        },
    };

    // ==========================================================================
    //  STREAMING SERVER
    // ==========================================================================
    static StreamingServer = {
        reload: (): string => {
            return buildNestedAction("StreamingServer", "Reload");
        },
    };
}