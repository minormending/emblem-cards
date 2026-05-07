import { Image, View, type ImageSourcePropType, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import type { Card } from '@cards/shared';
import { getCardGradient } from '@cards/shared';
import { CardIconSvg } from './CardIconSvg';

// Static require() map — React Native resolves every require() at bundle time,
// so we can't compute the path from a card id at runtime. Each PNG mirrors the
// web client's `public/cards/<id>.png` asset. Missing ids fall through to the
// procedural SVG silhouette that lives underneath.
const cardArtAssets: Record<string, ImageSourcePropType> = {
  'archer-wil': require('../../assets/cards/archer-wil.png'),
  'berserker-hawkeye': require('../../assets/cards/berserker-hawkeye.png'),
  'cleric-serra': require('../../assets/cards/cleric-serra.png'),
  'general-wallace': require('../../assets/cards/general-wallace.png'),
  'knight-oswin': require('../../assets/cards/knight-oswin.png'),
  'lord-ephraim': require('../../assets/cards/lord-ephraim.png'),
  'lord-marth': require('../../assets/cards/lord-marth.png'),
  'mage-lilina': require('../../assets/cards/mage-lilina.png'),
  'mage-lugh': require('../../assets/cards/mage-lugh.png'),
  'mage-nino': require('../../assets/cards/mage-nino.png'),
  'mercenary-raven': require('../../assets/cards/mercenary-raven.png'),
  'pegasus-florina': require('../../assets/cards/pegasus-florina.png'),
  'shaman-canas': require('../../assets/cards/shaman-canas.png'),
  'swordmaster-karel': require('../../assets/cards/swordmaster-karel.png'),
  'thief-matthew': require('../../assets/cards/thief-matthew.png'),
  'troubadour-priscilla': require('../../assets/cards/troubadour-priscilla.png'),
  'wyvern-heath': require('../../assets/cards/wyvern-heath.png'),
};

function artSource(card: Card): ImageSourcePropType | null {
  return cardArtAssets[card.id] ?? null;
}

let gradCounter = 0;
function nextId() {
  return `ca${gradCounter++}`;
}

interface CardArtProps {
  card: Card;
  height?: number;
  width?: number | string;
}

export function CardArt({ card, height = 72, width = '100%' }: CardArtProps) {
  const [from, to] = getCardGradient(card);
  const gradId = nextId();
  const glowId = nextId();
  const bitmap = artSource(card);

  // Art is top-anchored: render the Image at its native aspect ratio (80:72)
  // so the wrapper's overflow:hidden crops the excess off the bottom. We need
  // explicit numeric pixel dimensions — Fabric doesn't propagate container
  // aspectRatio constraints down to the Image in a way that cover / contain
  // can use. Falls back to a reasonable estimate when width is '%'.
  const numericWidth =
    typeof width === 'number' ? width : typeof height === 'number' ? height * 2 : 96;
  const imgHeight = numericWidth * (72 / 80);

  return (
    <View style={[styles.wrap, { width: width as number | `${number}%`, height }]}>
      <Svg
        viewBox="0 0 100 80"
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0%" stopColor={from} />
            <Stop offset="100%" stopColor={to} />
          </LinearGradient>
          <RadialGradient id={glowId} cx="50%" cy="40%" r="50%">
            <Stop offset="0%" stopColor="white" stopOpacity={0.08} />
            <Stop offset="100%" stopColor="white" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={100} height={80} fill={`url(#${gradId})`} />
        <CardIconSvg card={card} />
        <Rect width={100} height={80} fill={`url(#${glowId})`} />
      </Svg>
      {bitmap && (
        <Image
          source={bitmap}
          style={[styles.bitmapBase, { width: numericWidth, height: imgHeight }]}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

export function CardArtMini({
  card,
  height = 32,
  width = 72,
}: {
  card: Extract<Card, { type: 'unit' }>;
  height?: number;
  width?: number;
}) {
  const [from, to] = getCardGradient(card);
  const gradId = nextId();
  const bitmap = artSource(card);
  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg
        viewBox="0 0 100 80"
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0%" stopColor={from} />
            <Stop offset="100%" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width={100} height={80} fill={`url(#${gradId})`} />
        <CardIconSvg card={card} />
      </Svg>
      {bitmap && (
        <Image
          source={bitmap}
          style={[styles.bitmapBase, { width, height: width * (72 / 80) }]}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  // Explicit numeric width/height drawn from the parent's `width` prop so the
  // Image is guaranteed to render at native 80:72 aspect. Anchored at top:0
  // so the parent's overflow:hidden crops the bottom (matches the web
  // client's `object-cover object-top` — face stays pinned up).
  bitmapBase: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
