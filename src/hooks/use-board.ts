import { useCallback, useState, useEffect } from "react";
import { useCoreQuery } from "./use-core-model";
import { useDispatch } from "./use-dispatch";
import { StateParser } from "../core/state-parser";
import { ActionBuilder } from "../core/action-builder";
import { useStremioCore } from "./use-stremio-core";

export function useBoard() {
    const { transport } = useStremioCore();
    const { data, isLoading: isQueryLoading, error } = useCoreQuery("board", StateParser.parseBoard);
    const dispatch = useDispatch();
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (!transport) return;

        const handleNewState = (args: any) => {
            const changedModels = Array.isArray(args)
                ? args.map(m => typeof m === 'string' ? m : m.model)
                : [args?.model];

            if (changedModels.includes("board")) {
                setIsSyncing(false);
            }
        };

        transport.events.on("NewState", handleNewState);

        return () => {
            transport.events.off("NewState", handleNewState);
        };
    }, [transport]);

    const loadBoard = useCallback(async () => {
        setIsSyncing(true);
        try {
            await dispatch(ActionBuilder.Load.board([]), "board");
        } catch (e) {
            console.error("Failed to load board", e);
            setIsSyncing(false);
        }
    }, [dispatch]);

    return {
        catalogs: data?.catalogs || [],
        selected: data?.selected,
        isLoading: isQueryLoading || isSyncing,
        error,
        loadBoard
    };
}