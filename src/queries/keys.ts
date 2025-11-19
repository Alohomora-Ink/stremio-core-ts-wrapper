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
    discover: (resource: string, type: string, id: string) =>
        [...coreKeys.all, "discover", resource, type, id] as const,
};