import type { CatalogRequest, LibraryRequest } from "./requests";

export * from "./requests";

export type ActionLoad =
    | "Ctx"
    | {
        CatalogWithFilters: {
            request: CatalogRequest;
        };
    }
    | {
        CatalogsWithExtra: {
            extra: { name: string; value: string }[];
        };
    }
    | {
        LibraryWithFilters: {
            request: LibraryRequest;
        };
    }
    | {
        Calendar: {
            filters: any[];
            year: number;
            month: number;
        };
    }
    | {
        MetaDetails: {
            type: string;
            id: string;
            video_id?: string;
        };
    }
    | {
        Player: {
            type: string;
            id: string;
            video_id?: string;
            stream?: any; // TODO: Define strict Stream structure
        };
    };