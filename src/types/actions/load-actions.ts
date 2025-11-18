/**
 * Load actions - initialize models
 */
export type ActionLoad =
    | 'Ctx'
    | 'Library'
    | 'Board'
    | 'Discover'
    | 'ContinueWatchingPreview'
    | { MetaDetails: { type: string; id: string } }
    | { Streams: { type: string; id: string } };

/**
 * Top-level Load action
 */
export type LoadAction = {
    Load: ActionLoad;
};