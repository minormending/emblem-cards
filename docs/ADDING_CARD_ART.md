# Adding card art

Every card (`UnitCard`, `WeaponCard`, `ItemCard`, `SupportCard`, `TacticCard`) has an optional `art?: string` field.

- **Web client**: when `art` is present, [`CardArt`](../packages/client/src/components/CardArt.tsx) draws the image inside the card's art panel via an SVG `<image href=…>`; when absent, it falls back to a procedural SVG silhouette colored by the card's attack type or category.
- **Mobile client**: [`CardArt`](../packages/mobile/src/components/CardArt.tsx) uses `react-native-svg`. It currently **only** renders the procedural silhouette — the `art` URL field is ignored on mobile. See "Mobile support" below if you need bitmap art there.

There is no asset pipeline, import step, or image manifest on the web client. Drop a file in `public/cards/`, set the path on the card, done.

## Web: steps

1. **Drop the file** into [`packages/client/public/cards/`](../packages/client/public/cards/) (create the folder if it doesn't exist). Vite serves everything under `public/` from the site root, so a file at `public/cards/knight.webp` is reachable at `/cards/knight.webp` in both dev and prod.

2. **Reference it** on the card definition in the JSON file under [`packages/card-engine/src/cards/data/`](../packages/card-engine/src/cards/data/):

   ```json
   {
     "type": "unit",
     "id": "knight-1",
     "name": "Knight",
     "art": "/cards/knight.webp"
   }
   ```

3. **Rebuild + reload:**
   ```bash
   pnpm --filter @cards/card-engine build
   ```
   The full card view and the mini field-slot art both pick it up automatically — no codegen.

## File conventions

| Convention  | Choice                                                                                  |
| ----------- | --------------------------------------------------------------------------------------- |
| Format      | `.webp` preferred (smaller); `.png` fine; `.jpg` ok for photographic art; avoid `.gif`. |
| Aspect      | The art panel is **100 × 80** (5:4). Art is `xMidYMid slice`-cropped, so safe-zone matters more than exact dimensions. |
| Resolution  | 400 × 320 or larger. Retina-scale for sharpness.                                        |
| Filename    | Match the card `id`, e.g. `knight-1.webp`, `sword-iron.webp`.                           |
| Path        | Always start with `/cards/…` (absolute from site root).                                 |

## External URLs

`art` is just a string passed to `<image href=…>` on the web. A full URL works:

```json
"art": "https://cdn.example.com/cards/knight.webp"
```

If you go that route, make sure the CDN allows cross-origin image loads and, for production, that the domain is listed wherever you harden Caddy's CSP.

## Removing art

Delete the `art` field — the procedural fallback renders automatically. Delete the orphaned file from `public/cards/` to avoid shipping dead bytes.

## Where the rendering happens

- Web: [`CardArt`](../packages/client/src/components/CardArt.tsx) — large art panel in hand / deck builder / card inspector. `CardArtMini` in the same file — compact art inside field slots.
- Mobile: [`CardArt`](../packages/mobile/src/components/CardArt.tsx) + `CardArtMini` — RN-SVG equivalents of the above.

Both web + mobile check the card type and dispatch to per-class icons (`UnitIcon`, `WeaponIcon`, etc.). The web version also honors the `art` URL; the mobile version ignores it.

## Mobile support for bitmap art

If you want the bitmap art you added for the web to also show up in the Android app:

1. Copy the image into `packages/mobile/assets/cards/` (not `public/` — mobile has no public folder; the file becomes a bundled asset).
2. Wire a `require()` map into [`CardArt.tsx`](../packages/mobile/src/components/CardArt.tsx) keyed by `card.id` — React Native needs static `require()` calls at bundle time, it can't resolve dynamic paths.
3. Render an `<Image>` component alongside the existing SVG, conditionally, when the map has an entry for the current card.

This is a small feature we haven't built yet. Ask a dev if it becomes a priority — until then the mobile app ships with just the procedural-art look, which is intentional.
