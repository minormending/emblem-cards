# Adding card art

Card art is served as a PNG (or other browser-supported image) from
[`packages/client/public/cards/`](../packages/client/public/cards/). The
filename is the card `id` — there is **no `art` field on cards and no
manifest to edit**. Drop a file in the directory named to match, run
`pnpm cards:check`, done.

> Runtime behavior is implemented in
> [`packages/client/src/components/CardArt.tsx`](../packages/client/src/components/CardArt.tsx).
> When the derived URL fails to load (no file, wrong name) the `onError`
> handler falls back to the procedural SVG silhouette and logs a
> dev-only `console.debug`.

## Where the URL comes from

```ts
// CardArt.tsx
function artUrlFor(cardId: string): string {
  return `${import.meta.env.BASE_URL}cards/${cardId}.png`;
}
```

- **Dev:** `BASE_URL` is `/`, so the URL is `/cards/<id>.png` and Vite
  serves the file from `public/cards/`.
- **Prod:** `BASE_URL` is whatever `VITE_BASE_PATH` was set to at build
  time (e.g. `/emblem/`), so the URL becomes `/emblem/cards/<id>.png` and
  hits the gateway's app-mounted static server. (Hardcoding `/cards/...`
  was the exact cause of the earlier "blank images on prod" bug — the
  request fell through to the root landing page, which returned HTML
  with a 200.)

## Web: steps

1. **Drop the file** into [`packages/client/public/cards/`](../packages/client/public/cards/).
   Vite serves every file in `public/` from the site root with no build
   step.

2. **Name it after the card `id`.** The ids in
   [`packages/card-engine/src/cards/data/units.json`](../packages/card-engine/src/cards/data/units.json)
   (and friends) look like `lord-marth`, `archer-wil`, `knight-oswin`. Use
   the same string, lowercase, plus `.png`:

   ```
   public/cards/lord-marth.png
   public/cards/archer-wil.png
   ```

3. **Validate:**

   ```bash
   pnpm cards:check
   ```

   The checker — [`packages/card-engine/scripts/check-cards.ts`](../packages/card-engine/scripts/check-cards.ts)
   — walks `public/cards/` and fails the run if any PNG doesn't map to a
   known card id. An orphan file (rename, typo, stale asset) is caught
   at build time rather than silently 404-ing in production.

4. **Reload.** Vite HMR will reload immediately in dev; in prod the next
   deploy picks it up. No codegen, no manifest edit, no code change.

## Aspect and sizing

- Rendered art slot is **100 × 80** (5:4) in viewBox units.
- In the hand the image uses `object-cover object-top` (fill width, top
  pinned, crop bottom).
- In the inspector / winner screen the image uses `object-contain` at
  2× height (letterboxed, whole image visible).
- Field slot thumbnails use `object-cover object-top` again, at whatever
  height the slot gives them.

Practical target: 400 × 320 PNG, subject in the **top ~60%** of the frame
so the crop in the hand view doesn't truncate the face.

## Naming + format rules

| Rule | Why |
| --- | --- |
| Lowercase, hyphenated, matches the card `id` | Keeps the `/cards/<id>.png` URL convention; enforced by [`cards/schema.ts`](../packages/card-engine/src/cards/schema.ts) regex `^[a-z0-9-]+$`. |
| `.png` | The component hardcodes `.png`. Can be changed if you need `.webp`, but update `artUrlFor()` at the same time. |
| No spaces, no dots other than the extension, no path segments | Bounces off the schema regex; path-traversal can't happen. |

## Removing art

Delete the file from `public/cards/`. The fallback SVG silhouette renders
automatically. `pnpm cards:check` will pass — only *orphans* fail, never
*missing* art.

## Fallback rendering

`CardArt` always renders the gradient + procedural icon under the `<img>`
so the art loading doesn't flash through empty white space. When the
image fails (missing file, network blip) the `<img>` is hidden via state
and the fallback becomes visible. Every card type has a silhouette:

- Unit — tag/class-specific (flying, armored, mage, etc.)
- Weapon — attack-type-specific (sword, lance, tome…)
- Item / Support / Tactic — generic category icons

Behavior is centralized in `CardArt.tsx`; see the file for the dispatch.

## Mobile (React Native)

Mobile currently renders only the procedural SVG silhouettes — the
derived PNG URL is web-only. To bring bitmap art to Android you'd:

1. Copy the image to `packages/mobile/assets/cards/` (RN can't read from
   `public/`).
2. Build a `require()` map keyed by card id in
   [`packages/mobile/src/components/CardArt.tsx`](../packages/mobile/src/components/CardArt.tsx)
   — React Native needs static `require()` calls at bundle time.
3. Render an `<Image>` alongside the existing SVG when the map has an
   entry.

Not built yet; ask before shipping if this becomes a priority.

## Related reading

- [`../packages/client/src/components/CardArt.tsx`](../packages/client/src/components/CardArt.tsx) — the component
- [`../packages/card-engine/scripts/check-cards.ts`](../packages/card-engine/scripts/check-cards.ts) — validation
- [`../deploy/gateway/Caddyfile`](../deploy/gateway/Caddyfile) — CSP: `img-src 'self' data:` allows same-origin images only; external CDN art would need the CSP widened
