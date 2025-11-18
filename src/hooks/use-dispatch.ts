import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActionBuilder } from '../core/action-builder';
import type { MetaItem } from '../types/common/meta-item';
import type { AddonDescriptor } from '../types/common/addon';
import { useStremioCore } from './use-stremio-core';

/**
 * Hook for library-related actions
 */
export function useLibraryActions() {
    const { core } = useStremioCore();
    const queryClient = useQueryClient();

    const addToLibrary = useCallback(async (item: MetaItem) => {
        if (!core) throw new Error('Core not initialized');

        const action = ActionBuilder.addToLibrary(item);
        core.dispatch(action);

        // Invalidate to trigger refetch
        await queryClient.invalidateQueries({ queryKey: ['stremio-core', 'ctx'] });
    }, [core, queryClient]);

    const removeFromLibrary = useCallback(async (id: string) => {
        if (!core) throw new Error('Core not initialized');

        const action = ActionBuilder.removeFromLibrary(id);
        core.dispatch(action);

        await queryClient.invalidateQueries({ queryKey: ['stremio-core', 'ctx'] });
    }, [core, queryClient]);

    const toggleNotifications = useCallback(async (id: string) => {
        if (!core) throw new Error('Core not initialized');

        const action = ActionBuilder.toggleNotifications(id);
        core.dispatch(action);

        await queryClient.invalidateQueries({ queryKey: ['stremio-core', 'ctx'] });
    }, [core, queryClient]);

    return { addToLibrary, removeFromLibrary, toggleNotifications };
}

/**
 * Hook for addon management actions
 */
export function useAddonActions() {
    const { core } = useStremioCore();
    const queryClient = useQueryClient();

    const installAddon = useCallback(async (descriptor: AddonDescriptor) => {
        if (!core) throw new Error('Core not initialized');

        const action = ActionBuilder.installAddon(descriptor);
        core.dispatch(action);

        await queryClient.invalidateQueries({ queryKey: ['stremio-core', 'ctx'] });
    }, [core, queryClient]);

    const uninstallAddon = useCallback(async (transportUrl: string) => {
        if (!core) throw new Error('Core not initialized');

        const action = ActionBuilder.uninstallAddon(transportUrl);
        core.dispatch(action);

        await queryClient.invalidateQueries({ queryKey: ['stremio-core', 'ctx'] });
    }, [core, queryClient]);

    return { installAddon, uninstallAddon };
}

/**
 * Hook for authentication actions
 */
export function useAuthActions() {
    const { core } = useStremioCore();
    const queryClient = useQueryClient();

    const login = useCallback(async (email: string, password: string) => {
        if (!core) throw new Error('Core not initialized');

        const action = ActionBuilder.login(email, password);
        core.dispatch(action);

        await queryClient.invalidateQueries({ queryKey: ['stremio-core'] });
    }, [core, queryClient]);

    const logout = useCallback(async () => {
        if (!core) throw new Error('Core not initialized');

        const action = ActionBuilder.logout();
        core.dispatch(action);

        await queryClient.invalidateQueries({ queryKey: ['stremio-core'] });
    }, [core, queryClient]);

    return { login, logout };
}