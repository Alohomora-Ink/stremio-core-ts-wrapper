export interface MetaLink {
    name: string;
    category: string;
    url: string;
}

export interface MetaTrailer {
    source: string;
    type: string;
}

export interface MetaBehaviorHints {
    defaultVideoId?: string;
    hasScheduledVideos?: boolean;
    adult?: boolean;
    p2p?: boolean;
    configurable?: boolean;
    configurationRequired?: boolean;
}

export interface MetaVideoVariant {
    addonId: string;     // e.g. "org.stremio.cinemeta"
    rawVideo: MetaVideo;
}

export interface MetaVideo {
    id: string;
    name: string;
    released?: string;
    thumbnail?: string;

    // Series Specific
    season?: number;
    episode?: number;
    number?: number;
    watched?: boolean;

    // Details
    overview?: string;
    description?: string;
    rating?: string;
    runtime?: string;

    // IDs & Mapping (Crucial for Kitsu -> Cinemeta mapping)
    imdb_id?: string;
    imdbSeason?: number;
    imdbEpisode?: number;

    // Stream info
    streams?: any[];
    upcoming?: boolean;

    // --- THE BACKPACK ---
    _variants?: MetaVideoVariant[];
}

export interface MetaCastMember {
    name: string;
    character?: string;
    photo?: string | null;
    url?: string;
}

export interface MetaItem {
    // -- IDENTITY --
    _id: string;
    id: string;
    type: string; // "movie", "series", "anime", "channel", "tv"
    name: string;
    slug?: string;

    // -- EXTERNAL IDS --
    imdb_id?: string;
    moviedb_id?: number;
    kitsu_id?: string;

    // -- VISUALS --
    poster?: string;
    posterShape?: 'poster' | 'landscape' | 'square';
    background?: string;
    logo?: string;

    // -- DETAILS --
    description?: string;
    releaseInfo?: string;
    year?: string;
    runtime?: string;
    released?: string;
    status?: string;
    website?: string;
    language?: string;

    // -- RATINGS & METRICS --
    imdbRating?: string;
    userCount?: number;
    awards?: string;
    popularity?: number;

    // -- CLASSIFICATION --
    genres?: string[];
    genre?: string[];
    country?: string;
    ageRating?: string;

    // -- CREATIVE TEAM --
    director?: string[];
    writer?: string[];
    cast?: string[];

    // -- RICH DATA --
    links?: MetaLink[];
    trailers?: MetaTrailer[];
    trailerStreams?: Array<{ title: string; ytId: string }>;
    behaviorHints?: MetaBehaviorHints;
    videos?: MetaVideo[];

    // -- ADDON SPECIFIC EXTRAS --
    app_extras?: {
        cast?: MetaCastMember[];
        ratings?: Record<string, number>;
    };

    // -- INTERNAL / AGGREGATION FLAGS --
    _sourceAddon?: string;
    _aggregatedIds?: string[]; // List of all IDs merged into this item
}