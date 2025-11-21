import { AddonParser } from './addon-parser';

import type { AddonManifest } from "../../types/models/addon";
import type { MetaItem } from "../../types/models/meta-item";
import type { Stream } from "../../types/models/stream";

export class AddonClient {
    /**
     * Normalizes Stremio protocol URLs to HTTPS
     */
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
     * SMART FETCH: Direct -> Next.js Proxy -> Fail
     */
    private static async smartFetch(url: string): Promise<any> {
        try {
            // 1. Try Direct Fetch
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Direct fetch failed: ${response.status}`);
            return await response.json();
        } catch (directError) {
            console.warn(`[AddonClient] Direct fetch failed for ${url}, trying local proxy...`);

            // 2. Try via Next.js API Proxy
            try {
                const proxyUrl = `/api/proxy?q=${encodeURIComponent(url)}`;

                const proxyResponse = await fetch(proxyUrl);
                if (!proxyResponse.ok) throw new Error(`Proxy fetch failed: ${proxyResponse.status}`);
                return await proxyResponse.json();
            } catch (proxyError) {
                console.error(`[AddonClient] All fetch methods failed for ${url}`);
                throw directError;
            }
        }
    }

    static async getManifest(addonUrl: string): Promise<AddonManifest> {
        const baseUrl = this.normalizeUrl(addonUrl);
        const url = baseUrl.endsWith("manifest.json")
            ? baseUrl
            : `${baseUrl.replace(/\/$/, "")}/manifest.json`;

        const json = await this.smartFetch(url);
        return AddonParser.parseManifest(json);
    }

    static async getCatalog(
        addonTransportUrl: string,
        type: string,
        id: string,
        extra?: Record<string, string>
    ): Promise<{ metas: MetaItem[] }> {
        const baseUrl = this.normalizeUrl(addonTransportUrl).replace("/manifest.json", "");
        let path = `/catalog/${type}/${id}`;

        if (extra && Object.keys(extra).length > 0) {
            const params = Object.entries(extra)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join("&");
            path += `/${params}.json`;
        } else {
            path += ".json";
        }

        const url = `${baseUrl}${path}`;
        const json = await this.smartFetch(url);

        return { metas: AddonParser.parseCatalogResponse(json) };
    }

    static async getMeta(
        addonTransportUrl: string,
        type: string,
        id: string
    ): Promise<{ meta: MetaItem }> {
        const baseUrl = this.normalizeUrl(addonTransportUrl).replace("/manifest.json", "");
        const url = `${baseUrl}/meta/${type}/${id}.json`;
        const json = await this.smartFetch(url);
        return { meta: AddonParser.parseMetaResponse(json) };
    }

    static async getStreams(
        addonTransportUrl: string,
        type: string,
        id: string
    ): Promise<{ streams: Stream[] }> {
        const baseUrl = this.normalizeUrl(addonTransportUrl).replace("/manifest.json", "");
        const url = `${baseUrl}/stream/${type}/${id}.json`;
        const json = await this.smartFetch(url);
        return { streams: AddonParser.parseStreamResponse(json) };
    }
}