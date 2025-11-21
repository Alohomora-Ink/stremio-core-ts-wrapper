export interface MetaLink {
    name: string;
    category: string;
    url: string;
}

export interface MetaTrailer {
    source: string;
    type: string; // "Trailer", "Teaser", etc.
}

export interface MetaBehaviorHints {
    defaultVideoId?: string;
    hasScheduledVideos?: boolean;
}

export interface MetaItem {
    // -- IDENTITY --
    id: string;
    type: string;
    name: string;
    slug?: string;

    // -- VISUALS --
    poster?: string;
    posterShape?: 'poster' | 'landscape' | 'square';
    background?: string;
    logo?: string;

    // -- DETAILS --
    description?: string;
    releaseInfo?: string; // "2023", "1999-2024"
    year?: string;        // Some addons use year instead of releaseInfo
    runtime?: string;     // "150 min"
    released?: string;    // ISO Date "2025-11-07..."

    // -- RATINGS --
    imdbRating?: string;
    awards?: string;      // "1 win & 2 nominations"

    // -- CLASSIFICATION --
    genres?: string[];
    country?: string;

    // -- CREATIVE TEAM (Simple Arrays) --
    director?: string[];
    cast?: string[];
    writer?: string[];

    // -- RICH DATA --
    links?: MetaLink[];       // The generic Stremio link structure (Cast, Directors, Genres)
    trailers?: MetaTrailer[]; // YouTube sources
    behaviorHints?: MetaBehaviorHints;

    // -- ADDON SPECIFIC EXTRAS --
    // TMDB/RPDB sometimes return specific extras
    app_extras?: {
        cast?: Array<{
            name: string;
            character?: string;
            photo?: string | null;
        }>;
    };
}