import type { CtxState, UserProfile, LibraryItem, BoardState, Loadable, MetaItem, AddonDescriptor, ContinueWatchingPreview } from "../types/models";

export class StateParser {
    // ==========================================================================
    //  CTX PARSER
    // ==========================================================================
    static parseCtx(raw: any): CtxState {
        if (!raw) {
            console.warn("[StateParser] parseCtx input is null/undefined");
            return StateParser.emptyCtx();
        }

        // 1. Addons Parsing
        let installedAddons: AddonDescriptor[] = [];
        if (raw.profile?.addons && Array.isArray(raw.profile.addons)) {
            installedAddons = raw.profile.addons;
        } else if (Array.isArray(raw.addons)) {
            installedAddons = raw.addons;
        }

        const catalogAddons = installedAddons.filter(addon =>
            addon.manifest.catalogs && addon.manifest.catalogs.length > 0
        );

        // 2. Profile Parsing
        const profile = raw.profile ? StateParser.parseProfile(raw.profile) : null;

        return {
            profile,
            library: {
                items: raw.library?.items || {}
            },
            addons: {
                installed: installedAddons,
                catalogs: catalogAddons,
            },
            notifications: {
                items: raw.notifications?.items || {}
            }
        };
    }

    private static parseProfile(rawProfile: any): UserProfile {
        // Structure is: profile -> auth -> user -> { _id, email, ... }
        const authUser = rawProfile.auth?.user;
        const authKey = rawProfile.auth?.key;

        // If we have a user object in auth, we use it. 
        // Otherwise fall back to root properties (legacy/guest handling).
        const id = authUser?._id || rawProfile._id || "guest";
        const email = authUser?.email || rawProfile.email;
        const avatar = authUser?.avatar || rawProfile.avatar;
        const fbId = authUser?.fbId || rawProfile.fbId;
        const gdpr = authUser?.gdpr_consent || rawProfile.gdpr_consent;

        // Determine if really authenticated
        // In your JSON, a logged in user has a 'key' in auth.
        const isGuest = !authKey || id === "guest";

        return {
            _id: isGuest ? "guest" : id,
            email: email,
            avatar: avatar,
            fbId: fbId,
            gdpr_consent: gdpr,
            token: authKey
        };
    }

    private static emptyCtx(): CtxState {
        return {
            profile: null,
            library: { items: {} },
            addons: { catalogs: [], installed: [] },
            notifications: { items: {} }
        };
    }


    static parseLibrary(raw: any): LibraryItem[] {
        if (!raw || !raw.items) return [];
        return Object.values(raw.items).map((item: any) => ({
            _id: item._id,
            name: item.name || "Unknown",
            type: item.type || "other",
            poster: item.poster,
            posterShape: item.posterShape,
            removed: item.removed || false,
            temp: item.temp || false,
            _ctime: item._ctime,
            _mtime: item._mtime,
            state: {
                timeWatched: item.state?.timeWatched || 0,
                timeOffset: item.state?.timeOffset || 0,
                overallTimeWatched: item.state?.overallTimeWatched || 0,
                timesWatched: item.state?.timesWatched || 0,
                flaggedWatched: item.state?.flaggedWatched || false,
                duration: item.state?.duration || 0,
                video_id: item.state?.video_id,
                season: item.state?.season,
                episode: item.state?.episode,
                lastWatched: item.state?.lastWatched
            },
            behaviorHints: item.behaviorHints
        }));
    }

    static parseBoard(raw: any): BoardState {
        if (!raw || !Array.isArray(raw.catalogs)) return { catalogs: [] };
        const catalogs = raw.catalogs.map((cat: any) => ({
            type: cat.type,
            id: cat.id,
            name: cat.name,
            addon: cat.addon,
            content: StateParser.parseLoadableContent(cat.content)
        }));
        return {
            catalogs,
            selected: raw.selected
        };
    }

    private static parseLoadableContent(raw: any): Loadable<MetaItem[]> {
        if (!raw) return { type: "Loading" };
        if (raw.type === "Ready" && Array.isArray(raw.content)) {
            return { type: "Ready", content: raw.content };
        }
        if (raw.type === "Err") {
            return { type: "Err", error: raw.error || "Unknown error" };
        }
        return { type: "Loading" };
    }

    static parseContinueWatching(raw: any): ContinueWatchingPreview {
        if (!raw || !Array.isArray(raw.items)) return { items: [] };

        const items = raw.items.map((item: any) => ({
            _id: item._id,
            name: item.name || "Unknown",
            type: item.type,
            poster: item.poster,
            posterShape: item.posterShape,
            progress: typeof item.progress === 'number' ? item.progress : 0,
            state: {
                videoId: item.state?.videoId || ""
            }
        }));

        return { items };
    }
}