# PRIME.md — Onboarding guide for AI coding agents

This document walks you through the codebase step by step so you can be productive on your first task. Read it top-to-bottom before you touch any code.

---

## 1. What this project is

**Inköpslista** ("Shopping list" in Swedish) — a PWA-installable shared grocery list and recipe book for a household. Multiple household members log in, see the same live list, check items off in-store, and save recipes that can be pushed onto the list. New items are auto-categorized by an OpenAI-backed edge function so they appear under the right aisle. Categories and aisle ordering are modeled on a Swedish **ICA Maxi** store layout.

**The UI is Swedish.** All visible strings, category names, button labels, and DB-stored category values are Swedish. Do not introduce English UI text or a translation layer (the previous one was deliberately removed — see [src/lib/constants.ts](src/lib/constants.ts) for the canonical category list).

---

## 2. Tech stack

| Layer            | Choice                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Build / dev      | Vite 8 + `@vitejs/plugin-react` + `@tailwindcss/vite` + vite-plugin-pwa |
| UI               | React 19 + TypeScript 6 (strict) + Tailwind CSS v4 (CSS-import based) |
| Routing          | react-router-dom v7 (`BrowserRouter`)                               |
| Server state     | `@tanstack/react-query` v5 (queries + optimistic mutations)         |
| Drag-and-drop    | `@dnd-kit/core` + `@dnd-kit/sortable`                               |
| Backend          | Supabase (Postgres + Auth + Realtime + Edge Functions in Deno)      |
| Hosting          | Vercel (SPA rewrite in [vercel.json](vercel.json))                  |
| Path alias       | `@/*` → `src/*` (see [tsconfig.app.json](tsconfig.app.json) and [vite.config.ts](vite.config.ts)) |

There is **no test framework** configured. There is no Storybook. Verify changes by running `npm run dev` and exercising the feature in a browser.

---

## 3. Run / build / lint

```bash
npm install          # first time
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # tsc -b && vite build  (must pass before merging)
npm run lint         # eslint .
npm run preview      # serve the built dist/
```

You need a `.env.local` with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

If those are missing the app will load but every query fails. The file is already present locally; never commit it.

**Edge functions** (Deno, under [supabase/functions/](supabase/functions/)) are deployed separately via the Supabase CLI. They are not part of `npm run build`. Each function needs `OPENAI_API_KEY` set in Supabase project secrets.

---

## 4. Top-level layout

```
shopping-list/
├── index.html              # entry; lang="sv", PWA meta tags
├── vite.config.ts          # PWA manifest + @ alias + tailwind plugin
├── package.json
├── eslint.config.js        # flat config; recommended + react-hooks
├── tsconfig.app.json       # strict, noUnusedLocals, paths: @/*
├── public/                 # favicon.svg, icons.svg (NO png icons yet)
├── src/                    # all app code — see §5
└── supabase/
    ├── migrations/         # numbered SQL, applied in order
    └── functions/          # Deno edge functions
```

---

## 5. `src/` walkthrough

### Entry & shell
- [src/main.tsx](src/main.tsx) — mounts `<App />` in `StrictMode`.
- [src/App.tsx](src/App.tsx) — provider stack and routes. Order matters:
  `QueryClientProvider → BrowserRouter → AuthProvider → AuthGuard → AppRoutes(UIProvider) → Routes`.
- [src/components/auth/AuthGuard.tsx](src/components/auth/AuthGuard.tsx) — blocks the app on `<AuthPage />` until a user is signed in.
- [src/components/household/HouseholdSetup.tsx](src/components/household/HouseholdSetup.tsx) — blocks the app until the signed-in user belongs to a household.
- [src/components/layout/AppShell.tsx](src/components/layout/AppShell.tsx) — outlet wrapper that wires up `useRealtime()`.

