import type { MetaItem } from "./meta-item";
import type { AddonDescriptor } from "./addon";

export interface Catalog {
    type: string; // "movie", "series"
    id: string;   // "top", "year"
    name: string; // "Popular", "New"
    addon: AddonDescriptor;
    content: Loadable<MetaItem[]>;
}

// Core uses a specific Loadable pattern for async data
export type Loadable<T> =
    | { type: "Ready"; content: T }
    | { type: "Loading" }
    | { type: "Err"; error: string };

export interface BoardState {
    catalogs: Catalog[];
    selected?: {
        id: string;
        type: string;
    };
}