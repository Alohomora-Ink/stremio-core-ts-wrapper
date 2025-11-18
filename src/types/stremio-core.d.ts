declare module '@stremio/stremio-core-web' {
    // Core types
    export interface MetaItem {
        id: string;
        type: 'movie' | 'series' | 'channel' | 'tv';
        name: string;
        poster?: string;
        posterShape?: 'poster' | 'landscape' | 'square';
        background?: string;
        logo?: string;
        description?: string;
        releaseInfo?: string;
        runtime?: string;
        released?: string;
        genres?: string[];
        director?: string[];
        cast?: string[];
        imdbRating?: string;
        country?: string;
        inLibrary?: boolean;
        trailers?: Array<{ source: string; type: string }>;
        behaviorHints?: {
            defaultVideoId?: string;
        };
    }

    export interface CatalogEntry {
        name: string;
        type: string;
        id: string;
    }

    export interface AddonDescriptor {
        transportUrl: string;
        manifest: {
            id: string;
            name: string;
            description: string;
            version: string;
            resources: string[];
            types: string[];
            catalogs?: CatalogEntry[];
        };
    }

    // Model state structures
    export interface CatalogWithExtraState {
        catalogs?: Array<{
            title: string;
            content: {
                type: 'Ready';
                content: MetaItem[];
            } | {
                type: 'Loading';
            } | {
                type: 'Err';
                error: string;
            };
        }>;
    }

    export interface CtxContent {
        addons?: {
            catalogs: AddonDescriptor[];
        };
    }

    export interface Ctx {
        content: CtxContent;
    }

    // Core interface - dispatch takes a JSON STRING, not an object
    export interface StremioCore {
        get_state(model: string): any;
        dispatch(action: string): void;
    }

    export type StremioCoreFn = () => Promise<StremioCore>;

    const StremioCore: StremioCoreFn;
    export default StremioCore;
}