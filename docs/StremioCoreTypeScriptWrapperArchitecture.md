# Stremio Core TypeScript Wrapper Architecture

## Core Concepts

### Stremio Core Architecture (Elm-inspired)

**Elm Architecture** pattern:

```
┌─────────────────────────────────────────────────┐
│ Your UI                                         │
│ (React Components using TanStack Query)         │
└───────────────┬─────────────────────────────────┘
                │
                ├─ dispatch(action)
                ├─ get_state(model)
                │
┌───────────────▼─────────────────────────────────┐
│ TypeScript Wrapper                              │
│ (Type-safe abstraction over stremio-core-web)   │
└───────────────┬─────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────┐
│ @stremio/stremio-core-web                       │
│ (Rust WASM)                                     │
└─────────────────────────────────────────────────┘
```

**Key principles:**

1. **Immutable State**: Core maintains all state internally
2. **Action-based Updates**: You dispatch actions (JSON strings) to update state
3. **Model-based State**: You query state by model name (e.g., "ctx", "board", "library")
4. **No Direct Transport**: Addon data is fetched via HTTP, not through core's transport layer

### Core Models

Based on the Stremio Core source, these are the main models:

- **`ctx`** (Context): User authentication, addons, settings
- **`library`**: User's content library, watch history
- **`board`**: Continue watching, recommendations
- **`discover`**: Catalog discovery by genre/type
- **`detail`**: Detailed metadata for specific content
- **`player`**: Video playback state
- **`streaming_server`**: Local streaming server status

## Directory Structure

```
src/stremio-core/
├── README.md (this file)
├── index.ts (main exports)
├── types/
│   ├── models/
│   ├── actions/
│   │   ├── ctx-actions.ts
│   │   ├── X-feature-actions.ts
│   │   ├── Y-feature-actions.ts
│   │   └── index.ts
│   ├── common/ <!-- e.g., meta-item, stream, addon, video, etc -->
│   └── index.ts
├── core/
│   ├── stremio-core.ts (core wrapper class)
│   ├── action-builder.ts (action construction helpers)
│   └── state-parser.ts (parse raw state into typed models)
├── hooks/
│   ├── use-core-state.ts (TanStack Query hook)
│   ├── use-dispatch.ts
│   └── index.ts
└── api/
    ├── addons/
    │   ├── addon-client.ts (HTTP client for addon requests)
    │   └── addon-hepers.ts (addon fetching and parsing helpers)
    ├── feature-x/
    │   ├── x-client.ts (HTTP client for x requests)
    │   └── x-hepers.ts (x fetching and parsing helpers)
    └── feature-y/
        ├── y-client.ts (HTTP client for y requests)
        └── y-hepers.ts (y fetching and parsing helpers)
```

## How to Discover Types and Actions

### Method 1: Read Rust Source Code

