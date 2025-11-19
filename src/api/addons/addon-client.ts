import { AddonParser } from "./addon-parser";
import type { AddonManifest } from "../../types/common/addon";
import type { MetaItem } from "../../types/common/meta-item";
import type { Stream } from "../../types/common/stream";

export class AddonClient {
    /**
     * Normalizes Stremio protocol URLs to HTTPS
     */
    private static normalizeUrl(url: string): string {
        if (!url) return ""; // Prevent crash
        if (url.startsWith("stremio://")) {
            return url.replace("stremio://", "https://");
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        return `https://${url}`;
    }

    /**
     * Fetches the manifest.json from an addon
     */
    static async getManifest(addonUrl: string): Promise<AddonManifest> {
        const baseUrl = this.normalizeUrl(addonUrl);
        // Handle case where url already ends in manifest.json
        const url = baseUrl.endsWith("manifest.json")
            ? baseUrl
            : `${baseUrl.replace(/\/$/, "")}/manifest.json`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.statusText}`);
        const json = await response.json();
        return AddonParser.parseManifest(json);
    }

    /**
     * Fetches a Catalog (List of items)
     * Pattern: /catalog/{type}/{id}.json
     * or: /catalog/{type}/{id}/skip={x}&genre={y}.json
     */
    static async getCatalog(
        addonTransportUrl: string,
        type: string,
        id: string,
        extra?: Record<string, string>
    ): Promise<{ metas: MetaItem[] }> {
        const baseUrl = this.normalizeUrl(addonTransportUrl).replace("/manifest.json", "");

        // Construct path
        let path = `/catalog/${type}/${id}`;

        // Handle extra parameters (skip, genre, search)
        if (extra && Object.keys(extra).length > 0) {
            // Stremio addon protocol uses path-based parameters for some legacy reasons,
            // but standard v3 is often key=value in the path component or query params.
            // Standard V3: /catalog/movie/top/genre=Action.json
            const params = Object.entries(extra)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join("&");

            path += `/${params}.json`;
        } else {
            path += ".json";
        }

        const url = `${baseUrl}${path}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch catalog: ${response.statusText}`);
        const json = await response.json();

        return { metas: AddonParser.parseCatalogResponse(json) };
    }

    /**
     * Fetches Meta Details (Single Item)
     * Pattern: /meta/{type}/{id}.json
     */
    static async getMeta(
        addonTransportUrl: string,
        type: string,
        id: string
    ): Promise<{ meta: MetaItem }> {
        const baseUrl = this.normalizeUrl(addonTransportUrl).replace("/manifest.json", "");
        const url = `${baseUrl}/meta/${type}/${id}.json`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch meta: ${response.statusText}`);
        const json = await response.json();

        return { meta: AddonParser.parseMetaResponse(json) };
    }

    /**
     * Fetches Streams
     * Pattern: /stream/{type}/{id}.json
     */
    static async getStreams(
        addonTransportUrl: string,
        type: string,
        id: string
    ): Promise<{ streams: Stream[] }> {
        const baseUrl = this.normalizeUrl(addonTransportUrl).replace("/manifest.json", "");
        const url = `${baseUrl}/stream/${type}/${id}.json`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch streams: ${response.statusText}`);
        const json = await response.json();

        return { streams: AddonParser.parseStreamResponse(json) };
    }
}