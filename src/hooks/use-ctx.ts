import { useEffect, useRef, useState } from 'react';

import { ActionBuilder } from '../core/action-builder';
import { StateParser } from '../core/state-parser';
import { useCoreQuery } from './use-core-model';
import { useDispatch } from './use-dispatch';
import { useStremioCore } from './use-stremio-core';

export function useCtx() {
    const { isAppSyncing } = useStremioCore();
    const { data, isLoading: isQueryLoading, error } = useCoreQuery("ctx", StateParser.parseCtx);
    const dispatch = useDispatch();
    const profile = data?.profile ?? null;
    const isAuthenticated = !!profile && profile._id !== "guest";

    const addons = data?.addons.installed ?? [];

    const syncAddons = async () => {
        await dispatch(ActionBuilder.User.pullAddons(), "ctx");
    };

    return {
        profile,
        isAuthenticated,
        addons,
        isLoading: isAppSyncing || isQueryLoading,
        error,
        syncAddons,
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
        // 1. Listen for completion
        const handleNewState = (args: any) => {
            const changedModels = Array.isArray(args) ? args.map(m => typeof m === 'string' ? m : m.model) : [args?.model];
            if (changedModels.includes("ctx")) {
                // Ctx updated -> Logout processed -> SPLASH
                transport.events.off("NewState", handleNewState);
                triggerAuthReload("logout");
            }
        };
        transport.events.on("NewState", handleNewState);
        // 2. Dispatch
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
    const installAddon = async (addon: any) => { await dispatch(ActionBuilder.Addons.install(addon), "ctx"); };
    const uninstallAddon = async (transportUrl: string) => { await dispatch(ActionBuilder.Addons.uninstall(transportUrl), "ctx"); };
    return { installAddon, uninstallAddon };
}