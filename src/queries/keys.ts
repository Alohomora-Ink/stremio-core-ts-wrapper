/**
 * Centralized Query Key Factory
 * Ensures consistent cache management and invalidation across the app.
 */
export const coreKeys = {
    all: ["stremio-core"] as const,
    model: (modelName: string) => [...coreKeys.all, "model", modelName] as const,
    ctx: () => coreKeys.model("ctx"),
    board: () => coreKeys.model("board"),
    library: () => coreKeys.model("library"),
    addon: {
        all: () => [...coreKeys.all, "addon"] as const,
        manifest: (transportUrl: string) => [...coreKeys.addon.all(), "manifest", transportUrl] as const,
        catalog: (transportUrl: string, type: string, id: string, extra: string) =>
            [...coreKeys.addon.all(), "catalog", transportUrl, type, id, extra] as const,
        meta: (transportUrl: string, type: string, id: string) =>
            [...coreKeys.addon.all(), "meta", transportUrl, type, id] as const,
        stream: (transportUrl: string, type: string, id: string) =>
            [...coreKeys.addon.all(), "stream", transportUrl, type, id] as const,
    }
};      