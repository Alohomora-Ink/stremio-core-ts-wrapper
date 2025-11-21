# Workflow: Adding a New Feature

**Purpose**: This document outlines the standardized process for implementing a new Stremio Core feature (Model, Action, or Capability) within the TypeScript wrapper.

**Prerequisites**:

1. Ensure you understand the [System Architecture](./StremioCoreTypeScriptWrapperArchitecture.md).
2. Have the [Debug Center](../src/debug/components/StremioCoreWebDebugCenter.tsx) enabled in your app to inspect raw data.

---

## 📋 Workflow Overview

1. **Analysis**: Inspect the raw WASM state and Rust source.
2. **Types**: Define TypeScript interfaces for Models and Actions.
3. **Logic**: Implement `ActionBuilder` methods and `StateParser` logic.
4. **State**: Create a React Hook (`useCoreQuery`) with cache invalidation strategies.
5. **UI**: Integrate into components.

---

## 🛠️ Step-by-Step Implementation Guide

### Phase 1: Analysis & Discovery

Before writing code, understand the shape of data coming from Rust.

1. **Locate the Feature in Rust**:
   - Go to the [stremio-core repo](https://github.com/Stremio/stremio-core).
   - Find the **Model** (e.g., `src/models/library_with_filters.rs`).
   - Find the **Action** (e.g., `src/types/actions.rs`).
2. **Inspect Raw State**:
   - Open your app with `StremioCoreWebDebugCenter` enabled.
   - Use the **Action Dispatcher** to manually fire the relevant `Load` action (e.g., `{"action":"Load","args":{"model":"LibraryWithFilters",...}}`).
   - Use the **State Inspector** to view the raw JSON output.
   - _Copy this JSON_. You will need it to write your TypeScript interfaces.

### Phase 2: Type Definitions (`src/types`)

Define the contract. Do not use `any`.

**1. Create the Model Type**
File: `src/types/models/<feature-name>.ts`

```typescript
// Example: src/types/models/calendar.ts

import type { MetaItem } from "./meta-item";

export interface CalendarEvent {
  date: string; // ISO Date
  items: MetaItem[];
}

export interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;
}
```

**2. Export the Model**
File: `src/types/models/index.ts`

```typescript
export * from "./calendar";
```

**3. Define the Action Interface**
File: `src/types/actions/<feature-actions>.ts` (or add to existing domain file)

```typescript
// Example: src/types/actions/load/index.ts (Adding to Load actions)

export type ActionLoad =
    | ...
    | {
        Calendar: {
            filters: any[];
            year: number;
            month: number;
        };
      };
```

### Phase 3: Core Logic (`src/core`)

**1. Update the ActionBuilder**
File: `src/core/action-builder.ts`

Add a static method to construct the action JSON. Use the helper functions (`buildLoadAction`, `buildActionWithArgs`, etc.) to ensure formatting consistency.

```typescript
export class ActionBuilder {
  // ... existing domains

  static Calendar = {
    load: (year: number, month: number): string => {
      return buildLoadAction("Calendar", {
        filters: [],
        year,
        month
      });
    }
  };
}
```

**2. Update the StateParser**
File: `src/core/state-parser.ts`

Create a static method to transform the raw (unsafe) JSON into your typed Model. **Always write defensive code.**

```typescript
import type { CalendarState } from "../types/models/calendar";

export class StateParser {
  // ... existing parsers

  static parseCalendar(raw: any): CalendarState {
    if (!raw || !Array.isArray(raw.events)) {
      return { events: [], isLoading: true }; // Default safe state
    }

    return {
      isLoading: false,
      events: raw.events.map((evt: any) => ({
        date: evt.date,
        items: Array.isArray(evt.items) ? evt.items : [] // Reuse parseMetaItem if complex
      }))
    };
  }
}
```

### Phase 4: Hooks & State Management (`src/hooks`)

**1. Define Query Keys**
File: `src/queries/keys.ts`

Add a consistent key for caching.

```typescript
export const coreKeys = {
  // ...
  calendar: (year: number, month: number) =>
    [...coreKeys.all, "model", "calendar", year, month] as const
};
```

**2. Create the Hook**
File: `src/hooks/use-calendar.ts`

Use `useCoreQuery` to handle the heavy lifting (transport communication, caching, parsing).

```typescript
import { useCoreQuery } from "./use-core-model";
import { StateParser } from "../core/state-parser";
import { ActionBuilder } from "../core/action-builder";
import { useDispatch } from "./use-dispatch";

export function useCalendar(year: number, month: number) {
  // 1. Setup Query
  // Note: 'calendar' is the string ID used in transport.getState('calendar')
  const { data, isLoading, error } = useCoreQuery(
    "calendar",
    StateParser.parseCalendar
  );

  const dispatch = useDispatch();

  // 2. Setup Load Action
  const loadCalendar = async () => {
    await dispatch(ActionBuilder.Calendar.load(year, month), "calendar");
  };

  // 3. Return API
  return {
    events: data?.events || [],
    isLoading,
    error,
    loadCalendar
  };
}
```

### Phase 5: UI Integration

Wire it up in your React component.

```tsx
// src/app/calendar/page.tsx
import { useEffect } from "react";
import { useCalendar } from "@/stremio-core-ts-wrapper";

export default function CalendarPage() {
  const { events, loadCalendar } = useCalendar(2023, 11);

  useEffect(() => {
    loadCalendar();
  }, []);

  return (
    <div>
      {events.map((evt) => (
        <div key={evt.date}>
          {evt.date}: {evt.items.length} items
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Pull Request Checklist

Copy this checklist into your PR description when submitting a new feature.

### Feature Metadata

- **Feature Name**: `[e.g., Calendar]`
- **Model Name (Core)**: `[e.g., "calendar"]`
- **Action Type**: `[e.g., Load -> Calendar]`

### Implementation Status

- [ ] **Types**: Interfaces added to `src/types/models/`.
- [ ] **ActionBuilder**: JSON construction logic added and verified against Rust source.
- [ ] **StateParser**: Parser implemented with null-checks/defaults.
- [ ] **Hook**: Custom hook created using `useCoreQuery`.
- [ ] **Cache Invalidation**: Confirmed `NewState` event triggers re-fetch (via `useCoreQuery` internal logic).
- [ ] **Manual Test**: Verified using `StremioCoreWebDebugCenter` that the action dispatches and state returns correctly.

### Documentation

- [ ] **Checklist**: Updated `docs/implementation-checklist.md`.
- [ ] **Architecture**: If this introduces a new pattern, update `docs/StremioCoreTypeScriptWrapperArchitecture.md`.

---

## 🐛 Troubleshooting Common Issues

**1. The state remains `undefined` or empty.**

- Check `src/core/core-transport.ts`. Is the `dispatch` actually sending?
- Did you call the `loadX()` function? Core models often need an initial `Load` action before they populate data.
- Check the **Debug Center Events** tab. Did a `NewState` event fire?

**2. The Parser crashes.**

- The raw state is likely different from what you expected. Use the **State Inspector** in the Debug Center to copy the _actual_ JSON and compare it to your interface.
- Add `console.log(raw)` inside your `StateParser` static method to debug.

**3. Infinite Re-renders.**

- Ensure your `StateParser` returns stable objects if data hasn't changed, or rely on TanStack Query's `structuralSharing` (enabled by default).
- Check if your `useEffect` dependency array in the component is correct.
