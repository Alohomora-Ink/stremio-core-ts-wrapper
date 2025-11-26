import type { AddonDescriptor } from "../../types/models/addon";

export function getEligibleMetaAddons(
    addons: AddonDescriptor[],
    type: string,
    id: string
): AddonDescriptor[] {
    return addons.filter((addon) => {
        const manifest = addon.manifest;

        // 1. Check Resource Support
        const hasMetaResource = manifest.resources.some(r =>
            r === "meta" || (typeof r === "object" && (r as any).name === "meta")
        );
        if (!hasMetaResource) return false;

        // 2. Check Type Support
        const supportsType = manifest.types.includes(type);
        if (!supportsType) return false;

        // 3. Prefix Logic
        // If the addon declares prefixes, we check them. If not, we assume it supports everything.
        if (manifest.idPrefixes && Array.isArray(manifest.idPrefixes) && manifest.idPrefixes.length > 0) {
            const isStandardId = id.startsWith("tt") || id.startsWith("tmdb");

            if (isStandardId) {
                // SPECIAL CASE: TT and TMDB are treated as "Standard" IDs.
                // If the ID is tt... or tmdb..., we use ANY addon that supports EITHER tt or tmdb.
                const supportsStandard = manifest.idPrefixes.some(prefix =>
                    prefix === "tt" || prefix === "tmdb"
                );
                if (!supportsStandard) return false;
            } else {
                // STRICT CASE: For Kitsu, Local, etc., exact prefix matching is required.
                const matchesPrefix = manifest.idPrefixes.some(prefix => id.startsWith(prefix));
                if (!matchesPrefix) return false;
            }
        }

        return true;
    });
}