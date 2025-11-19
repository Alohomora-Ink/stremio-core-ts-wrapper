import { useCoreQuery } from "./use-core-model"; // Updated import
import { useDispatch } from "./use-dispatch";
import { StateParser } from "../core/state-parser";
import { ActionBuilder } from "../core/action-builder";
import type { AddonDescriptor } from "../types/common/addon";

export function useCtx() {
    const { data, isLoading, error } = useCoreQuery("ctx", StateParser.parseCtx);
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
        isLoading,
        error,
        syncAddons,
    };
}

export function useAuthActions() {
    const dispatch = useDispatch();

    const login = async (email: string, pass: string) => {
        await dispatch(ActionBuilder.Auth.login(email, pass), "ctx");
    };

    const logout = async () => {
        await dispatch(ActionBuilder.Auth.logout(), "ctx");
    };

    const register = async (email: string, pass: string, consent: any) => {
        await dispatch(ActionBuilder.Auth.register(email, pass, consent), "ctx");
    };

    return { login, logout, register };
}

export function useAddonActions() {
    const dispatch = useDispatch();

    const installAddon = async (addon: AddonDescriptor) => {
        await dispatch(ActionBuilder.Addons.install(addon), "ctx");
    };

    const uninstallAddon = async (transportUrl: string) => {
        await dispatch(ActionBuilder.Addons.uninstall(transportUrl), "ctx");
    };

    return { installAddon, uninstallAddon };
}