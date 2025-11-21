import { useCoreQuery } from "./use-core-model";
import { useDispatch } from "./use-dispatch";
import { StateParser } from "../core/state-parser";
import { ActionBuilder } from "../core/action-builder";
import type { MetaItem } from "../types/models/meta-item";

export function useLibrary() {
    const { data, isLoading, error } = useCoreQuery("library", StateParser.parseLibrary);
    const dispatch = useDispatch();

    const addToLibrary = async (item: MetaItem) => {
        await dispatch(ActionBuilder.Library.addItem(item), "ctx");
    };

    const removeFromLibrary = async (id: string) => {
        await dispatch(ActionBuilder.Library.removeItem(id), "ctx");
    };

    const toggleNotifications = async (id: string) => {
        await dispatch(ActionBuilder.Library.toggleNotifications(id), "ctx");
    };

    const loadLibraryPage = async (type: string | null = null, sort: "lastwatched" | "name" | "timeswatched" = "lastwatched", page = 1) => {
        await dispatch(ActionBuilder.Load.library(type, sort, page), "library");
    };

    return {
        items: data || [],
        isLoading,
        error,
        addToLibrary,
        removeFromLibrary,
        toggleNotifications,
        loadLibraryPage
    };
}