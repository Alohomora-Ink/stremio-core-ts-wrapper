import type { CtxState, LibraryItem } from '../types/models/ctx';

/**
 * State parser - converts raw WASM state into typed TypeScript models
 * Handles validation and transformation
 */
export class StateParser {
    /**
     * Parse raw Context state
     */
    static parseCtx(rawState: any): CtxState {
        if (!rawState || typeof rawState !== 'object') {
            return {
                profile: null,
                library: { items: [] },
                addons: { catalogs: [] }
            };
        }

        return {
            profile: rawState.profile ? {
                _id: rawState.profile._id || '',
                email: rawState.profile.email || '',
                avatar: rawState.profile.avatar,
                gdpr_consent: rawState.profile.gdpr_consent
            } : null,

            library: {
                items: Array.isArray(rawState.library?.items)
                    ? rawState.library.items.map(this.parseLibraryItem)
                    : []
            },

            addons: {
                catalogs: Array.isArray(rawState.addons?.catalogs)
                    ? rawState.addons.catalogs
                    : []
            },

            content: rawState.content
        };
    }

    /**
     * Parse a library item
     */
    private static parseLibraryItem(raw: any): LibraryItem {
        return {
            _id: raw._id || '',
            name: raw.name || '',
            type: raw.type || 'movie',
            poster: raw.poster,
            removed: raw.removed ?? false,
            temp: raw.temp ?? false,
            _ctime: raw._ctime,
            _mtime: raw._mtime,
            state: {
                lastWatched: raw.state?.lastWatched,
                timeWatched: raw.state?.timeWatched || 0,
                timeOffset: raw.state?.timeOffset || 0,
                overallTimeWatched: raw.state?.overallTimeWatched || 0,
                timesWatched: raw.state?.timesWatched || 0,
                flaggedWatched: raw.state?.flaggedWatched ?? false,
                duration: raw.state?.duration || 0,
                video_id: raw.state?.video_id,
                season: raw.state?.season,
                episode: raw.state?.episode
            },
            behaviorHints: raw.behaviorHints
        };
    }
}