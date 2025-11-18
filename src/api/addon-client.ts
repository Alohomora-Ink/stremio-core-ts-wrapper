import type { MetaItem } from '../types/common/meta-item';
import type { Stream } from '../types/common/stream';
import type { AddonManifest } from '../types/common/addon';

/**
 * HTTP client for fetching data from Stremio addons
 * Stremio Core doesn't provide transport
 */
export class AddonClient {
    /**
     * Fetch addon manifest
     */
    static async getManifest(addonUrl: string): Promise<AddonManifest> {
        const url = `${addonUrl}/manifest.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch manifest: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Fetch catalog
     */
    static async getCatalog(
        addonUrl: string,
        type: string,
        id: string,
        extra?: Record<string, string>
    ): Promise<{ metas: MetaItem[] }> {
        let url = `${addonUrl}/catalog/${type}/${id}`;

        if (extra) {
            const params = new URLSearchParams(extra);
            url += `.json?${params.toString()}`;
        } else {
            url += '.json';
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch catalog: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Fetch meta details
     */
    static async getMeta(
        addonUrl: string,
        type: string,
        id: string
    ): Promise<{ meta: MetaItem }> {
        const url = `${addonUrl}/meta/${type}/${id}.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch meta: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Fetch streams
     */
    static async getStreams(
        addonUrl: string,
        type: string,
        id: string
    ): Promise<{ streams: Stream[] }> {
        const url = `${addonUrl}/stream/${type}/${id}.json`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch streams: ${response.statusText}`);
        }
        return response.json();
    }
}