import { useQuery } from "@tanstack/react-query";
import { AddonClient } from "../api/addons/addon-client";
import { coreKeys } from "./keys";
import type { MetaItem } from "../types/models/meta-item";

interface UseCatalogOptions {
    transportUrl: string;
    type: string;
    id: string;
    extra?: Record<string, string>;
    enabled?: boolean;
}

export function useAddonCatalog({ transportUrl, type, id, extra, enabled = true }: UseCatalogOptions) {
    const extraKey = extra ? JSON.stringify(extra) : "{}";
    return useQuery({
        queryKey: coreKeys.addon.catalog(transportUrl, type, id, extraKey),
        queryFn: async () => {
            return await AddonClient.getCatalog(transportUrl, type, id, extra);
        },
        enabled: enabled && !!transportUrl,
        staleTime: 1000 * 60 * 30,
        select: (data) => data.metas,
    });
}

export function useAddonMeta(transportUrl: string, type: string, id: string) {
    return useQuery({
        queryKey: coreKeys.addon.meta(transportUrl, type, id),
        queryFn: () => AddonClient.getMeta(transportUrl, type, id),
        enabled: !!transportUrl && !!id,
        staleTime: 1000 * 60 * 60,
    });
}