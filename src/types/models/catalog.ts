import type { MetaItem } from "./meta-item";
import type { AddonDescriptor } from "./addon";

export interface Catalog {
    type: string;
    id: string;
    name: string;
    addon: AddonDescriptor;
    content: Loadable<MetaItem[]>;
}

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