# Adding card art

Every card (`UnitCard`, `WeaponCard`, `ItemCard`, `SupportCard`, `TacticCard`)
has an optional `art?: string` field. When present, the renderer
([`CardArt`](../packages/client/src/components/CardArt.tsx)) draws the image
inside the card's art panel; when absent, it falls back to the procedural
SVG silhouette colored by the card's attack type or category.

There is no asset pipeline, import step, or image manifest. Drop the file in
`public/`, set the path on the card, done.

## Steps

1. **Drop the file** into
   [`packages/client/public/cards/`](../packages/client/public/cards/)
   (create the folder if it doesn't exist). Vite serves everything under
   `public/` from the site root, so the file at
   `public/cards/lord-marth.webp` is reachable at `/cards/lord-marth.webp`
   in both dev and prod.

2. **Reference it** on the card definition in
   [`packages/card-engine/src/cards/`](../packages/card-engine/src/cards/) —
   `units.ts`, `weapons.ts`, `items.ts`, `supports.ts`, or `tactics.ts`:

   ```ts
   {
     type: "unit",
     id: "lord-marth",
     name: "Marth",
     // ...
     art: "/cards/lord-marth.webp",
   }
   ```

3. **Reload.** No build step, no codegen. The full card view and the mini
   field-slot art both pick it up automatically.

## File conventions

| Convention  | Choice                                                                                  |
| ----------- | --------------------------------------------------------------------------------------- |
| Format      | `.webp` preferred (smaller); `.png` fine; `.jpg` ok for photographic art; avoid `.gif`. |
| Aspect      | The art panel is **100 × 80** (5:4). Art is `xMidYMid slice`-cropped, so safe-zone matters more than exact dimensions. |
| Resolution  | 400 × 320 or larger. Retina-scale for sharpness.                                        |
| Filename    | Match the card `id`, e.g. `lord-marth.webp`, `sword-iron.webp`.                         |
| Path        | Always start with `/cards/…` (absolute from site root).                                 |

## External URLs

`art` is just a string passed to `<image href=…>`. A full URL works:

```ts
art: "https://cdn.example.com/cards/marth.webp",
```

If you go that route, make sure the CDN allows cross-origin image loads and,
for production, that the domain is listed wherever you harden Caddy's CSP.

## Removing art

Delete the `art` field (or set it to `undefined`) — the procedural fallback
renders automatically. No other cleanup needed, though you should also delete
the orphaned file from `public/cards/` to avoid shipping dead bytes.

## Where the rendering happens

- [`CardArt`](../packages/client/src/components/CardArt.tsx) — the large art
  panel used in hand / deck builder / card inspector.
- `CardArtMini` (same file) — the compact art used inside field slots.

Both check `card.art` first and only fall back to the procedural SVG icons
(`UnitIcon`, `WeaponIcon`, etc.) when `art` is unset.