### Routes (declared in `App.tsx`)
| Path              | Page                                                |
| ----------------- | --------------------------------------------------- |
| `/`               | [src/pages/ShoppingListPage.tsx](src/pages/ShoppingListPage.tsx) |
| `/recipes`        | [src/pages/RecipesPage.tsx](src/pages/RecipesPage.tsx) |
| `/recipes/:id`    | [src/pages/RecipePage.tsx](src/pages/RecipePage.tsx) |
| `/stores`         | [src/pages/StoresPage.tsx](src/pages/StoresPage.tsx) |
| `/history`        | [src/pages/HistoryPage.tsx](src/pages/HistoryPage.tsx) |
| `/settings`       | [src/pages/SettingsPage.tsx](src/pages/SettingsPage.tsx) |

### Contexts
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) — owns `user`, `session`, `householdId`, `isLoading`. Subscribes to Supabase auth changes and looks up the user's accepted household membership.
- [src/contexts/UIContext.tsx](src/contexts/UIContext.tsx) — owns `selectedStoreId` and `mode` (`'edit' | 'shopping'`). `mode` persists in `localStorage` under key `shopping-list:mode`.

### Hooks (all under [src/hooks/](src/hooks/))
Each hook in this folder is a thin React Query wrapper around a Supabase table or RPC. Names map directly to features:

- `useGroceries.ts` — list / add (single + bulk) / toggle / delete / clear-checked. The single-item add **fire-and-forgets the `categorize-item` edge function** and patches the row after the model responds.
- `useCategories.ts` — household-level categories and per-store category ordering.
- `useRecipes.ts`, `useRecipeCategories.ts`, `useCategorizeRecipe.ts` — recipe CRUD + AI recipe categorization (calls `categorize-recipe` edge function).
- `useImportRecipeUrl.ts`, `useParseRecipe.ts` — bring recipes in from a URL (schema.org/Recipe) or from one-or-many camera photos (OpenAI vision via `parse-recipe`).
- `useStores.ts`, `useAisleOrders.ts`, `useStoreOffers.ts` — store-related queries.
- `usePurchaseHistory.ts` — history-page data + suggestions for "you usually buy this".
- `useHousehold.ts` — household creation / invites / membership.
- `useRealtime.ts` — single subscribe-and-invalidate channel for `grocery_items` and `household_members`. Mounted once by `AppShell`.

### `lib/` — non-React utilities
- [src/lib/supabase.ts](src/lib/supabase.ts) — the singleton client. In dev it also exposes `window.supabase` and `window.testCategorize(name)` for quick debugging.
- [src/lib/queryClient.ts](src/lib/queryClient.ts) — default `staleTime: 30s`, `gcTime: 5m`, no refetch-on-focus, retry once.
- [src/lib/constants.ts](src/lib/constants.ts) — `NAV_ITEMS`, the canonical `CATEGORIES` array, and `CATEGORY_COLORS`.
- [src/lib/parseIngredient.ts](src/lib/parseIngredient.ts), `parseInstructions.ts`, `recipeScale.ts` — text helpers used when importing/parsing recipes.
- [src/lib/feedback.ts](src/lib/feedback.ts) — Web Audio API "ding" + "undo" sounds played when items are checked off.
- [src/lib/text.ts](src/lib/text.ts) — `capitalizeFirst(...)`, used everywhere item names are inserted.
- [src/lib/image.ts](src/lib/image.ts) — base64-encoding helper for the camera-import flow.

### `components/`
Each subfolder mirrors a domain:
- `auth/` — sign-in screen and guard.
- `household/` — initial household setup, invites, category editors (one for grocery categories, one for recipe categories).
- `layout/` — `Header`, `MenuDrawer`, `AppShell`.
- `groceries/` — the list, the add form, mode toggle, sort controls, the suggestion bar, the "import recipe into list" modal.
- `recipes/` — `RecipeCard` and the very large `NewRecipeModal` (single modal handles create, edit, URL import, and camera import — ~22 KB, watch for unrelated changes).
- `stores/` — store cards, aisle editors, store-specific category ordering, scraped offers list.
- `ui/` — primitives: `Button`, `Input`, `Modal`, `Spinner`, `EmptyState`, `CategoryBadge`.

