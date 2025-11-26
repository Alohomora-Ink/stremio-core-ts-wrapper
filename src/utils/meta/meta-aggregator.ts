import { getIdPrefix } from "../addons/match-addons";
import type { MetaItem, MetaVideo, MetaVideoVariant } from "../../types/models/meta-item";

export function aggregateMetaItems(rawItems: (MetaItem | null | undefined)[], targetId: string): MetaItem | null {
    const validItems = rawItems.filter((i): i is MetaItem => !!i && Object.keys(i).length > 0);
    if (validItems.length === 0) return null;

    // 🔍 DEBUG LOG 1: Full addon structure
    console.log('🔄 ========== AGGREGATION START ==========');
    console.log('Target ID:', targetId);
    console.log('Valid Items Count:', validItems.length);
    validItems.forEach((item, idx) => {
        const seasonStructure = item.videos?.reduce((acc, v) => {
            const s = v.season || 1;
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        console.log(`\n--- Addon ${idx} ---`);
        console.log('Source:', (item as any)._sourceAddon);
        console.log('ID:', item.id);
        console.log('Type:', item.type);
        console.log('Video Count:', item.videos?.length || 0);
        console.log('Is Seasonal:', isSeasonal(item));
        console.log('Season Structure:', JSON.stringify(seasonStructure, null, 2));

        // Print first 3 episodes as examples
        if (item.videos && item.videos.length > 0) {
            console.log('Sample Episodes (first 3):');
            item.videos.slice(0, 3).forEach((v, i) => {
                console.log(`  Episode ${i + 1}:`, JSON.stringify({
                    id: v.id,
                    name: v.name,
                    season: v.season,
                    episode: v.episode,
                    imdbSeason: v.imdbSeason,
                    imdbEpisode: v.imdbEpisode
                }, null, 2));
            });
        }
    });

    // 0. PRE-NORMALIZE STRUCTURE
    validItems.forEach(item => {
        item.videos?.forEach(v => {
            if (v.imdbSeason !== undefined && v.imdbEpisode !== undefined) {
                v.season = Number(v.imdbSeason);
                v.episode = Number(v.imdbEpisode);
            }
        });
    });

    // 1. SELECT MASTER
    let structureMaster = validItems.find(i => isSourceCinemeta(i))
        || validItems.find(i => isSourceTMDB(i));

    if (!structureMaster) {
        let maxScore = 0;
        structureMaster = validItems[0];
        validItems.forEach(item => {
            const score = (item.videos?.length || 0) + (item.videos?.reduce((acc, v) => Math.max(acc, v.season || 0), 0) || 0) * 10;
            if (score > maxScore) {
                maxScore = score;
                structureMaster = item;
            }
        });
    }

    console.log('\n📋 Structure Master Selected:', (structureMaster as any)._sourceAddon);

    const visualMaster = [...validItems].sort((a, b) => getVisualScore(b) - getVisualScore(a))[0];

    // 2. BUILD AGGREGATE ROOT
    const master = { ...visualMaster };
    master.id = targetId;

    // Collect ALL IDs from the sources with ALL possible prefixes and formats
    const aggregatedIds = new Set<string>();
    console.log(`🔄 META AGGREGATION: Collecting aggregated IDs from ${validItems.length} sources`);
    aggregatedIds.add(targetId);

    validItems.forEach(i => {
        // Add base ID and all its variants
        if (i.id) {
            aggregatedIds.add(i.id);
            console.log(`  Adding base ID: ${i.id} (from ${i.name || 'unknown'})`);

            // If ID doesn't have prefix, add prefixed versions
            if (!i.id.includes(':')) {
                aggregatedIds.add(`series:${i.id}`);
                aggregatedIds.add(`movie:${i.id}`);
                console.log(`  Adding type-prefixed IDs: series:${i.id}, movie:${i.id}`);
            }
        }

        // Add external IDs with ALL possible prefixes and formats
        if (i.imdb_id) {
            aggregatedIds.add(`tt${i.imdb_id}`);
            aggregatedIds.add(`${i.imdb_id}`);
            console.log(`  Adding IMDB variants: tt${i.imdb_id}, ${i.imdb_id}`);
        }
        if (i.kitsu_id) {
            aggregatedIds.add(`kitsu:${i.kitsu_id}`);
            aggregatedIds.add(`${i.kitsu_id}`);
            console.log(`  Adding Kitsu variants: kitsu:${i.kitsu_id}, ${i.kitsu_id}`);
        }
        if (i.moviedb_id) {
            aggregatedIds.add(`tmdb:${i.moviedb_id}`);
            aggregatedIds.add(`${i.moviedb_id}`);
            console.log(`  Adding TMDB variants: tmdb:${i.moviedb_id}, ${i.moviedb_id}`);
        }
    });

    master._aggregatedIds = Array.from(aggregatedIds);
    console.log(`🔄 META AGGREGATION: Final aggregated IDs: [${Array.from(aggregatedIds).join(', ')}]`);

    // Deep copy videos
    master.videos = structureMaster.videos ? JSON.parse(JSON.stringify(structureMaster.videos)) : [];
    master.app_extras = master.app_extras || {};

    // Initialize variants
    master.videos?.forEach(v => {
        if (v.imdbSeason !== undefined && v.imdbEpisode !== undefined) {
            v.season = Number(v.imdbSeason);
            v.episode = Number(v.imdbEpisode);
        }

        v._variants = [];
        if (structureMaster?._sourceAddon) {
            const { _variants, ...cleanVideo } = v;
            v._variants.push({
                addonId: structureMaster._sourceAddon,
                rawVideo: cleanVideo as MetaVideo
            });
        }
    });

    // 3. ID SYNC
    validItems.forEach(source => {
        if (source.imdb_id && !master.imdb_id) master.imdb_id = source.imdb_id;
        if (source.moviedb_id && !master.moviedb_id) master.moviedb_id = source.moviedb_id;
        if (source.kitsu_id && !master.kitsu_id) master.kitsu_id = source.kitsu_id;

        const prefix = getIdPrefix(source.id);
        if (prefix === 'tt' && !master.imdb_id) master.imdb_id = source.id;
        if (prefix === 'kitsu' && !master.kitsu_id) {
            const parts = source.id.split(':');
            if (parts.length > 1) master.kitsu_id = parts[1];
        }
    });

    // 4. MERGE EPISODES
    const isMasterSeasonal = isSeasonal(structureMaster);

    validItems.forEach(source => {
        if (source === structureMaster) return;
        if (!source.videos) return;

        const addonId = source._sourceAddon || "unknown";
        const isSourceFlat = !isSeasonal(source);
        const allowOrphans = !(isMasterSeasonal && isSourceFlat);

        console.log(`\n🔀 Merging episodes from: ${addonId}`);
        console.log('  Is Source Flat:', isSourceFlat);
        console.log('  Allow Orphans:', allowOrphans);

        master.videos = mergeEpisodes(master.videos || [], source.videos, addonId, allowOrphans);
    });

    // 5. SORT & CLEANUP
    if (master.videos) {
        master.videos.sort((a, b) => {
            const sA = a.season || 0;
            const sB = b.season || 0;
            if (sA !== sB) return sA - sB;
            return (a.episode || 0) - (b.episode || 0);
        });

        const seenIds = new Set();
        master.videos = master.videos.filter(v => {
            if (seenIds.has(v.id)) return false;
            seenIds.add(v.id);
            return true;
        });
    }

    // 🔍 DEBUG LOG 2: Final result with FULL season breakdown
    console.log('\n✅ ========== AGGREGATION RESULT ==========');
    console.log('Master ID:', master.id);
    console.log('Aggregated IDs:', JSON.stringify(master._aggregatedIds, null, 2));
    console.log('Total Videos:', master.videos?.length || 0);

    const seasonBreakdown: Record<number, any> = {};
    master.videos?.forEach(v => {
        const s = v.season || 1;
        if (!seasonBreakdown[s]) {
            seasonBreakdown[s] = {
                count: 0,
                episodes: []
            };
        }
        seasonBreakdown[s].count++;
        seasonBreakdown[s].episodes.push({
            id: v.id,
            name: v.name,
            s: v.season,
            e: v.episode,
            variantCount: v._variants?.length || 0,
            variantSources: v._variants?.map(vr => vr.addonId) || []
        });
    });

    console.log('\n📊 FULL Season Breakdown:');
    Object.entries(seasonBreakdown).forEach(([season, data]) => {
        console.log(`\nSeason ${season}: ${data.count} episodes`);
        console.log('Episodes:', JSON.stringify(data.episodes, null, 2));
    });
    console.log('\n==========================================\n');

    return master;
}

function mergeEpisodes(
    master: MetaVideo[],
    others: MetaVideo[],
    sourceAddonId: string,
    allowOrphans: boolean
): MetaVideo[] {
    const merged = [...master];

    others.forEach(otherEp => {
        const matchIndex = merged.findIndex(m => isMatch(m, otherEp));
        const { _variants: _ignore1, ...cleanOtherEp } = otherEp;

        if (matchIndex !== -1) {
            const match = merged[matchIndex];
            if (!match._variants) match._variants = [];

            if (!match._variants.some(v => v.addonId === (match as any)._sourceAddon)) {
                const { _variants: _ignore2, ...cleanMatch } = match;
                match._variants.push({
                    addonId: (match as any)._sourceAddon || 'unknown',
                    rawVideo: cleanMatch as MetaVideo
                });
            }

            match._variants.push({
                addonId: sourceAddonId,
                rawVideo: cleanOtherEp as MetaVideo
            });

            const getScore = (id: string | undefined) => {
                if (!id) return 0;
                if (id.includes('tmdb')) return 4;
                if (id.includes('cinemeta')) return 3;
                if (id.includes('kitsu')) return 2;
                return 1;
            };

            const currentScore = getScore((match as any)._sourceAddon);
            const newScore = getScore(sourceAddonId);

            if (newScore > currentScore) {
                if (otherEp.thumbnail) match.thumbnail = otherEp.thumbnail;
                if (otherEp.overview) match.overview = otherEp.overview;
                if (otherEp.name && !otherEp.name.toLowerCase().startsWith('episode')) match.name = otherEp.name;
                (match as any)._sourceAddon = sourceAddonId;
            }
            else if (newScore === currentScore) {
                if (!match.thumbnail && otherEp.thumbnail) match.thumbnail = otherEp.thumbnail;
            }

        } else if (allowOrphans) {
            const orphan = { ...cleanOtherEp } as MetaVideo;
            (orphan as any)._sourceAddon = sourceAddonId;
            orphan._variants = [{
                addonId: sourceAddonId,
                rawVideo: cleanOtherEp as MetaVideo
            }];
            merged.push(orphan);
        }
    });

    return merged;
}

function isMatch(v1: MetaVideo, v2: MetaVideo): boolean {
    if (v1.id === v2.id) return true;
    if (v1.imdb_id && (v1.imdb_id === v2.id || v1.imdb_id === v2.imdb_id)) return true;
    if (v2.imdb_id && (v2.imdb_id === v1.id)) return true;

    if (v1.season !== undefined && v1.episode !== undefined &&
        v2.season !== undefined && v2.episode !== undefined) {
        if (v1.season == v2.season && v1.episode == v2.episode) return true;
    }
    if (v2.imdbSeason !== undefined && v2.imdbEpisode !== undefined) {
        if (v2.imdbSeason == v1.season && v2.imdbEpisode == v1.episode) return true;
    }
    if (v1.imdbSeason !== undefined && v1.imdbEpisode !== undefined) {
        if (v1.imdbSeason == v2.season && v1.imdbEpisode == v2.episode) return true;
    }
    if (v1.released && v2.released) {
        const d1 = new Date(v1.released).toISOString().split('T')[0];
        const d2 = new Date(v2.released).toISOString().split('T')[0];
        if (d1 === d2) return true;
    }
    if (v1.name && v2.name && v1.name.length > 3 && v2.name.length > 3) {
        const n1 = normalizeTitle(v1.name);
        const n2 = normalizeTitle(v2.name);
        if (!n1.startsWith('episode') && !n2.startsWith('episode')) {
            if (n1 === n2) return true;
        }
    }
    return false;
}

function normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function isSourceTMDB(item: MetaItem) { return (item as any)._sourceAddon?.includes('tmdb') || getIdPrefix(item.id) === 'tmdb'; }
function isSourceCinemeta(item: MetaItem) { return (item as any)._sourceAddon?.includes('cinemeta'); }
function isSeasonal(item: MetaItem) {
    if (!item.videos || item.videos.length === 0) return false;
    if (item.videos.some(v => (v.season || 0) > 1)) return true;
    // Removed loose check: if (item.type === 'series' && item.videos[0].season !== undefined) return true;
    return false;
}

function getVisualScore(item: MetaItem) {
    let score = 0;
    if (isSourceTMDB(item)) score += 100;
    if (isSourceCinemeta(item)) score += 80;
    if (item.background) score += 10;
    if (item.logo) score += 5;
    if (item.description) score += 5;
    return score;
}