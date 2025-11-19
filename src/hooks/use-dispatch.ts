import { useCallback } from "react";
import { useStremioCore } from "./use-stremio-core";
import { useQueryClient } from "@tanstack/react-query";

export function useDispatch() {
    const { transport } = useStremioCore();
    const queryClient = useQueryClient();

    const dispatch = useCallback(
        async (actionJson: string, modelName: string) => {
            if (!transport) {
                console.warn("⚠️ CoreTransport not ready, dispatch ignored:", actionJson);
                return;
            }

            try {
                const actionObj = JSON.parse(actionJson);
                console.log(`[useDispatch] ➡️ Dispatching to ${modelName}:`, actionObj);
                await transport.dispatch(actionObj, modelName);
                await queryClient.invalidateQueries({ queryKey: ["stremio-core", modelName] });

            } catch (e) {
                console.error("❌ Dispatch failed:", e);
                throw e;
            }
        },
        [transport, queryClient]
    );

    return dispatch;
}