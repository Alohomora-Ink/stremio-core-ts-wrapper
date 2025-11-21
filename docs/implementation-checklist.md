# Stremio Core TypeScript Wrapper — Implementation Checklist

**Last Updated**: Current Build
**Version**: 0.5.0
**Status**: Active Development

This document tracks the implementation status of the `stremio-core-ts-wrapper`. It maps high-level features to specific file paths and architectural components (Types, Parsers, Actions, Hooks).

---

## 🟢 Phase 1: Core Infrastructure (Completed)

The foundational layer handling WebAssembly communication, worker management, and React integration.

- [x] **Core Transport Layer**
  - _Description_: Low-level bridge between JS Main Thread and Web Worker.
  - _Implementation_: `src/core/core-transport.ts`
  - _Key Features_:
    - Worker instantiation (`public/worker.js`).
    - Promise-based `dispatch` and `getState`.
    - Event bridging (`EventEmitter` for `NewState`, `CoreEvent`).
    - Initialization handshake with `appVersion`/`shellVersion`.

- [x] **React Provider System**
  - _Description_: Global context provider managing the core lifecycle.
  - _Implementation_: `src/providers/StremioCoreProvider.tsx`
  - _Key Features_:
    - Automatic bootstrap (User Pull, Library Sync).
    - Proxy enforcement logic (auto-corrects `streamingServerUrl`).
    - Authentication state transition handling (Splash screen triggers).
    - Global error boundary for Core failures.

- [x] **Debug Center**
  - _Description_: Comprehensive visual debugging tool.
  - _Implementation_: `src/debug/components/StremioCoreWebDebugCenter.tsx`
  - _Key Features_:
    - Live State Inspector (JSON Tree).
    - Event Log & Action History.
    - Manual Action Dispatcher.
    - Auth & Stream Decoding simulators.

---

## 🟡 Phase 2: Core Models & State Management

Mapping Rust Core models to TypeScript interfaces, parsers, and hooks.

### 2.1 Global Context (`ctx`)

_Status: ✅ Complete_

The backbone model containing user profile, settings, and addon configurations.

- [x] **Types**: `src/types/models/ctx.ts` (`UserProfile`, `CtxState`).
- [x] **Actions**: `src/types/actions/ctx/` (Auth, Settings, Addon Management).
- [x] **Builder**: `ActionBuilder.Auth`, `ActionBuilder.User`, `ActionBuilder.Addons`.
- [x] **Parser**: `StateParser.parseCtx` (Handles profile normalization, addon filtering).
- [x] **Hook**: `useCtx()` (Returns profile, isAuthenticated flag, installed addons).

### 2.2 Library System (`library`)

_Status: ✅ Complete_

Manages the user's persistent library (movies/series added to collection).

- [x] **Types**: `src/types/models/library.ts` (`LibraryItem`, `LibraryItemState`).
- [x] **Actions**: `src/types/actions/ctx/` (`AddToLibrary`, `RemoveFromLibrary`, `ToggleNotifications`).
- [x] **Builder**: `ActionBuilder.Library`.
- [x] **Parser**: `StateParser.parseLibrary` (Converts Record map to Array, normalizes dates).
- [x] **Hook**: `useLibrary()` (Returns items array, loading state).

### 2.3 Board & Recommendations (`board`)

_Status: ✅ Complete_

The home screen dashboard containing catalogs and recommendations.

- [x] **Types**: `src/types/models/board.ts`, `src/types/models/catalog.ts`.
- [x] **Actions**: `ActionBuilder.Load.board()`.
- [x] **Builder**: `ActionBuilder.Load`.
- [x] **Parser**: `StateParser.parseBoard` (Handles `Loadable` content states).
- [x] **Hook**: `useBoard()` (Auto-syncs on mount).

### 2.4 Continue Watching

_Status: ✅ Complete_

Tracks playback progress across devices.

- [x] **Types**: `src/types/models/continue-watching.ts`.
- [x] **Parser**: `StateParser.parseContinueWatching`.
- [x] **Hook**: `useContinueWatching()` (via `useCoreQuery('continue_watching_preview')`).