The canonical source of truth is the [stremio-core repository](https://github.com/Stremio/stremio-core).

**Key directories:**

- `src/state_types/msg/actions.rs` - All action types
- `src/models/` - All model state structures
- `src/types/` - Common types (MetaItem, Stream, etc.)

**Reading Rust → TypeScript:**

```rust
// Rust (actions.rs)
pub enum Action {
    Load(ActionLoad),
    Unload,
    // ...
}

pub enum ActionLoad {
    Ctx,
    Library,
    Board,
    // ...
}
```

```typescript
// TypeScript equivalent
type Action = { Load: ActionLoad } | "Unload";

type ActionLoad = "Ctx" | "Library" | "Board";

// When dispatching to WASM:
core.dispatch(JSON.stringify({ Load: "Ctx" }));
```

### Method 2: Runtime Inspection

Log the state returned from `get_state()` to understand the structure:

```typescript
const rawState = core.get_state("ctx");
console.log("CTX State:", JSON.stringify(rawState, null, 2));
```

### Method 3: Check stremio-web

The official web app uses stremio-core-web: [stremio-web repository](https://github.com/Stremio/stremio-web)

Look for:

- How they call `dispatch()`
- What model names they use in `get_state()`
- State shape in their React components

### Method 4: Network Inspection

For addon-related types (MetaItem, Stream, etc.), check addon responses:

1. Open Stremio web app
2. Open DevTools → Network
3. Filter for `.json` requests to addon URLs
4. Inspect the response structure

Example: `https://v3-cinemeta.strem.io/catalog/movie/top.json`

## Type Creation Workflow

### 1. Identify the Feature

Example: You want to implement "Add to Library" functionality.

### 2. Find the Rust Action

Search `stremio-core` repo for relevant files:

- Check `src/models/ctx/update_library.rs`
- Check `src/state_types/msg/actions.rs`

```rust
// Found in actions.rs
pub enum ActionCtx {
    AddToLibrary(MetaItem),
    RemoveFromLibrary(String), // id
    // ...
}
```

### 3. Create TypeScript Action Type

```typescript
// src/stremio-core/types/actions/ctx-actions.ts

import type { MetaItem } from "../common/meta-item";

export type ActionCtx =
  | { AddToLibrary: MetaItem }
  | { RemoveFromLibrary: string }
  | { ToggleNotifications: string };

export type CtxAction = {
  Ctx: ActionCtx;
};
```

### 4. Create Action Builder

```typescript
// src/stremio-core/core/action-builder.ts

import type { MetaItem } from "../types/common/meta-item";
import type { CtxAction } from "../types/actions/ctx-actions";

export class ActionBuilder {
  static addToLibrary(item: MetaItem): string {
    const action: CtxAction = {
      Ctx: { AddToLibrary: item },
    };
    return JSON.stringify(action);
  }

  static removeFromLibrary(id: string): string {
    const action: CtxAction = {
      Ctx: { RemoveFromLibrary: id },
    };
    return JSON.stringify(action);
  }
}
```

### 5. Find the State Model

```rust
// In src/models/ctx/ctx.rs
pub struct Ctx {
    pub profile: Profile,
    pub library: LibraryBucket,
    pub notifications: NotificationsBucket,
    // ...
}
```

```typescript
// src/stremio-core/types/models/ctx.ts

export interface Profile {
  _id: string;
  email: string;
  avatar?: string;
  // ...
}

export interface LibraryItem {
  _id: string;
  name: string;
  type: "movie" | "series";
  poster?: string;
  removed: boolean;
  temp: boolean;
  _ctime: Date | string;
  _mtime: Date | string;
  state: {
    lastWatched?: Date | string;
    timeWatched: number;
    timeOffset: number;
    overallTimeWatched: number;
    timesWatched: number;
    flaggedWatched: boolean;
    duration: number;
    video_id?: string;
    // ...
  };
}

export interface CtxState {
  profile: Profile | null;
  library: {
    items: LibraryItem[];
  };
  addons: {
    // ...
  };
}
```

### 6. Create State Parser

```typescript
// src/stremio-core/core/state-parser.ts

import type { CtxState } from "../types/models/ctx";

export class StateParser {
  static parseCtx(rawState: any): CtxState {
    // Validate and transform raw WASM state
    return {
      profile: rawState?.profile
        ? {
            _id: rawState.profile._id,
            email: rawState.profile.email,
            avatar: rawState.profile.avatar,
          }
        : null,
      library: {
        items: rawState?.library?.items || [],
      },
      addons: rawState?.addons || {},
    };
  }
}
```

### 7. Create React Hook

```typescript
// src/stremio-core/hooks/use-core-state.ts

import { useQuery } from "@tanstack/react-query";
import { useStremioCore } from "@/hooks/use-stremio-core";
import { StateParser } from "../core/state-parser";
import type { CtxState } from "../types/models/ctx";

export function useCtxState() {
  const { core } = useStremioCore();

  return useQuery({
    queryKey: ["stremio-core", "ctx"],
    queryFn: () => {
      if (!core) throw new Error("Core not initialized");
      const rawState = core.get_state("ctx");
      return StateParser.parseCtx(rawState);
    },
    enabled: !!core,
    staleTime: 1000,
  });
}
```

### 8. Create Dispatch Hook

```typescript
// src/stremio-core/hooks/use-dispatch.ts

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStremioCore } from "@/hooks/use-stremio-core";
import { ActionBuilder } from "../core/action-builder";
import type { MetaItem } from "../types/common/meta-item";

export function useLibraryActions() {
  const { core } = useStremioCore();
  const queryClient = useQueryClient();

  const addToLibrary = useCallback(
    async (item: MetaItem) => {
      if (!core) throw new Error("Core not initialized");

      const action = ActionBuilder.addToLibrary(item);
      core.dispatch(action);

      // Invalidate queries to refetch state
      await queryClient.invalidateQueries({
        queryKey: ["stremio-core", "ctx"],
      });
    },
    [core, queryClient],
  );

  const removeFromLibrary = useCallback(
    async (id: string) => {
      if (!core) throw new Error("Core not initialized");

      const action = ActionBuilder.removeFromLibrary(id);
      core.dispatch(action);

      await queryClient.invalidateQueries({
        queryKey: ["stremio-core", "ctx"],
      });
    },
    [core, queryClient],
  );

  return { addToLibrary, removeFromLibrary };
}
```

## Common Pitfalls & Solutions

### ❌ Don't: Try to use core.transport

```typescript
// This doesn't exist!
const catalog = await core.transport.getCatalog(...);
```

### ✅ Do: Fetch addon data via HTTP

```typescript
// src/stremio-core/api/addon-client.ts
export async function getCatalog(addonUrl: string, type: string, id: string) {
  const url = `${addonUrl}/catalog/${type}/${id}.json`;
  const response = await fetch(url);
  return response.json();
}
```

### ❌ Don't: Dispatch actions as objects

```typescript
core.dispatch({ Load: "Ctx" }); // Won't work!
```

### ✅ Do: Stringify actions

```typescript
core.dispatch(JSON.stringify({ Load: "Ctx" }));
```

### ❌ Don't: Trust raw state structure

```typescript
const state = core.get_state("ctx");
const email = state.profile.email; // Might crash!
```

### ✅ Do: Parse and validate

```typescript
const rawState = core.get_state("ctx");
const state = StateParser.parseCtx(rawState);
const email = state.profile?.email ?? "Not logged in";
```

## Testing Strategy

1. **Unit tests**: Test action builders and state parsers
2. **Integration tests**: Test that actions update state correctly
3. **Runtime validation**: Use Zod/Yup to validate addon responses

```typescript
// Example with Zod
import { z } from "zod";

const MetaItemSchema = z.object({
  id: z.string(),
  type: z.enum(["movie", "series", "channel", "tv"]),
  name: z.string(),
  poster: z.string().optional(),
  // ...
});

export function validateMetaItem(data: unknown) {
  return MetaItemSchema.parse(data);
}
```

## Performance Considerations

1. **Debounce state queries**: Don't call `get_state()` on every render
2. **Use TanStack Query caching**: Set appropriate `staleTime` and `cacheTime`
3. **Batch dispatches**: If dispatching multiple actions, consider batching
4. **Memoize parsers**: Use `useMemo` for expensive state transformations

## Debugging Tips

### Enable Core Logging

```typescript
// Check what the core exposes
console.log("Core methods:", Object.keys(core));

// Log raw state
const rawCtx = core.get_state("ctx");
console.log("Raw CTX:", JSON.stringify(rawCtx, null, 2));
```

### Test Actions Manually

```typescript
// In browser console
core.dispatch(JSON.stringify({ Load: "Ctx" }));
const state = core.get_state("ctx");
console.log(state);
```

### Compare with Official App

1. Open [https://web.stremio.com](https://web.stremio.com)
2. Open DevTools → Console
3. Find the core instance (usually `window.core` )
4. Try the same actions/queries

## Resources

- **Stremio Core Repo**: https://github.com/Stremio/stremio-core
- **Stremio Web Repo**: https://github.com/Stremio/stremio-web
- **Addon Protocol**: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/protocol.md
- **Rust Serde JSON**: https://serde.rs/ (for understanding serialization format)
