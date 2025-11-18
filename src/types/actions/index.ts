import type { CtxAction } from './ctx-actions';
import type { LoadAction } from './load-actions';

/**
 * All possible actions that can be dispatched to Stremio Core
 */
export type Action =
    | LoadAction
    | CtxAction
    | 'Unload';

export * from './ctx-actions';
export * from './load-actions';