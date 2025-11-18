# AddNewFeatureWorkflowTemplate

> Template for adding a new feature / model / action to the Stremio TypeScript wrapper.

---

## Basic metadata (fill before starting)

- **Feature name:**`INPUT_FEATURE_NAME_HERE<!-- e.g., fetch data / auth / save data / etc -->`
- **Feature type:**`INPUT_FEATURE_TYPE_HERE<!-- e.g., model / action / api / component -->`
- **Target milestone / PR / Feature Branch:**`INPUT_MILESTONE_OR_PR_HERE<!-- e.g., current feature branch -->`
- **High-level description:**`INPUT_SHORT_DESC_HERE<!-- e.g., describe the feature, or the type, or the action, functinality etc-->`
- **Requirements / acceptance criteria:**
  - `INPUT_REQUIREMENT_1<!-- e.g., criteria to validate that the feature is working -->`
  - `INPUT_REQUIREMENT_2<!-- e.g., criteria to validate that the feature is working -->`
  - `INPUT_REQUIREMENT_N<!-- e.g., criteria to validate that the feature is working -->`

---

## Mapping (how this maps into the codebase)

- [ ]**Rust (stremio-core) reference(s):**`INPUT_RUST_FILE_OR_GIT_URL_OR_DIRECT_ORIGINAL_CODE_SNIPPIT_REF_HERE`

---

- [ ]**TS types path:**`src/stremio-core/types/models/INPUT / src/stremio-core/types/actions/INPUT`

---

- [ ]**ActionBuilder:**`src/stremio-core/core/action-builder.ts` (add method)

---

- [ ]**StateParser:**`src/stremio-core/core/state-parser.ts` (parse model)

---

- [ ]**Hooks:**`src/stremio-core/hooks/` (query + dispatch)

---

- [ ]**Components / Pages:**`src/app/...` or`src/components/...`

---

- [ ]**API client (if needed):**`src/stremio-core/api/` (e.g., addon-client.ts)

---

## Workflow Checklist

### 1 — Research & discovery

- [ ] Locate the relevant Rust model/action in[stremio-Core repo](https://github.com/Stremio/stremio-core) or[stremio-core-web repo](https://github.com/Stremio/stremio-core/tree/development/stremio-core-web) (search`src/**/models/`and`src/state_types/msg/actions.rs`).
- [ ] Inspect examples in the[official stremio-web app](https://github.com/Stremio/stremio-web) for similar functionality.
- [ ] Find any addon HTTP endpoints needed (catalogs / metadata).
- [ ] Note any runtime invariants or edge cases (e.g., optional fields).

### 2 — Types (TypeScript)

- [ ] Create model types in`src/stremio-core/types/models/INPUT_FEATURE_NAME_HERE.ts`.
  - Add JSDoc comments and indicate which fields are optional.
- [ ] Add any shared/common types to`src/stremio-core/types/common/` if needed.
- [ ] Export types from`src/stremio-core/types/index.ts`.
- [ ] Run`tsc` / fix autocomplete issues.

### 3 — Actions

- [ ] Add action types in`src/stremio-core/types/actions/` (e.g.,`feature-actions.ts`).
- [ ] Add a**single** ActionBuilder method in`src/stremio-core/core/action-builder.ts`.
  - Name:`ActionBuilder.<verb><FeatureName>(...)`.
  - Return a**stringified** action JSON.
- [ ] Add tests for action builder output (unit test).

### 4 — StateParser

- [ ] Add a`parse<FeatureName>` method in`src/stremio-core/core/state-parser.ts`.
  - Validate / coerce raw WASM values into typed values.
  - Use defensive checks (optional chaining, defaults).
- [ ] If parsing is complex, add Zod schemas in`src/stremio-core/core/schemas/`.
- [ ] Unit test the parser with representative raw state samples.

### 5 — Hooks (TanStack Query)

- [ ] Create`use<FeatureName>State()` query hook in`src/stremio-core/hooks/`.
  - Use`core.get_state("MODEL_NAME")` and call the parser.
  - Set`staleTime` /`refetchInterval` appropriately.
- [ ] Create`use<FeatureName>Actions()` dispatch hook that calls ActionBuilder.
  - After dispatch, call`queryClient.invalidateQueries({ queryKey: ['stremio-core', 'MODEL_NAME'] })`.
- [ ] Add optimistic-update behavior when appropriate.

### 6 — Components / UI

- [ ] Wire`use<FeatureName>State()` into the component/page.
- [ ] Wire`use<FeatureName>Actions()` to UI actions (buttons, forms).
- [ ] Add loading & error states; avoid calling`get_state()` on every render.
- [ ] Add minimal styling and accessibility labels.

### 7 — Tests

- [ ] Unit tests for action builder and parser.
- [ ] Integration tests (if available) verifying dispatch → state change.
- [ ] Manual QA checklist: run`npm run dev`, navigate to the page, exercise happy & edge flows.

### 8 — Debugging & observability

- [ ] Add temporary dev logging to expose state:`window.__STREMIO_CORE__ = core` in dev.
- [ ] Add console examples to the template for inspecting raw state.
- [ ] Add any core telemetry/metrics if appropriate.

### 9 — Performance & polish

- [ ] Check for unnecessary re-renders; memoize expensive derived state.
- [ ] Use TanStack query selective invalidation (`['stremio-core','ctx','library']`).
- [ ] Add debounce for input-heavy features.

### 10 — Documentation & PR

- [ ] Add/update this template with any feature-specific notes.
- [ ] Add JSDoc to exported methods and hooks.
- [ ] Update the README in`src/stremio-core/` if new concepts were introduced.
- [ ] Create PR with description, screenshots, testing notes, and migration steps.

---

## Example placeholders (copy these for new features)

```
- Feature name: INPUT_FEATURE_NAME_HERE
- Model name (core.get_state): "MODEL_NAME_HERE"
- Action name (ActionBuilder): ActionBuilder.doThingForFeature
- Types to add:
  - src/stremio-core/types/models/feature.ts
  - src/stremio-core/types/actions/feature-actions.ts
- Hooks to add:
  - useFeatureState
  - useFeatureActions
```

---

## Helpful commands

```bash
# search core for action names
git clone https://github.com/Stremio/stremio-core.git
cd stremio-core
grep -R "AddToLibrary\|ActionCtx\|Load(" -n src || true

# run dev
npm run dev
```

---

## Quick copy checklist (for PR description)

- Descritpion: I wokred of feature x, to do thing y.

- [ ] Types added & exported
  - reference snippit

  ```ts
  export interface X {
    // ...
  }
  ```

  - what it:
  - what it does :

- [ ] ActionBuilder method added
  - reference snippit

  ```ts
  export class ActionBuilder {
      static ActionX(arg: string): string {
        return JSON.stringify({
            Ctx: { CtxAction: id }
        });
    }
    ...
  }
  ```

- [ ] State parser added or unit tested
- [ ] Query + dispatch hooks added
- [ ] Components wired & basic E2E manual checks pass
- [ ] README / docs updated
