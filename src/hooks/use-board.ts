import { useCoreQuery } from "./use-core-model"; // Note the new import
import { useDispatch } from "./use-dispatch";
import { StateParser } from "../core/state-parser";
import { ActionBuilder } from "../core/action-builder";
import { useCallback } from "react";

export function useBoard() {
    const { data, isLoading, error } = useCoreQuery("board", StateParser.parseBoard);
    const dispatch = useDispatch();

    const loadBoard = useCallback(async () => {
        await dispatch(ActionBuilder.Load.board([]), "board");
    }, [dispatch]);

    return {
        catalogs: data?.catalogs || [],
        selected: data?.selected,
        isLoading,
        error,
        loadBoard
    };
}