import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { AddonClient } from '../api/addons/addon-client';
import { coreKeys } from '../queries/keys';
import { useAddonsCtx } from './use-ctx';
import { getMatchingAddons, extractAllIds, getIdPrefix } from '../utils/addons/match-addons';
import type { MetaItem } from "../types/models/meta-item";
import type { AddonDescriptor } from '../types/models';
import { aggregateMetaItems } from '../utils/meta/meta-aggregator';

export function useAggregatedMeta(type: string, rawId: string) {
    const { installed } = useAddonsCtx();
    const id = decodeURIComponent(rawId);

    // 1. Primary Fetch
    const primaryAddons = useMemo(() =>
        getMatchingAddons(installed, "meta", type, id),
        [installed, type, id]);

    const primaryResults = useQueries({
        queries: primaryAddons.map(addon => ({
            queryKey: coreKeys.addon.meta(addon.transportUrl, type, id),
            queryFn: () => fetchMetaSafe(addon, type, id),
            staleTime: Infinity, retry: 0
        }))
    });

    const primaryMetas = primaryResults.map(r => r.data).filter((m): m is MetaItem => !!m);

    // 2. Discovery
    const discoveredIds = useMemo(() => {
        const ids: Record<string, string> = {};
        ids[getIdPrefix(id)] = id;
        primaryMetas.forEach(meta => {
            Object.assign(ids, extractAllIds(meta));
        });
        return ids;
    }, [primaryMetas, id]);

    // 3. Secondary Fetch
    const secondaryAddons = useMemo(() => {
        const targets: Array<{ addon: AddonDescriptor; targetId: string; targetType: string }> = [];
        const usedAddonIds = new Set(primaryAddons.map(a => a.manifest.id));

        Object.entries(discoveredIds).forEach(([prefix, targetId]) => {
            if (targetId === id) return;
            const matches = getMatchingAddons(installed, "meta", type, targetId);
            matches.forEach(addon => {
                if (!usedAddonIds.has(addon.manifest.id)) {
                    targets.push({ addon, targetId, targetType: type });
                    usedAddonIds.add(addon.manifest.id);
                }
            });
        });
        return targets;
    }, [installed, type, discoveredIds, primaryAddons, id]);

    const secondaryResults = useQueries({
        queries: secondaryAddons.map(({ addon, targetId, targetType }) => ({
            queryKey: coreKeys.addon.meta(addon.transportUrl, targetType, targetId),
            queryFn: () => fetchMetaSafe(addon, targetType, targetId),
            staleTime: Infinity, retry: 0
        }))
    });

    // 4. Aggregate
    const allMetas = [
        ...primaryMetas,
        ...secondaryResults.map(r => r.data).filter((m): m is MetaItem => !!m)
    ];

    const meta = useMemo(() => {
        if (allMetas.length === 0) return null;
        return aggregateMetaItems(allMetas, id);
    }, [allMetas, id]);

    const isLoading = [...primaryResults, ...secondaryResults].some(r => r.isLoading) && !meta;

    return { meta, isLoading, rawSources: allMetas };
}

async function fetchMetaSafe(addon: AddonDescriptor, type: string, id: string): Promise<MetaItem | null> {
    try {
        const res = await AddonClient.getMeta(addon.transportUrl, type, id);
        if (res.meta) {
            const safeMeta = { ...res.meta };
            (safeMeta as any)._sourceAddon = addon.manifest.id;
            if (!safeMeta.id) safeMeta.id = id;
            return safeMeta;
        }
        return null;
    } catch (e) { return null; }
}