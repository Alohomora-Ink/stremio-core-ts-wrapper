import { AddonManifest } from '../../types/models/addon';
import { MetaItem } from '../../types/models/meta-item';
import { Stream } from '../../types/models/stream';

export class AddonParser {

    static parseManifest(raw: any): AddonManifest {
        if (!raw || typeof raw !== 'object') throw new Error("Invalid manifest");

        return {
            id: raw.id || "",
            name: raw.name || "Unknown Addon",
            description: raw.description || "",
            version: raw.version || "0.0.0",
            resources: Array.isArray(raw.resources) ? raw.resources : [],
            types: Array.isArray(raw.types) ? raw.types : [],
            catalogs: Array.isArray(raw.catalogs) ? raw.catalogs : [],
            idPrefixes: raw.idPrefixes,
            behaviorHints: raw.behaviorHints
        };
    }

    static parseCatalogResponse(raw: any): MetaItem[] {
        if (!raw || !Array.isArray(raw.metas)) return [];
        // We can reuse the robust MetaItem parsing logic if needed, 
        // but for now we trust the basic shape matches our interfaces
        // or map it strictly if we want to be 100% safe.
        // TODO : Remaping
        return raw.metas;
    }

    static parseMetaResponse(raw: any): MetaItem {
        if (!raw || !raw.meta) throw new Error("Invalid meta response");
        return raw.meta;
    }

    static parseStreamResponse(raw: any): Stream[] {
        if (!raw || !Array.isArray(raw.streams)) return [];
        return raw.streams;
    }
}