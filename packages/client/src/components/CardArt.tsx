import { useId, useState } from "react";
import clsx from "clsx";
import type { Card } from "@cards/shared";
import { getCardGradient } from "@cards/shared";
import { CardIconSvg } from "./CardIconSvg";

/**
 * Standard art-slot heights used across the app. Picked a name for each
 * context so call sites don't pass raw pixel values.
 */
export const CARD_ART_HEIGHT = {
  handSmall: 48,
  hand: 72,
  detail: 144,
} as const;

/**
 * Art path convention: PNGs in `packages/client/public/cards/` named `<id>.png`.
 * Presence is validated by `pnpm cards:check`. At runtime we optimistically
 * try to load; onError we fall back to the SVG silhouette.
 *
 * `import.meta.env.BASE_URL` is `/` in dev and `/emblem/` (or whatever
 * `VITE_BASE_PATH` is set to) in production. Without this prefix the request
 * would bypass the app's mount point at the gateway and fall through to the
 * root landing page, which responds with index.html — the browser then can't
 * decode the HTML body as a PNG and shows a blank image.
 */
function artUrlFor(cardId: string): string {
  return `${import.meta.env.BASE_URL}cards/${cardId}.png`;
}

interface CardArtProps {
  card: Card;
  /** Pixel height. Ignored when `fill` is true. */
  height?: number;
  /** Fill parent's height instead of using `height`. Parent must be sized. */
  fill?: boolean;
  /** `cover` crops to fill the slot; `contain` letterboxes. */
  fit?: "cover" | "contain";
  /** Vertical alignment when `fit="cover"`. Ignored for `contain`. */
  align?: "top" | "center";
}

/**
 * Renders card art with a gradient/icon fallback underneath. Art is loaded
 * from `/cards/<id>.png`; if the file is missing, the img unmounts onError
 * and the SVG silhouette beneath becomes visible.
 */
export function CardArt({
  card,
  height = CARD_ART_HEIGHT.hand,
  fill = false,
  fit = "cover",
  align = "top",
}: CardArtProps) {
  const [from, to] = getCardGradient(card);
  // Unique ids keep gradients stable when the same card renders multiple times.
  const uid = useId().replace(/:/g, "");
  const gradId = `grad-${uid}`;
  const glowId = `glow-${uid}`;

  const [artFailed, setArtFailed] = useState(false);
  const showArt = !artFailed;
  // When cover-fit art is displayed, the img paints over the icon so we can
  // skip the icon DOM. The gradient itself is cheap and acts as a load/error
  // fallback background, so it always renders.
  const showIcon = !showArt || fit === "contain";

  return (
    <div
      className={clsx("relative w-full rounded-lg overflow-hidden")}
      style={fill ? { height: "100%" } : { height }}
    >
      <svg
        viewBox="0 0 100 80"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.08" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100" height="80" fill={`url(#${gradId})`} />
        {showIcon && <CardIconSvg card={card} />}
        <rect width="100" height="80" fill={`url(#${glowId})`} />
      </svg>
      {showArt && (
        <img
          src={artUrlFor(card.id)}
          alt={card.name}
          loading="lazy"
          decoding="async"
          onError={() => {
            if (import.meta.env.DEV) {
              // eslint-disable-next-line no-console
              console.debug(`[CardArt] no art for "${card.id}" — using icon fallback`);
            }
            setArtFailed(true);
          }}
          className={clsx(
            "absolute inset-0 w-full h-full pointer-events-none",
            fit === "contain" ? "object-contain" : "object-cover",
            fit === "cover" && (align === "top" ? "object-top" : "object-center"),
          )}
        />
      )}
    </div>
  );
}
