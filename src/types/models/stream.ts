/**
 * Stream represents a playable source for content
 */
export interface Stream {
    /** Unique identifier for the stream */
    infoHash?: string;
    fileIdx?: number;

    /** Direct URL to stream */
    url?: string;

    /** YouTube video ID */
    ytId?: string;

    /** External URL (opens in browser) */
    externalUrl?: string;

    /** Display name */
    name?: string;

    /** Stream title */
    title?: string;

    /** Description */
    description?: string;

    /** Source addon */
    source?: string;

    /** Subtitles */
    subtitles?: Array<{
        id: string;
        url: string;
        lang: string;
    }>;

    /** Behavior hints */
    behaviorHints?: {
        notWebReady?: boolean;
        bingeGroup?: string;
        countryWhitelist?: string[];
    };
}