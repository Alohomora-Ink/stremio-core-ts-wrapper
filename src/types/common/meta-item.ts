/**
 * MetaItem represents a piece of content (movie, series, channel, tv)
 * This is the core type returned by addon catalog and meta requests
 */
export interface MetaItem {
    /** Unique identifier (usually IMDB ID for movies/series) */
    id: string;

    /** Content type */
    type: 'movie' | 'series' | 'channel' | 'tv';

    /** Display name */
    name: string;

    /** Poster image URL */
    poster?: string;

    /** Poster shape hint */
    posterShape?: 'poster' | 'landscape' | 'square';

    /** Background image URL */
    background?: string;

    /** Logo image URL */
    logo?: string;

    /** Description/plot */
    description?: string;

    /** Release information (e.g., "2023") */
    releaseInfo?: string;

    /** Runtime (e.g., "2h 30min") */
    runtime?: string;

    /** Release date */
    released?: string;

    /** Genres */
    genres?: string[];

    /** Directors */
    director?: string[];

    /** Cast members */
    cast?: string[];

    /** IMDB rating */
    imdbRating?: string;

    /** Country of origin */
    country?: string;

    /** Whether this item is in user's library */
    inLibrary?: boolean;

    /** Trailer sources */
    trailers?: Array<{
        source: string;
        type: string;
    }>;

    /** Behavior hints for UI */
    behaviorHints?: {
        defaultVideoId?: string;
        hasScheduledVideos?: boolean;
    };
}