### 2.5 Player & Playback (`player`)

_Status: 🚧 Partial / In Progress_

Manages video playback state, stream selection, and progress reporting.

- [x] **Types**: `src/types/models/stream.ts` (Stream definitions).
- [ ] **Model Types**: `src/types/models/player.ts` (Missing implementation).
- [x] **Actions**: `src/types/actions/player/` (`TimeChanged`, `Ended`, `Paused`).
- [x] **Builder**: `ActionBuilder.Player`.
- [ ] **Parser**: Needs `StateParser.parsePlayer` to handle selected stream, subtitles, and buffer state.
- [ ] **Hook**: `usePlayer()` hook logic needed.

### 2.6 Discover & Catalogs (`discover`)

_Status: 🚧 Partial_

Search and Category browsing.

- [x] **Actions**: `ActionBuilder.Load.discover()`.
- [x] **Keys**: `coreKeys.discover`.
- [ ] **Types**: Dedicated `DiscoverState` type needed (currently relies on generic Catalog types).
- [ ] **Hook**: `useDiscover()` hook needed for handling pagination and filters.

---

## 🟢 Phase 3: Data Fetching & API (Completed)

Handling data that bypasses the WASM Core (HTTP Direct).

- [x] **Addon Client**
  - _Implementation_: `src/api/addons/addon-client.ts`
  - _Features_:
    - `getManifest`: Fetches addon configuration.
    - `getCatalog`: Fetches lists of content (movies/series).
    - `getMeta`: Fetches detailed info for a single item.
    - `getStreams`: Fetches playable streams.
    - **Smart Proxy**: Auto-failover to `/api/proxy` if CORS fails.

- [x] **Addon Parser**
  - _Implementation_: `src/api/addons/addon-parser.ts`
  - _Features_: Validates raw HTTP responses against `AddonManifest` and `MetaItem` schemas.

- [] **Addon Advanced Parser**
  - _Implementation_: `TODO`
  - _Features_: Abiltity to filter addon content based on user profile, settings, and installed addons. Filtering duplicates in cross addon catalogs.

---

## 🔵 Phase 4: Advanced Features (Planned)

Features designed but not yet fully implemented.

### 4.1 Streaming Server Control (`streaming_server`)

_Status: ⬜ Planned_

Interacting with the local streaming server (engine) for torrent management.

- [x] **Actions**: `ActionBuilder.StreamingServer` (Reload, Settings).
- [ ] **Model**: `src/types/models/streaming-server.ts`.
- [ ] **Hook**: `useStreamingServer()` to monitor torrent health/stats.

### 4.2 Calendar

_Status: ⬜ Planned_

Release dates for library items.

- [x] **Actions**: `ActionBuilder.Load.calendar()`.
- [ ] **Model**: Calendar types.
- [ ] **Parser**: Date grouping logic.

### 4.3 Search (Global)

_Status: ⬜ Planned_

Unified search across all installed addons.

- [ ] **Actions**: Search dispatch logic.
- [ ] **Parser**: Aggregating results from multiple addons.
- [ ] **Hook**: `useGlobalSearch()`.

---

## 🛠️ Technical Debt & Refactoring

Ongoing maintenance tasks.

- [ ] **Zod Integration**: Replace manual defensive parsing in `StateParser` with Zod schemas for runtime type validation.
- [ ] **Unit Tests**: Add Jest/Vitest suite for `ActionBuilder` (ensure JSON matches Rust structs) and `StateParser` (ensure mock JSON parses correctly).
- [ ] **Error Handling**: Standardize error objects returned by `useCoreQuery`.

---

## How to Read This Checklist

- **[x]**: Feature is implemented, typed, and accessible via the wrapper.
- **[ ]**: Feature is planned or currently being worked on.
- **Types**: TypeScript interface definitions (`src/types/`).
- **Actions**: JSON payload structures (`src/types/actions/`).
- **Builder**: Factory methods to create actions (`ActionBuilder`).
- **Parser**: Logic to transform raw WASM state to TS (`StateParser`).
- **Hook**: React hook for consuming the feature (`useX`).
