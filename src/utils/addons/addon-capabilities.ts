import type { AddonDescriptor } from "../../types/models";

export interface CatalogCapability {
    addonId: string;
    name: string;
    types: string[];
    hasFilter: boolean;
    filters: string[];
}

export const getCatalogCapabilities = (addons: AddonDescriptor[]): CatalogCapability[] => {
    return addons.flatMap(addon => {
        const catalogs = addon.manifest.catalogs || [];
        return catalogs.map(cat => ({
            addonId: addon.manifest.id,
            name: cat.name || addon.manifest.name,
            types: [cat.type],
            hasFilter: !!cat.extra,
            filters: cat.extra?.map(e => e.name) || []
        }));
    });
};