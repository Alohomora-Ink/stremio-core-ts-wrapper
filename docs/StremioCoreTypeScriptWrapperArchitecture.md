# Stremio Core TypeScript Wrapper Architecture

**Version**: 1.0.0  
**Status**: Implementation Reference  
**Scope**: Complete internal architecture of `stremio-core-ts-wrapper`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architectural Principles](#architectural-principles)
   - [The Elm Architecture Adaptation](#the-elm-architecture-adaptation)
   - [Unidirectional Data Flow](#unidirectional-data-flow)
   - [The Hybrid Data Model](#the-hybrid-data-model)
3. [System Components Deep Dive](#system-components-deep-dive)
   - [Core Infrastructure (`src/core`)](#core-infrastructure-srccore)
   - [Type System & Models (`src/types`)](#type-system--models-srctypes)
   - [State Management Strategy (`src/hooks`)](#state-management-strategy-srchooks)
   - [Action Dispatch System](#action-dispatch-system)
   - [Event System](#event-system)
   - [Data Fetching Layer (`src/api`)](#data-fetching-layer-srcapi)
4. [Integration Patterns](#integration-patterns)
   - [Frontend Initialization Lifecycle](#frontend-initialization-lifecycle)
   - [Authentication Flow](#authentication-flow)
   - [Proxy Enforcement Mechanism](#proxy-enforcement-mechanism)
5. [Performance & Optimization](#performance--optimization)
   - [Re-render Prevention](#re-render-prevention)
   - [Memory Management](#memory-management)
6. [Debugging & Tooling](#debugging--tooling)
   - [StremioCoreWebDebugCenter](#stremiocorewebdebugcenter)

---

## Executive Summary

The `stremio-core-ts-wrapper` is a sophisticated abstraction layer designed to bridge the gap between a modern, reactive React/Next.js frontend and the low-level, imperative Rust/WebAssembly logic of `@stremio/stremio-core-web`.

**The Problem**: The raw WASM core exposes a minimal interface: it accepts JSON strings for actions and returns raw JSON objects for state. It offers no type safety, no state management (caching/deduplication), and no React-friendly bindings.

**The Solution**: This wrapper creates a strictly typed contract. It treats the Rust Core as a "Client-Side Backend," managing the communication lifecycle, parsing data into predictable shapes, and exposing ergonomic hooks that integrate seamlessly with the React render cycle via TanStack Query.

---

## Architectural Principles

### The Elm Architecture Adaptation

Stremio Core implementation strictly follows the [Elm Architecture](https://guide.elm-lang.org/architecture/), consisting of three parts:

1. **Model**: The state of the application. This lives **entirely** inside the Rust Core. The frontend does not "own" the User Profile or Library; it merely reflects a snapshot of the Core's model.
2. **Update**: The only way to change the state is by sending a message (an **Action**). The Core handles the logic and returns a new Model.
3. **View**: The React frontend is a pure function of the Model. `View = f(Model)`.

### Unidirectional Data Flow

Data flows in one strictly defined loop:

1. **UI Interaction**: User clicks "Add to Library".
2. **Action Construction**: `ActionBuilder` creates a strictly typed JSON string (e.g., `{"action":"Ctx","args":{"action":"AddToLibrary",...}}`).
3. **Dispatch**: `CoreTransport` sends this to the Web Worker.
4. **Processing**: Rust Core processes the action and updates internal state.
5. **Event Emission**: Core emits a `NewState` event indicating which models changed (e.g., `['ctx', 'library']`).
6. **Invalidation**: The wrapper receives this event and invalidates the corresponding TanStack Query keys.
7. **Refetch & Parse**: The hook re-reads the state, passes it through `StateParser`, and triggers a React re-render.

### The Hybrid Data Model

The wrapper acknowledges a critical distinction in data types:

- **User State (WASM)**: Authenticated data, library persistence, settings, addons configuration. This MUST go through Core/WASM because it involves encryption, sync, and business logic.
- **Catalog Content (HTTP)**: Millions of movies/series metadata. Fetching this through WASM is inefficient due to serialization overhead. This wrapper implements a **Hybrid Approach** where catalog content is fetched directly via HTTP using `AddonClient`, bypassing the WASM layer entirely for read-only public data.

---

## System Components Deep Dive

### Core Infrastructure (`src/core`)

This layer handles the "physical" connection to the WebAssembly module.

#### `CoreTransport` (`src/core/core-transport.ts`)

The singleton class responsible for managing the Web Worker lifecycle.

- **Worker Management**: It instantiates `worker.js` (copied from the core package to `public/`) and establishes the `Bridge`.
- **Event Bridging**: It exposes an `EventEmitter` that proxies messages from the worker's `onCoreEvent` callback to the React application.
- **Method Exposure**: It wraps the raw bridge calls (`dispatch`, `getState`, `decodeStream`, `analytics`) in Promise-based methods.

**Critical Implementation Detail**:
The transport layer handles the initialization handshake (`init` call with `appVersion` and `shellVersion`) which is required before the Core accepts any actions.

#### `StateParser` (`src/core/state-parser.ts`)

The defense line against runtime errors. The raw JSON returned by WASM is `unknown`. The Parser transforms this into trusted TypeScript objects.

- **Defensive Coding**: It assumes every field might be missing or null. It uses extensive optional chaining (`raw?.profile?.settings`).
- **Normalization**: It standardizes data shapes. For example, `library.items` in Core is a map (Record), but `StateParser.parseLibrary` converts it to an Array for easier iteration in React.
- **Sanitization**: It creates "Empty/Null" objects (e.g., `emptyCtx()`) to ensure hooks always return stable references, preventing UI crashes.

#### `ActionBuilder` (`src/core/action-builder.ts`)

A static factory class that constructs the precise JSON structure required by Rust Serde enums.

- **Discriminated Unions**: It handles the three complex variants of Rust enums mapped to JSON:
  1. **Unit Variant**: `"Logout"` (just a string).
  2. **Tuple Variant**: `{"action": "Load", "args": { ... }}`.
  3. **Nested Enums**: `{"action": "Ctx", "args": { "action": "AddToLibrary", ... }}`.
- **Type Safety**: Methods like `ActionBuilder.Library.addItem(item: MetaItem)` ensure the UI cannot construct a malformed action.

---

### Type System & Models (`src/types`)

The repository defines a comprehensive set of TypeScript interfaces that mirror the Rust structs.

#### Model Types (`src/types/models`)

- **`ctx.ts`**: The Global Context. Contains `profile` (User), `settings`, and `addons` (installed & catalogs).
- **`library.ts`**: Defines `LibraryItem` and its complex state (time watched, duration, flagged watched).
- **`board.ts`**: Structure for the Home Board, containing `Catalog` objects which hold `Loadable<MetaItem[]>`.
- **`meta-item.ts`**: The universal content object. Used for movies, series, channels. Includes rich metadata (poster, background, logo, cast, behavior hints).
- **`stream.ts`**: Represents a playable source (URL, YouTube ID, InfoHash).

#### Action Types (`src/types/actions`)

These types document the valid JSON structure for actions. They are primarily used internally by `ActionBuilder` to ensure the constructed strings are valid.

---

### State Management Strategy (`src/hooks`)

The wrapper uses **TanStack Query (React Query)** as the state manager. This is a strategic choice over Redux or Context API for several reasons:

1. **Async Nature**: Communication with the Worker is asynchronous.
2. **Stale-While-Revalidate**: We want to show cached data immediately while fetching updates.
3. **Deduplication**: Multiple components (e.g., Sidebar and Header) might need `Ctx` state. Query ensures `getState` is called only once.

#### `useCoreQuery` (`src/hooks/use-core-model.ts`)

This is the foundational hook powering all model-specific hooks.

- **Query Key Factory**: Uses `coreKeys` (e.g., `['stremio-core', 'model', 'ctx']`) to organize the cache.
- **Event Listening**: It mounts a listener for `NewState`.
- **Selective Invalidation Logic**:

```typescript
transport.events.on("NewState", (args) => {
  // Args contains a list of changed models, e.g. [{ model: "ctx" }, { model: "library" }]
  const changedModels = parseModels(args);
  if (changedModels.includes(modelName)) {
    queryClient.invalidateQueries({ queryKey });
  }
});
```

- **Parsing**: It runs the `parser` function passed to it (e.g., `StateParser.parseCtx`) inside the `queryFn`, ensuring only parsed data enters the cache.

#### Domain Hooks

- **`useCtx()`**: Returns `profile`, `addons`, `isAuthenticated`. Wraps `useCoreQuery('ctx')`.
- **`useLibrary()`**: Returns `items` array. Wraps `useCoreQuery('library')`.
- **`useBoard()`**: Returns `catalogs`. Wraps `useCoreQuery('board')`.

---

### Action Dispatch System

Dispatching actions is decoupled from reading state.

#### `useDispatch` (`src/hooks/use-dispatch.ts`)

Returns a `dispatch` function.

1. **Input**: Accepts a JSON string (from `ActionBuilder`) and a `modelName` (target model).
2. **Transport Call**: `await transport.dispatch(action, modelName)`.
3. **Optimistic Updates (Strategy)**: Currently, the system relies on "Pessimistic Updates" (wait for `NewState` event). However, `useDispatch` automatically invalidates the target model's query key immediately after dispatch to ensure the UI feels responsive even if the event is delayed.

---

### Event System

The event system provides the "heartbeat" of the application.

**Event Sources**:

1. **`NewState`**: Emitted whenever the Rust Core state machine transitions. Payload: `[{ model: 'ctx', ... }]`.
2. **`CoreEvent`**: Emitted for side-effects.
   - `UserAuthenticated`: User logged in.
   - `UserPulledFromAPI`: User profile refreshed.
   - `AddonInstalled`: Addon collection changed.
   - `Error`: Global error occurred.

**Event Flow**:
`Rust Core` -> `Web Worker` -> `postMessage` -> `CoreTransport` -> `EventEmitter` -> `React Providers/Hooks`.

---

### Data Fetching Layer (`src/api`)

While the Rust Core handles logic, high-volume data fetching (Catalogs) is offloaded to the `AddonClient`.

#### `AddonClient` (`src/api/addons/addon-client.ts`)

A robust HTTP client for Stremio Addons.

1. **Protocol Normalization**: Converts `stremio://` to `https://`.
2. **Smart Failover Strategy**:
   - **Attempt 1**: Direct `fetch()` to the addon URL.
   - **Attempt 2**: If Direct fetch fails (CORS, Network Error), it retries via the Next.js Proxy Route (`/api/proxy?q=...`).
3. **Response Parsing**: Uses `AddonParser` to validate the JSON response.

**Why this complexity?**
Many community addons do not configure CORS headers correctly for web usage. The local proxy acts as a tunnel to bypass browser security restrictions when necessary.

---

## Integration Patterns

### Frontend Initialization Lifecycle

1. **`StremioCoreProvider` Mounts**:
   - Instantiates `CoreTransport`.
   - Calls `transport.init()`.
2. **Bootstrap Sequence**:
   - Waits for `init` success.
   - Sets internal `transport` state.
   - Dispatches `ActionBuilder.User.pullUser()` to restore session.
   - Dispatches `ActionBuilder.User.syncLibrary()` to load library.
3. **Ready State**:
   - Sets `isAppSyncing` to `false`.
   - Children components render.

### Authentication Flow

Authentication requires a hard reload to reset the Core state cleanly.

1. **User submits Login form**.
2. **`useAuthActions.login()`** dispatches `Authenticate` action.
3. **Core emits `UserAuthenticated` event**.
4. **`StremioCoreProvider` detects event**:
   - Triggers `AuthTransition` (UI Splash screen).
   - Waits 2 seconds (animation).
   - Executes `window.location.reload()`.
5. **Reload**: The app restarts, initializes Core, and pulls the new user session from local storage (managed implicitly by Core/Browser).

### Proxy Enforcement Mechanism

The frontend enforces specific settings to ensure streaming works in the web environment.

- **The Issue**: Stremio Core might default to a streaming server URL that isn't accessible or secure.
- **The Fix**: `StremioCoreProvider` monitors `ctx` state.
- **Logic**: If `ctx.profile.settings.streamingServerUrl` does not match the current origin's proxy (`/stremio-server/`), it automatically dispatches `ActionBuilder.User.updateSettings` to correct it. This ensures the web UI always communicates with the streaming server via the correct proxy path.

---

## Performance & Optimization

### Re-render Prevention

- **Reference Stability**: `StateParser` creates new object references every time. To prevent infinite re-render loops, `useCoreQuery` leverages TanStack Query's `structuralSharing` (default) or memoization where necessary.
- **Selective Rendering**: Components should subscribe only to the specific hooks they need. A component needing only `profile` should use `useCtx`, not a generic "useEverything" hook.

### Memory Management

- **WASM Persistence**: The WASM memory grows over time. The `CoreTransport` is designed to be singleton.
- **Query Garbage Collection**: `useCoreQuery` is configured with a `gcTime` (Garbage Collection Time). If a model (e.g., `board`) is not used by any mounted component, its data is removed from memory after a set timeout (default 5 mins) to free up resources.

---

## Debugging & Tooling

### StremioCoreWebDebugCenter

**File**: `src/debug/components/StremioCoreWebDebugCenter.tsx`

A dedicated debugging dashboard is included to visualize the invisible WASM layer.

**Architecture**:

- **Direct Transport Access**: Bypasses React hooks to talk directly to `CoreTransport`.
- **Event Recorder**: Maintains a rolling history of `NewState` and `CoreEvent` emissions.
- **Raw Inspector**: Renders the raw JSON coming from Rust using `react-json-tree`.
- **Action Simulator**: Allows developers to craft manual JSON payloads and dispatch them to test Core behavior without UI constraints.
- **Logging**: Intercepts `console.log` / `console.error` from the transport layer to display them in a unified UI log.

---

## Future Architectural Considerations

1. **Server-Side Rendering (SSR)**: Currently, the wrapper is Client-Side Only (CSR) because `worker.js` and WASM require a browser environment. Future iterations could explore a Node.js-compatible WASM build for SSR pre-fetching.
2. **Multiple Core Instances**: The architecture allows for multiple `CoreTransport` instances, which could be useful for managing multiple user sessions simultaneously (e.g., fast account switching).
3. **Offline Support**: Integrating `redux-persist` or similar persistence for the Query Cache could allow the app to function (read-only) while offline.
