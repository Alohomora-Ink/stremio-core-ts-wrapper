export interface LibraryItemState {
    lastWatched?: string; // ISO Date
    timeWatched: number;
    timeOffset: number;
    overallTimeWatched: number;
    timesWatched: number;
    flaggedWatched: boolean;
    duration: number;
    video_id?: string;
    season?: number;
    episode?: number;
}

export interface LibraryItem {
    _id: string;
    name: string;
    type: "movie" | "series" | "channel" | "tv" | "other";
    poster?: string;
    posterShape?: "poster" | "landscape" | "square";
    removed: boolean;
    temp: boolean;
    _ctime: string;
    _mtime: string;
    state: LibraryItemState;
    behaviorHints?: {
        defaultVideoId?: string;
    };
}

// The structure returned by get_state('library')
export interface LibraryState {
    items: Record<string, LibraryItem>; // ID -> Item mapping
    // Core often returns these lists for sorting
    sorted?: string[];
}