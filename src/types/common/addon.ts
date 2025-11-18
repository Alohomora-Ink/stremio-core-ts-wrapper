/**
 * Addon manifest describes an addon's capabilities
 */
export interface AddonManifest {
    id: string;
    name: string;
    description: string;
    version: string;
    resources: string[];
    types: string[];
    catalogs?: Array<{
        id: string;
        name: string;
        type: string;
        extra?: Array<{
            name: string;
            isRequired?: boolean;
            options?: string[];
            optionsLimit?: number;
        }>;
    }>;
    idPrefixes?: string[];
    behaviorHints?: {
        adult?: boolean;
        p2p?: boolean;
    };
}

/**
 * Full addon descriptor with transport URL
 */
export interface AddonDescriptor {
    transportUrl: string;
    manifest: AddonManifest;
    flags?: {
        official?: boolean;
        protected?: boolean;
    };
}