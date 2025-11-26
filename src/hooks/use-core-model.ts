import { useEffect } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { coreKeys } from '../queries/keys';
import { useStremioCore } from './use-stremio-core';

export function useCoreQuery<TModel, TResult = TModel>(
    modelName: string,
    parser: (raw: any) => TModel,
    options?: Omit<UseQueryOptions<TModel, Error, TResult>, 'queryKey' | 'queryFn'>
) {
    const { transport } = useStremioCore();
    const queryClient = useQueryClient();
    const queryKey = coreKeys.model(modelName);

    const queryResult = useQuery<TModel, Error, TResult>({
        queryKey,
        queryFn: async () => {
            if (!transport) throw new Error("Core not initialized");
            try {
                const raw = await transport.getState(modelName);
                return parser(raw);
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
                queryClient.invalidateQueries({ queryKey });
            }
        };

        transport.events.on("NewState", handleNewState);
        return () => {
            transport.events.off("NewState", handleNewState);
        };
    }, [transport, modelName, queryClient, queryKey]);

    return queryResult;
}