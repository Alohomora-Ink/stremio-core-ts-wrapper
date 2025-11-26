export interface LibraryItemState {
    lastWatched?: string;
    timeWatched: number;
    timeOffset: number;
    overallTimeWatched: number;
    timesWatched: number;
    flaggedWatched: number | boolean;
    duration: number;
    video_id?: string;
    season?: number;
    episode?: number;
    watched?: string;
    noNotif: boolean;
}

export interface LibraryItem {
    _id: string;
    name: string;
    type: string;
    poster?: string;
    posterShape?: "poster" | "landscape" | "square";
    removed: boolean;
    temp: boolean;
    _ctime?: string;
    _mtime?: string;
    state: LibraryItemState;
    behaviorHints?: {
        defaultVideoId?: string;
    };

    // --- ADD THESE ---
    imdb_id?: string;
    moviedb_id?: number;
    kitsu_id?: number | string; // Kitsu often uses string in ID but number in prop
}

export interface LibraryState {
    items: Record<string, LibraryItem>;
}