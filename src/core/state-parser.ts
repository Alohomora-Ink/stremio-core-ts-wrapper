import type { CtxState, UserProfile, LibraryItem, BoardState, Loadable, MetaItem, AddonDescriptor, ContinueWatchingPreview } from "../types/models";

export class StateParser {
    static parseCtx(raw: any): CtxState {
        if (!raw) return StateParser.emptyCtx();

        // --- DEBUG: RAW LIBRARY CHECK ---
        if (raw.library) {
            const itemCount = raw.library.items ? Object.keys(raw.library.items).length : 0;
            if (itemCount > 0) {
                console.log(`[StateParser] Parsing Ctx with ${itemCount} library items.`);
            } else {
                console.warn(`[StateParser] Ctx has EMPTY library.items! Auth status:`, raw.profile ? "Logged In" : "Guest");
            }
        }
        // ---------------------------------

        // 1. Addons
        let installedAddons: AddonDescriptor[] = [];
        if (raw.profile?.addons && Array.isArray(raw.profile.addons)) {
            installedAddons = raw.profile.addons;
        } else if (Array.isArray(raw.addons)) {
            installedAddons = raw.addons;
        }
        const catalogAddons = installedAddons.filter(addon =>
            addon.manifest.catalogs && addon.manifest.catalogs.length > 0
        );

        // 2. Profile
        const profile = raw.profile ? StateParser.parseProfile(raw.profile) : null;

        // 3. Library
        const libraryItems: Record<string, LibraryItem> = {};
        if (raw.library && raw.library.items) {
            // Support Map or Object
            const items = raw.library.items;
            const entries = Array.isArray(items) ? items : Object.values(items);

            entries.forEach((item: any) => {
                if (!item) return;
                const parsed = StateParser.normalizeLibraryItem(item);
                if (parsed) libraryItems[parsed._id] = parsed;
            });
        }

        // 4. Notifications & Watched
        const notificationItems = raw.notifications?.items || {};
        const watchedItems = raw.watched || {};

        return {
            profile,
            library: { items: libraryItems },
            addons: { installed: installedAddons, catalogs: catalogAddons },
            notifications: { items: notificationItems },
            watched: watchedItems
        };
    }

    static parseMetaDetails(raw: any): { meta: MetaItem | null, library_item: LibraryItem | null } {
        if (!raw) return { meta: null, library_item: null };

        let meta: MetaItem | null = null;
        if (raw.metaItem && raw.metaItem.content && raw.metaItem.content.type === 'Ready') {
            meta = raw.metaItem.content.content;
        }

        const library_item = raw.libraryItem
            ? StateParser.normalizeLibraryItem(raw.libraryItem)
            : null;

        return { meta, library_item };
    }

    private static normalizeLibraryItem(item: any): LibraryItem | null {
        const id = item._id || item.id;
        if (!id) return null;
        if (item.removed) return null;

        return {
            _id: id,
            name: item.name || "Unknown",
            type: item.type || "other",
            poster: item.poster,
            posterShape: item.posterShape,
            removed: !!item.removed,
            temp: !!item.temp,
            _ctime: item._ctime,
            _mtime: item._mtime,

            // Preserving External IDs
            imdb_id: item.imdb_id || null,
            kitsu_id: item.kitsu_id || null,
            moviedb_id: item.moviedb_id || null,

            state: {
                timeWatched: item.state?.timeWatched || 0,
                timeOffset: item.state?.timeOffset || 0,
                overallTimeWatched: item.state?.overallTimeWatched || 0,
                timesWatched: item.state?.timesWatched || 0,
                flaggedWatched: item.state?.flaggedWatched ?? 0,
                duration: item.state?.duration || 0,
                video_id: item.state?.video_id,
                season: item.state?.season,
                episode: item.state?.episode,
                lastWatched: item.state?.lastWatched,
                watched: item.state?.watched || "",
                noNotif: item.state?.noNotif === true
            },
            behaviorHints: item.behaviorHints,
        };
    }

    private static parseProfile(rawProfile: any): UserProfile {
        const authUser = rawProfile.auth?.user;
        const authKey = rawProfile.auth?.key;
        const id = authUser?._id || rawProfile._id || "guest";
        return {
            _id: id === "guest" && !authKey ? "guest" : id,
            email: authUser?.email || rawProfile.email,
            avatar: authUser?.avatar || rawProfile.avatar,
            fbId: authUser?.fbId || rawProfile.fbId,
            gdpr_consent: authUser?.gdpr_consent || rawProfile.gdpr_consent,
            token: authKey
        };
    }

    private static emptyCtx(): CtxState {
        return { profile: null, library: { items: {} }, addons: { catalogs: [], installed: [] }, notifications: { items: {} }, watched: {} };
    }

    static parseLibrary(raw: any): LibraryItem[] {
        if (!raw) return [];
        const list = Array.isArray(raw.catalog) ? raw.catalog : (raw.items ? Object.values(raw.items) : []);

        return list
            .map((item: any) => StateParser.normalizeLibraryItem(item))
            .filter((i: LibraryItem | null): i is LibraryItem => !!i);
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
        return { catalogs, selected: raw.selected };
    }

    private static parseLoadableContent(raw: any): Loadable<MetaItem[]> {
        if (!raw) return { type: "Loading" };
        if (raw.type === "Ready" && Array.isArray(raw.content)) return { type: "Ready", content: raw.content };
        if (raw.type === "Err") return { type: "Err", error: raw.error || "Unknown error" };
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
            state: { videoId: item.state?.videoId || "" }
        }));
        return { items };
    }
}