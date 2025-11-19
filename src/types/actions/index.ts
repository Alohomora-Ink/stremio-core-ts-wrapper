import type { ActionCtx } from "./ctx";
import type { ActionLoad } from "./load";
import type { ActionPlayer } from "./player";
import type { ActionStreamingServer } from "./streaming-server";

// Export sub-types for ease of use
export * from "./ctx";
export * from "./load";
export * from "./player";
export * from "./streaming-server";

// --- ROOT ACTION ---
export type Action =
    | { Ctx: ActionCtx }
    | { Player: ActionPlayer }
    | { StreamingServer: ActionStreamingServer }
    | { Load: ActionLoad }
    | { Addon: { transport_url: string; action: "Delete" } }
    | "Unload";