### `types/`
- [src/types/database.ts](src/types/database.ts) — hand-written `Database` interface mirroring the Postgres schema. Update this whenever you write a migration.
- [src/types/index.ts](src/types/index.ts) — re-exports row types as friendly names (`GroceryItem`, `Recipe`, etc.).

---

## 6. Supabase backend

### Tables (see [src/types/database.ts](src/types/database.ts) for the exact shape)
`households`, `household_members`, `stores`, `store_offers`, `grocery_items`, `aisle_orders`, `purchase_history`, `household_categories`, `household_recipe_categories`, `recipes`, `recipe_ingredients`, `store_category_orders`.

### RLS model
Everything is gated by **household membership with `status = 'accepted'`**. Cross-table policies (e.g. `aisle_orders` checked via the parent `store`) follow the same pattern. RLS is enabled on every table — when you add one, copy the existing pattern from [supabase/migrations/20240501000000_initial_schema.sql](supabase/migrations/20240501000000_initial_schema.sql).

### Realtime
Only `grocery_items` and `household_members` are in the `supabase_realtime` publication. [src/hooks/useRealtime.ts](src/hooks/useRealtime.ts) listens on both and invalidates the matching React Query keys. If you add a new realtime-needing table, add it to the publication in a migration **and** extend `useRealtime`.

### Migrations
Files in [supabase/migrations/](supabase/migrations/) are timestamped (`YYYYMMDDHHMMSS_description.sql`) and applied in order. Add a new file rather than editing an existing one. Use `IF NOT EXISTS` / `DROP POLICY IF EXISTS` so re-running is safe.

### Edge functions
All live under [supabase/functions/](supabase/functions/), all written in Deno, all share the same skeleton: CORS preflight → `Authorization` header → `supabase.auth.getUser()` → fetch context (household, categories) → call OpenAI → match-and-return.

- **`categorize-item`** — single grocery item → one of the household's category names. Falls back to `'Övrigt'` on any failure.
- **`categorize-recipe`** — recipe name + ingredient list → one recipe category.
- **`parse-recipe`** — image (base64) → structured ingredients + instructions (OpenAI vision).
- **`import-recipe-url`** — URL → schema.org/Recipe JSON-LD → structured recipe.
- **`fetch-offers`** — scrapes store-offer pages (largest function, ~19 KB).

When changing a function, mirror any client-side type change in the matching hook.

---

## 7. Coding conventions

- **Imports.** Always use `@/...` instead of relative `../../...`. The alias is configured in both Vite and tsc.
- **TypeScript.** `verbatimModuleSyntax: true` — type-only imports must use `import type`. `noUnusedLocals` and `noUnusedParameters` are on; prefix intentionally-unused params with `_` (e.g. `(_err, _vars, ctx) => …` in mutation callbacks).
- **React Query.** Query keys are arrays starting with a domain string and ending with `householdId` (e.g. `['groceries', householdId]`). Mutations do **optimistic updates** with `onMutate`/`onError`/`onSettled` — follow the pattern in [src/hooks/useGroceries.ts](src/hooks/useGroceries.ts) when adding new ones.
- **No comments unless surprising.** The existing codebase is largely comment-free; identifiers carry the meaning. Only add a comment when the *why* would not be obvious to a reader.
- **Tailwind v4.** Imported via `@import "tailwindcss";` in [src/index.css](src/index.css); there is no `tailwind.config.js`. Custom keyframes/animations live in `index.css`.
- **No emojis in source** except in `NAV_ITEMS` icons in [src/lib/constants.ts](src/lib/constants.ts) (visible UI). User instructions say to avoid adding emojis elsewhere.
- **Names.** Grocery item names are passed through `capitalizeFirst()` ([src/lib/text.ts](src/lib/text.ts)) on insert.
- **iOS zoom guard.** Inputs are forced to `font-size: 16px` on mobile in [src/index.css](src/index.css) to stop Safari from zooming on focus. Don't override.

