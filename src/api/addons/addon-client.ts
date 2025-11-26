import { AddonParser } from './addon-parser';

import type { AddonManifest } from "../../types/models/addon";
import type { MetaItem } from "../../types/models/meta-item";
import type { Stream } from "../../types/models/stream";

export class AddonClient {
    private static DEFAULT_TIMEOUT = 8000;

    private static normalizeUrl(url: string): string {
        if (!url) return "";
        if (url.startsWith("stremio://")) {
            return url.replace("stremio://", "https://");
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        return `https://${url}`;
    }

    /**
     * CORRECTED URL BUILDER
     * Now encodes the ID segment to prevent path parsing issues with colons.
     */
    private static buildAddonUrl(
        transportUrl: string,
        resource: 'meta' | 'catalog' | 'stream',
        type: string,
        id: string,
        extra?: Record<string, string>
    ): string {
        // 1. Get API Base
        const apiBase = this.normalizeUrl(transportUrl).replace(/\/manifest.json$/, '');

        // 2. Encode ID (tmdb:123 -> tmdb%3A123)
        const encodedId = encodeURIComponent(id);

        // 3. Build Path
        let resourcePath = `/${resource}/${type}/${encodedId}.json`;

        // 4. Handle Extra Params
        if (resource === 'catalog' && extra && Object.keys(extra).length > 0) {
            const params = Object.entries(extra)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join("&");
            resourcePath = resourcePath.replace('.json', `/${params}.json`);
        }

        return `${apiBase}${resourcePath}`;
    }

    private static async smartFetch(url: string): Promise<any> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

        try {
            // 1. Direct Fetch
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                return await response.json();
            }
            // If 404/500, don't try proxy, it's a real error.
            // Only try proxy if network error or CORS (which throws).
            if (response.status >= 400) {
                console.warn(`Direct fetch error ${response.status} for ${url}`);
                return null;
            }
        } catch (directError) {
            clearTimeout(timeoutId);
            // console.log("Direct fetch failed, trying proxy:", url);

            // 2. Proxy Fetch
            try {
                const proxyUrl = `/api/routes?q=${encodeURIComponent(url)}`;
                const proxyController = new AbortController();
                const proxyTimeoutId = setTimeout(() => proxyController.abort(), this.DEFAULT_TIMEOUT);

                const proxyResponse = await fetch(proxyUrl, { signal: proxyController.signal });
                clearTimeout(proxyTimeoutId);

                if (!proxyResponse.ok) return null;

                const text = await proxyResponse.text();
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error("Proxy returned non-JSON:", text.substring(0, 50));
                    return null;
                }
            } catch (proxyError) {
                return null;
            }
        }
        return null;
    }

    static async getManifest(addonUrl: string): Promise<AddonManifest | null> {
        const baseUrl = this.normalizeUrl(addonUrl);
        const url = baseUrl.endsWith("/manifest.json") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/manifest.json`;
        const json = await this.smartFetch(url);
        if (!json) return null;
        try {
            return AddonParser.parseManifest(json);
        } catch (e) {
            return null;
        }
    }

    static async getCatalog(
        addonTransportUrl: string, type: string, id: string, extra?: Record<string, string>
    ): Promise<{ metas: MetaItem[] }> {
        const url = this.buildAddonUrl(addonTransportUrl, 'catalog', type, id, extra);
        const json = await this.smartFetch(url);
        if (!json) return { metas: [] };
        return { metas: AddonParser.parseCatalogResponse(json) };
    }

    static async getMeta(
        addonTransportUrl: string, type: string, id: string
    ): Promise<{ meta: MetaItem | null }> {
        const url = this.buildAddonUrl(addonTransportUrl, 'meta', type, id);
        const json = await this.smartFetch(url);
        if (!json) return { meta: null };
        try {
            return { meta: AddonParser.parseMetaResponse(json) };
        } catch (e) {
            return { meta: null };
        }
    }

    static async getStreams(
        addonTransportUrl: string, type: string, id: string
    ): Promise<{ streams: Stream[] }> {
        const url = this.buildAddonUrl(addonTransportUrl, 'stream', type, id);
        const json = await this.smartFetch(url);
        if (!json) return { streams: [] };
        return { streams: AddonParser.parseStreamResponse(json) };
    }
}