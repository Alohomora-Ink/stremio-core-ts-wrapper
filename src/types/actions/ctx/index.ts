import type { AddonDescriptor } from "../../models/addon";
import type { MetaItem } from "../../models/meta-item";
import type { AuthRequest } from "./auth";
import type { ProfileSettings } from "./settings";

export * from "./auth";
export * from "./settings";

export type ActionCtx =
    | { Authenticate: AuthRequest }
    | "Logout" // Unit variant
    | { InstallAddon: AddonDescriptor }
    | { UninstallAddon: string } // transportUrl
    | { UpgradeAddon: AddonDescriptor }
    | { PullAddonsFromAPI: Record<string, never> } // Empty object {}
    | { PullUserFromAPI: Record<string, never> }
    | { SyncLibraryWithAPI: Record<string, never> }
    | { AddToLibrary: MetaItem }
    | { RemoveFromLibrary: string } // id
    | { RewindLibraryItem: string } // id
    | { ToggleNotifications: string } // id
    | { UpdateSettings: ProfileSettings };