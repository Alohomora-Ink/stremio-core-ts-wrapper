export interface CatalogRequest {
    base: string; // Addon URL
    path: {
        resource: string;
        type: string;
        id: string;
        extra: { name: string; value: string }[];
    };
}

export interface LibraryRequest {
    type: string | null;
    sort: "lastwatched" | "name" | "timeswatched";
    page: number;
}