---

## 8. Gotchas — read these before you debug

1. **Categories are Swedish strings, stored verbatim.** The list lives in three places that must agree: [src/lib/constants.ts](src/lib/constants.ts) (UI fallback), [supabase/migrations/20260511120000_swedish_default_categories.sql](supabase/migrations/20260511120000_swedish_default_categories.sql) (seed), and the `household_categories` rows for each household. The fallback string is **`'Övrigt'`** — not `'Other'`. There is no English-to-Swedish translation helper; the previous one was deleted intentionally.

2. **Adding an item triggers a background AI call.** [src/hooks/useGroceries.ts](src/hooks/useGroceries.ts#L48-L62) inserts with `category: 'Övrigt'` and *then* fires `categorize-item` and patches the row. The optimistic UI row uses `'Övrigt'`; the realtime channel will deliver the patched category a moment later. If you see a flash of `'Övrigt'` followed by the real category — that's intentional.

3. **`household_id` comes from `useAuth()`, not props.** Every query hook does `const { householdId } = useAuth()` and bails with `enabled: !!householdId`. Don't pass household IDs around.

4. **Realtime only covers two tables.** Updates to `recipes`, `stores`, `aisle_orders`, etc. only show up after you re-fetch or after another action invalidates the cache. If a user reports "I added a store and it didn't appear on the other phone," that's by design unless you extend the realtime channel.

5. **Edge functions need `Authorization` forwarded.** They `getUser()` from the JWT and use it for RLS. The Supabase JS client does this automatically via `supabase.functions.invoke()`; if you ever call them with `fetch()`, you must forward the header yourself.

6. **`NewRecipeModal` is one big component** ([src/components/recipes/NewRecipeModal.tsx](src/components/recipes/NewRecipeModal.tsx), ~22 KB) handling create, edit, URL import, and multi-photo camera import. Be deliberate when editing — easy to break an unrelated flow.

7. **PWA caching.** [vite.config.ts](vite.config.ts) registers a service worker with `registerType: 'autoUpdate'` and a `NetworkFirst` rule for `*.supabase.co`. After a deploy, expect stale clients for one reload. The `public/` directory currently has `favicon.svg` and `icons.svg` but **not** the `pwa-192x192.png` / `pwa-512x512.png` referenced in the manifest — generate them before going to production if asked.

8. **Vercel rewrites everything to `/`** ([vercel.json](vercel.json)) so client-side routing works. Don't break that when configuring hosting.

9. **`.claude/` is gitignored.** Local Claude permissions and memory don't ship. Project memory the agent should know about is summarized at the top of every session (see `MEMORY.md` in the agent's memory dir, not the repo).

10. **No tests.** "Verify the change works" means: `npm run dev`, click through the affected flow, and check `npm run build` passes type-check + bundle. Don't claim a fix is verified if you only ran a build.

---

## 9. First-task checklist

Before opening a PR:

- [ ] `npm run build` passes (it runs `tsc -b` first — type errors block the build).
- [ ] `npm run lint` is clean.
- [ ] If you touched DB shape: added a new migration **and** updated [src/types/database.ts](src/types/database.ts).
- [ ] If you added a realtime-relevant table: published it and extended [src/hooks/useRealtime.ts](src/hooks/useRealtime.ts).
- [ ] If you added a hook: it uses `useAuth().householdId`, has `enabled: !!householdId`, and (for mutations) does an optimistic update with rollback.
- [ ] All new UI strings are in Swedish.
- [ ] No new comments unless they explain a non-obvious *why*.
- [ ] You actually ran the feature in `npm run dev` and watched it work.
