import type { AddonDescriptor } from "../../types/models";
import type { MetaItem } from "../../types/models/meta-item";

export function getIdPrefix(id: string): string {
    if (!id) return "";
    if (id.startsWith('tt')) return 'tt';
    if (id.startsWith('tmdb')) return 'tmdb';
    if (id.startsWith('kitsu')) return 'kitsu';

    const parts = id.split(":");
    if (parts.length > 1) return parts[0];

    const match = id.match(/^([a-zA-Z]+)/);
    return match ? match[1] : 'unknown';
}

export function getMatchingAddons(
    addons: AddonDescriptor[],
    resource: "meta" | "stream" | "catalog",
    type: string,
    targetId: string
): AddonDescriptor[] {
    const targetPrefix = getIdPrefix(targetId);

    return addons.filter(addon => {
        const m = addon.manifest;

        // 1. Resource Check
        const hasResource = m.resources.some(r =>
            r === resource || (typeof r === 'object' && (r as any).name === resource)
        );
        if (!hasResource) return false;

        // 2. Type Check (Loose for Anime/Series compatibility)
        const isAnimeOrSeries = type === 'series' || type === 'anime';
        const supportsType = m.types.includes(type) ||
            (isAnimeOrSeries && (m.types.includes('anime') || m.types.includes('series')));
        if (!supportsType) return false;

        // 3. Prefix Check
        if (!m.idPrefixes || m.idPrefixes.length === 0) return true;

        // "tt" and "tmdb" are universal fallback targets for many addons
        if (targetPrefix === 'tt' && m.idPrefixes.includes('tt')) return true;
        if (targetPrefix === 'tmdb' && m.idPrefixes.includes('tmdb')) return true;

        return m.idPrefixes.includes(targetPrefix);
    });
}

/**
 * EXTRACT ALL IDS (The Bridge)
 * Scans a MetaItem deeply to find every possible ID alias (IMDB, TMDB, Kitsu, TVDB).
 */
export function extractAllIds(meta: MetaItem): Record<string, string> {
    const ids: Record<string, string> = {};

    // 1. Root Level Explicit Properties
    if (meta.id) ids[getIdPrefix(meta.id)] = meta.id;
    if (meta.imdb_id) ids['tt'] = meta.imdb_id;
    if (meta.moviedb_id) ids['tmdb'] = String(meta.moviedb_id);
    if (meta.kitsu_id) ids['kitsu'] = String(meta.kitsu_id);

    // 2. Dynamic/Legacy Properties (e.g. "tvdb_id")
    for (const key in meta) {
        if (key.endsWith('_id')) {
            const val = (meta as any)[key];
            if (!val) continue;

            if (key === 'tvdb_id') ids['tvdb'] = String(val);
            else if (key === 'anidb_id') ids['anidb'] = String(val);
        }
    }

    // 3. DEEP VIDEO SCAN (Crucial for Kitsu -> IMDB bridge)
    // Kitsu meta often lacks root IMDB ID, but individual episodes HAVE it.
    // We scan the first 5 and last 5 videos to find a link.
    if (meta.videos && meta.videos.length > 0) {
        const samples = [
            ...meta.videos.slice(0, 5),
            ...meta.videos.slice(-5)
        ];

        for (const video of samples) {
            // A. Explicit video property
            if (video.imdb_id && video.imdb_id.startsWith('tt')) {
                ids['tt'] = video.imdb_id;
            }
            // B. ID Parsing (e.g. "tt123:1:1")
            if (video.id) {
                if (video.id.startsWith('tt')) {
                    const parts = video.id.split(':');
                    if (parts[0].startsWith('tt')) ids['tt'] = parts[0];
                }
            }
        }
    }

    return ids;
}