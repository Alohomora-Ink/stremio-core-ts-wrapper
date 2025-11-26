import { useCallback } from 'react';

import { ActionBuilder } from '../core/action-builder';
import { StateParser } from '../core/state-parser';
import { useCoreQuery } from './use-core-model';
import { useDispatch } from './use-dispatch';
import { useStremioCore } from './use-stremio-core';

import type { CtxState, LibraryItem, AddonDescriptor } from '../types/models';

function useCtxSelector<TResult>(select: (data: CtxState) => TResult) {
    // <CtxState, TResult> -> Input is CtxState, Output is TResult
    return useCoreQuery<CtxState, TResult>("ctx", StateParser.parseCtx, {
        select,
        staleTime: Infinity,
        gcTime: Infinity,
    });
}

/**
 * User Profile & Authentication State
 * Pattern: Ctx -> Profile
 */
export function useUserProfileCtx() {
    const { data } = useCtxSelector((state) => state.profile);
    return {
        profile: data,
        isAuthenticated: !!data && data._id !== "guest"
    };
}

/**
 * Installed Addons & Catalogs
 * Pattern: Ctx -> Addons
 */
export function useAddonsCtx() {
    const dispatch = useDispatch();

    // CHANGED: Explicit return type helps TS inference here
    const { data } = useCtxSelector<{ installed: AddonDescriptor[]; catalogs: AddonDescriptor[] }>((state) => ({
        installed: state.addons.installed,
        catalogs: state.addons.catalogs
    }));

    const syncAddons = useCallback(async () => {
        await dispatch(ActionBuilder.User.pullAddons(), "ctx");
    }, [dispatch]);

    return {
        installed: data?.installed ?? [],
        catalogs: data?.catalogs ?? [],
        syncAddons
    };
}

/**
 * Full Library Dictionary
 * Pattern: Ctx -> Library -> Items
 */
export function useLibraryItemsCtx() {
    const { data } = useCtxSelector((state) => state.library.items);
    return data ?? {};
}

/**
 * Single Library Item Selector
 * Pattern: Ctx -> Library -> Items[ID]
 */
export function useLibraryItemCtx(id: string): LibraryItem | undefined {
    const { data } = useCtxSelector((state) => state.library.items[id]);
    return data;
}

/**
 * User Notifications
 * Pattern: Ctx -> Notifications
 */
export function useNotificationsCtx() {
    const { data } = useCtxSelector((state) => state.notifications.items);
    return data ?? {};
}

/**
 * Global Sync/Loading State
 */
export function useCtxSyncState() {
    const { isAppSyncing } = useStremioCore();
    // We select a primitive boolean, easy for TS
    const { isLoading, error } = useCtxSelector((state) => !!state.profile);

    return {
        isLoading: isAppSyncing || isLoading,
        error
    };
}

export function useAuthActions() {
    const dispatch = useDispatch();
    const { transport, triggerAuthReload } = useStremioCore();

    const login = async (email: string, pass: string) => {
        await dispatch(ActionBuilder.Auth.login(email, pass), "ctx");
    };

    const logout = async () => {
        if (!transport) return;
        const handleNewState = (args: any) => {
            const changedModels = Array.isArray(args)
                ? args.map((m: any) => typeof m === 'string' ? m : m.model)
                : [args?.model];
            if (changedModels.includes("ctx")) {
                transport.events.off("NewState", handleNewState);
                triggerAuthReload("logout");
            }
        };
        transport.events.on("NewState", handleNewState);
        try {
            await dispatch(ActionBuilder.Auth.logout(), "ctx");
        } catch (e) {
            console.error("Logout failed", e);
            transport.events.off("NewState", handleNewState);
        }
    };

    const register = async (email: string, pass: string, consent: any) => {
        await dispatch(ActionBuilder.Auth.register(email, pass, consent), "ctx");
    };

    return { login, logout, register };
}

export function useAddonActions() {
    const dispatch = useDispatch();
    const installAddon = async (addon: any) => {
        await dispatch(ActionBuilder.Addons.install(addon), "ctx");
    };
    const uninstallAddon = async (transportUrl: string) => {
        await dispatch(ActionBuilder.Addons.uninstall(transportUrl), "ctx");
    };
    return { installAddon, uninstallAddon };
}