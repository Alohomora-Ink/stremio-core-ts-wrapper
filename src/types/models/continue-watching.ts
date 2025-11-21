export interface ContinueWatchingItem {
    _id: string;
    id: string;
    name: string;
    type: "movie" | "series" | "channel" | "tv";
    poster?: string;
    posterShape?: "poster" | "landscape" | "square";
    progress: number;
    state: {
        videoId: string;
    };
}

export interface ContinueWatchingPreview {
    items: ContinueWatchingItem[];
}