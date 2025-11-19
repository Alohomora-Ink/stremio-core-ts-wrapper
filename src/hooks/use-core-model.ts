import { useEffect } from "react";
import { useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useStremioCore } from "./use-stremio-core";
import { coreKeys } from "../queries/keys";

export function useCoreQuery<T>(
    modelName: string,
    parser: (raw: any) => T,
    options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
    const { transport } = useStremioCore();
    const queryClient = useQueryClient();
    const queryKey = coreKeys.model(modelName);

    const queryResult = useQuery({
        queryKey,
        queryFn: async () => {
            if (!transport) throw new Error("Core not initialized");

            console.log(`[useCoreQuery] Fetching state for: ${modelName}`);

            try {
                const raw = await transport.getState(modelName);
                console.log(`[useCoreQuery] Raw data for ${modelName}:`, raw);

                const parsed = parser(raw);
                console.log(`[useCoreQuery] Parsed data for ${modelName}:`, parsed);

                return parsed;
            } catch (e) {
                console.error(`[useCoreQuery] Error fetching ${modelName}:`, e);
                throw e;
            }
        },
        enabled: !!transport,
        staleTime: Infinity,
        gcTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        ...options
    });

    useEffect(() => {
        if (!transport) return;

        const handleNewState = (args: any) => {
            let changedModels: string[] = [];

            if (Array.isArray(args)) {
                changedModels = args.map((m) => (typeof m === "string" ? m : m.model));
            } else if (args?.model) {
                changedModels = [args.model];
            }

            if (changedModels.includes(modelName) || changedModels.includes("ctx")) {
                console.log(`[useCoreQuery] Invalidate ${modelName} due to NewState:`, changedModels);
                queryClient.invalidateQueries({ queryKey });
            }
        };

        transport.events.on("NewState", handleNewState);

        return () => {
            transport.events.off("NewState", handleNewState);
        };
    }, [transport, modelName, queryClient, queryKey]);

    useEffect(() => {
        if (queryResult.error) {
            console.error(`[useCoreQuery] Query Error (${modelName}):`, queryResult.error);
        }
        if (queryResult.data === undefined && !queryResult.isLoading) {
            console.warn(`[useCoreQuery] Query returned undefined data for ${modelName}`);
        }
    }, [queryResult.data, queryResult.error, queryResult.isLoading, modelName]);

    return queryResult;
}