// Core functionality
export { ActionBuilder } from './core/action-builder';
export { StateParser } from './core/state-parser';
export { CoreTransport } from './core/core-transport';

// Types
export * from './types/common/meta-item';
export * from './types/common/stream';
export * from './types/common/addon';
export * from './types/models';
export * from './types/actions';

// Hooks
export * from './hooks/use-stremio-core';
export * from './hooks/use-dispatch';
// Domain Hooks
export * from './hooks/use-ctx';
export * from './hooks/use-library';
export * from './hooks/use-board';

// API (Legacy support)
export * from './api/addons/addon-client';
export * from './api/addons/addon-parser';

// Providers
export { StremioCoreProvider } from './providers/StremioCoreProvider';