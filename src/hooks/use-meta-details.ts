import { useEffect } from 'react';

import { ActionBuilder } from '../core/action-builder';
import { StateParser } from '../core/state-parser';
import { useCoreQuery } from './use-core-model';
import { useDispatch } from './use-dispatch';

export function useMetaDetails(type: string, id: string) {
    const dispatch = useDispatch();

    const { data, isLoading } = useCoreQuery("meta_details", StateParser.parseMetaDetails);
    useEffect(() => {
        if (type && id) {
            dispatch(ActionBuilder.Load.metaDetails(type, id), "meta_details");
        }
    }, [dispatch, type, id]);

    return {
        meta: data?.meta,
        libraryItem: data?.library_item,
        isLoading
    };
}