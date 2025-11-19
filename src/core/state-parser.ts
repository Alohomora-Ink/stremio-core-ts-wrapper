import type { CtxState, UserProfile } from "../types/models/ctx";
import type { LibraryItem } from "../types/models/library";
import type { BoardState, Catalog, Loadable } from "../types/models/catalog";
import type { MetaItem } from "../types/common/meta-item";
import type { AddonDescriptor } from "../types/common/addon";

export class StateParser {
    // ==========================================================================
    //  CTX PARSER
    // ==========================================================================
    static parseCtx(raw: any): CtxState {
        if (!raw) {
            console.warn("[StateParser] parseCtx input is null/undefined");
            return StateParser.emptyCtx();
        }

        let installedAddons: AddonDescriptor[] = [];
        if (raw.profile?.addons && Array.isArray(raw.profile.addons)) {
            installedAddons = raw.profile.addons;
        } else if (Array.isArray(raw.addons)) {
            installedAddons = raw.addons;
        }

        const catalogAddons = installedAddons.filter(addon =>
            addon.manifest.catalogs && addon.manifest.catalogs.length > 0
        );

        return {
            profile: raw.profile ? StateParser.parseProfile(raw.profile) : null,
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
        const auth = rawProfile.auth || {};
        return {
            _id: auth.user?.id || rawProfile._id || "guest",
            email: auth.user?.email || rawProfile.email || "Guest",
            avatar: auth.user?.avatar || rawProfile.avatar,
            fbId: auth.user?.fbId || rawProfile.fbId,
            gdpr_consent: auth.user?.gdpr_consent || rawProfile.gdpr_consent
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

    // ==========================================================================
    //  LIBRARY PARSER
    // ==========================================================================
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

    // ==========================================================================
    //  BOARD (CATALOGS) PARSER
    // ==========================================================================
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
}