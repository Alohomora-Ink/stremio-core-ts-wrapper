import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { AddonClient } from '../api/addons/addon-client';
import { coreKeys } from '../queries/keys';
import { useAddonsCtx } from './use-ctx';
import { StreamParser } from '../utils/parsing/stream-parser';
import { ParsedStream } from '../types/parsed/parsed-stream';
import type { MetaItem, MetaVideo } from '../types/models/meta-item';
import { extractAllIds, getIdPrefix } from '../utils/addons/match-addons';
import type { AddonDescriptor } from '../types/models';

export interface StreamQueryOptions {
    type: string;
    meta: MetaItem;
    episode?: MetaVideo;
}

export function useAggregatedStreams({ type, meta, episode }: StreamQueryOptions) {
    const { installed } = useAddonsCtx();

    // 1. Identify "Stream Provider" Addons
    const eligibleAddons = useMemo(() => {
        return installed.filter((addon: AddonDescriptor) => {
            const m = addon.manifest;
            const hasResource = m.resources.some(r => r === 'stream' || (r as any).name === 'stream');

            const isAnimeOrSeries = type === 'series' || type === 'anime';
            const hasType = m.types.includes(type) ||
                (isAnimeOrSeries && (m.types.includes('anime') || m.types.includes('series')));

            return hasResource && hasType;
        });
    }, [installed, type]);

    // 2. Build Query Tasks (Smart Matching)
    const queries = useMemo(() => {
        if (!eligibleAddons.length) return [];
        if (!episode && type !== 'movie') return []; // Should not happen

        const tasks: Array<{ addon: AddonDescriptor; targetId: string }> = [];

        eligibleAddons.forEach((addon: AddonDescriptor) => {
            const supportedPrefixes = addon.manifest.idPrefixes || [];

            // --- MOVIE LOGIC ---
            if (type === 'movie' || !episode) {
                // Collect all known IDs for this movie (tt, tmdb, kitsu...)
                const metaIds = extractAllIds(meta);

                // Find matching ID for this addon
                Object.entries(metaIds).forEach(([prefix, id]) => {
                    if (supportedPrefixes.length === 0 || supportedPrefixes.includes(prefix)) {
                        tasks.push({ addon, targetId: id });
                    }
                });
                return;
            }

            // --- EPISODE LOGIC (AGGRESSIVE) ---
            if (episode) {
                // A. Check Backpack (_variants) for Exact or Prefix Match
                if (episode._variants && episode._variants.length > 0) {
                    // 1. Exact Addon Match
                    const exactMatch = episode._variants.find(v => v.addonId === addon.manifest.id);
                    if (exactMatch && exactMatch.rawVideo) {
                        tasks.push({ addon, targetId: exactMatch.rawVideo.id });
                    }

                    // 2. Prefix Match (e.g. Kitsu Addon finds a "kitsu:..." ID in variants)
                    episode._variants.forEach(v => {
                        if (!v.rawVideo) return;
                        const prefix = getIdPrefix(v.rawVideo.id);
                        if (supportedPrefixes.includes(prefix)) {
                            tasks.push({ addon, targetId: v.rawVideo.id });
                        }
                    });
                }

                // B. Check Root IDs & Constructed IDs
                const currentId = episode.id;
                const currentPrefix = getIdPrefix(currentId);

                // Main ID
                if (supportedPrefixes.length === 0 || supportedPrefixes.includes(currentPrefix)) {
                    tasks.push({ addon, targetId: currentId });
                }

                // IMDB ID (Common fallback)
                if (episode.imdb_id && supportedPrefixes.includes('tt')) {
                    tasks.push({ addon, targetId: episode.imdb_id });
                }

                // Meta Root ID + Season/Episode (Standard Stremio Convention)
                if (meta.imdb_id && supportedPrefixes.includes('tt') && episode.season !== undefined && episode.episode !== undefined) {
                    const constructedId = `${meta.imdb_id}:${episode.season}:${episode.episode}`;
                    tasks.push({ addon, targetId: constructedId });
                }
            }
        });

        // Deduplicate
        const uniqueTasks = new Map<string, { addon: AddonDescriptor; targetId: string }>();
        tasks.forEach(t => uniqueTasks.set(`${t.addon.manifest.id}:${t.targetId}`, t));

        return Array.from(uniqueTasks.values());

    }, [eligibleAddons, meta, episode, type]);

    // 3. Execute Queries
    const results = useQueries({
        queries: queries.map(({ addon, targetId }) => ({
            queryKey: coreKeys.addon.stream(addon.transportUrl, type, targetId),
            queryFn: async () => {
                try {
                    const res = await AddonClient.getStreams(addon.transportUrl, type, targetId);
                    return res.streams.map(stream => ({
                        ...stream,
                        _sourceAddon: addon.manifest.id,
                        _sourceName: addon.manifest.name
                    }));
                } catch (e) { return []; }
            },
            staleTime: 1000 * 60 * 5,
        }))
    });

    // 4. Flatten & Sort
    const rawStreams = useMemo(() => {
        return results.flatMap(r => r.data || []).filter((s): s is any => !!s);
    }, [results]);

    const streams: ParsedStream[] = useMemo(() => {
        const parsed = StreamParser.parseStreams(rawStreams);
        return parsed.sort((a, b) => b._parsed.score - a._parsed.score);
    }, [rawStreams]);

    const isLoading = results.some(r => r.isLoading);

    return { streams, isLoading };
}
