import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { StateParser } from '../core/state-parser';
import type { CtxState } from '../types/models/ctx';
import { useStremioCore } from './use-stremio-core';

/**
 * Hook to query Context state
 * Uses TanStack Query for caching and automatic refetching
 */
export function useCtxState(options?: Omit<UseQueryOptions<CtxState>, 'queryKey' | 'queryFn'>) {
    const { core } = useStremioCore();

    return useQuery({
        queryKey: ['stremio-core', 'ctx'],
        queryFn: () => {
            if (!core) throw new Error('Stremio Core not initialized');
            const rawState = core.get_state('ctx');
            return StateParser.parseCtx(rawState);
        },
        enabled: !!core,
        staleTime: 5000, 
        ...options
    });
}

/**
 * Hook to check if user is authenticated
 */
export function useAuth() {
    const { data: ctx, isLoading } = useCtxState();

    return {
        isAuthenticated: !!ctx?.profile,
        profile: ctx?.profile,
        isLoading
    };
}

/**
 * Hook to access user's library
 */
export function useLibrary() {
    const { data: ctx, isLoading } = useCtxState();

    return {
        items: ctx?.library.items || [],
        isLoading
    };
}

/**
 * Hook to access installed addons
 */
export function useAddons() {
    const { data: ctx, isLoading } = useCtxState();

    return {
        catalogs: ctx?.addons.catalogs || [],
        isLoading
    };
}