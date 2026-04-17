import { Image, View, type ImageSourcePropType, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  G,
  Path,
  Line,
  Circle,
  Polygon,
  Ellipse,
} from 'react-native-svg';
import type { Card, AttackType } from '@cards/shared';

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

const attackTypeGradients: Record<AttackType, [string, string]> = {
  sword: ['#991b1b', '#450a0a'],
  axe: ['#166534', '#052e16'],
  lance: ['#1e40af', '#172554'],
  bow: ['#854d0e', '#422006'],
  fire: ['#c2410c', '#7c2d12'],
  wind: ['#047857', '#064e3b'],
  thunder: ['#6d28d9', '#3b0764'],
};

const typeGradients: Record<string, [string, string]> = {
  item: ['#065f46', '#022c22'],
  support: ['#0c4a6e', '#082f49'],
  tactic: ['#581c87', '#3b0764'],
};

function getGradient(card: Card): [string, string] {
  if (card.type === 'unit' || card.type === 'weapon') {
    return attackTypeGradients[card.attackType];
  }
  return typeGradients[card.type] ?? ['#374151', '#111827'];
}

// ── Icons ─────────────────────────────────────────────────────────────────

function UnitIcon({ card }: { card: Extract<Card, { type: 'unit' }> }) {
  if (card.tags.includes('flying')) {
    return (
      <G translateX={24} translateY={16} scale={0.52}>
        <Path
          d="M50 20 L30 50 L10 40 L25 55 L15 80 L35 65 L50 85 L65 65 L85 80 L75 55 L90 40 L70 50 Z"
          fill="white"
          fillOpacity={0.25}
        />
        <Path
          d="M50 35 L42 55 L50 75 L58 55 Z"
          fill="white"
          fillOpacity={0.15}
        />
      </G>
    );
  }
  if (card.tags.includes('armored')) {
    return (
      <G translateX={24} translateY={18} scale={0.52}>
        <Rect x={25} y={15} width={50} height={60} rx={5} fill="white" fillOpacity={0.2} />
        <Rect x={30} y={20} width={40} height={25} rx={3} fill="white" fillOpacity={0.1} />
        <Rect x={35} y={50} width={30} height={20} rx={2} fill="white" fillOpacity={0.1} />
        <Circle cx={50} cy={32} r={6} fill="white" fillOpacity={0.15} />
      </G>
    );
  }
  if (card.class === 'Cleric') {
    return (
      <G translateX={24} translateY={18} scale={0.52}>
        <Rect x={44} y={20} width={12} height={55} rx={2} fill="white" fillOpacity={0.2} />
        <Rect x={30} y={35} width={40} height={12} rx={2} fill="white" fillOpacity={0.2} />
      </G>
    );
  }
  if (card.class === 'Mage') {
    return (
      <G translateX={24} translateY={16} scale={0.52}>
        <Circle cx={50} cy={30} r={15} fill="white" fillOpacity={0.15} />
        <Circle cx={50} cy={30} r={8} fill="white" fillOpacity={0.2} />
        <Path d="M50 45 L40 80 L50 75 L60 80 Z" fill="white" fillOpacity={0.15} />
        <Circle cx={35} cy={25} r={3} fill="white" fillOpacity={0.25} />
        <Circle cx={65} cy={25} r={3} fill="white" fillOpacity={0.25} />
        <Circle cx={50} cy={15} r={3} fill="white" fillOpacity={0.25} />
      </G>
    );
  }
  if (card.class === 'Thief') {
    return (
      <G translateX={24} translateY={18} scale={0.52}>
        <Circle cx={50} cy={25} r={10} fill="white" fillOpacity={0.15} />
        <Path
          d="M40 35 L35 70 L50 60 L65 70 L60 35 Z"
          fill="white"
          fillOpacity={0.15}
        />
        <Path
          d="M55 30 L75 20 L70 28 L78 25 L65 35"
          fill="none"
          stroke="white"
          strokeOpacity={0.25}
          strokeWidth={2}
        />
      </G>
    );
  }
  if (card.class === 'Archer') {
    return (
      <G translateX={24} translateY={16} scale={0.52}>
        <Path
          d="M30 75 C30 30, 70 30, 70 75"
          fill="none"
          stroke="white"
          strokeOpacity={0.25}
          strokeWidth={3}
        />
        <Line
          x1={50}
          y1={20}
          x2={50}
          y2={75}
          stroke="white"
          strokeOpacity={0.2}
          strokeWidth={2}
        />
        <Polygon points="50,15 46,25 54,25" fill="white" fillOpacity={0.3} />
      </G>
    );
  }
  if (card.class === 'Swordmaster') {
    return (
      <G translateX={24} translateY={14} scale={0.52}>
        <Line x1={50} y1={10} x2={50} y2={70} stroke="white" strokeOpacity={0.3} strokeWidth={3} />
        <Line x1={40} y1={68} x2={60} y2={68} stroke="white" strokeOpacity={0.25} strokeWidth={3} />
        <Circle
          cx={50}
          cy={40}
          r={12}
          fill="none"
          stroke="white"
          strokeOpacity={0.15}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <Circle
          cx={50}
          cy={40}
          r={20}
          fill="none"
          stroke="white"
          strokeOpacity={0.1}
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      </G>
    );
  }
  if (card.class === 'Berserker') {
    return (
      <G translateX={24} translateY={16} scale={0.52}>
        <Path
          d="M30 25 L50 75 L70 25"
          fill="none"
          stroke="white"
          strokeOpacity={0.3}
          strokeWidth={4}
        />
        <Line x1={25} y1={25} x2={75} y2={25} stroke="white" strokeOpacity={0.2} strokeWidth={3} />
        <Circle cx={50} cy={45} r={8} fill="white" fillOpacity={0.1} />
      </G>
    );
  }
  // Default lord silhouette
  return (
    <G translateX={24} translateY={16} scale={0.52}>
      <Circle cx={50} cy={25} r={12} fill="white" fillOpacity={0.15} />
      <Path d="M38 37 L30 75 L50 65 L70 75 L62 37 Z" fill="white" fillOpacity={0.15} />
      <Line x1={50} y1={5} x2={50} y2={25} stroke="white" strokeOpacity={0.1} strokeWidth={1} />
    </G>
  );
}

function WeaponIcon({ card }: { card: Extract<Card, { type: 'weapon' }> }) {
  const at = card.attackType;
  if (at === 'sword') {
    return (
      <G translateX={24} translateY={14} scale={0.52}>
        <Line x1={50} y1={10} x2={50} y2={65} stroke="white" strokeOpacity={0.3} strokeWidth={3} />
        <Line x1={38} y1={60} x2={62} y2={60} stroke="white" strokeOpacity={0.25} strokeWidth={4} />
        <Polygon points="50,10 46,18 54,18" fill="white" fillOpacity={0.25} />
      </G>
    );
  }
  if (at === 'axe') {
    return (
      <G translateX={24} translateY={14} scale={0.52}>
        <Line x1={50} y1={20} x2={50} y2={80} stroke="white" strokeOpacity={0.2} strokeWidth={3} />
        <Path
          d="M30 20 Q50 35 50 20 Q50 35 70 20 L60 40 L40 40 Z"
          fill="white"
          fillOpacity={0.25}
        />
      </G>
    );
  }
  if (at === 'lance') {
    return (
      <G translateX={24} translateY={12} scale={0.52}>
        <Line x1={50} y1={15} x2={50} y2={85} stroke="white" strokeOpacity={0.2} strokeWidth={2.5} />
        <Polygon points="50,10 42,30 58,30" fill="white" fillOpacity={0.3} />
      </G>
    );
  }
  if (at === 'bow') {
    return (
      <G translateX={24} translateY={14} scale={0.52}>
        <Path
          d="M35 75 C35 30, 65 30, 65 75"
          fill="none"
          stroke="white"
          strokeOpacity={0.25}
          strokeWidth={3}
        />
        <Line x1={35} y1={75} x2={65} y2={75} stroke="white" strokeOpacity={0.15} strokeWidth={1.5} />
      </G>
    );
  }
  // Tomes (fire / wind / thunder)
  return (
    <G translateX={24} translateY={16} scale={0.52}>
      <Rect x={30} y={15} width={40} height={55} rx={3} fill="white" fillOpacity={0.15} />
      <Rect x={34} y={20} width={32} height={45} rx={2} fill="white" fillOpacity={0.08} />
      <Circle cx={50} cy={42} r={10} fill="white" fillOpacity={0.15} />
      <Circle cx={50} cy={42} r={5} fill="white" fillOpacity={0.2} />
    </G>
  );
}

function ItemIcon() {
  return (
    <G translateX={24} translateY={16} scale={0.52}>
      <Ellipse cx={50} cy={50} rx={18} ry={22} fill="white" fillOpacity={0.15} />
      <Ellipse cx={50} cy={28} rx={10} ry={6} fill="white" fillOpacity={0.2} />
      <Line x1={50} y1={34} x2={50} y2={45} stroke="white" strokeOpacity={0.1} strokeWidth={8} />
    </G>
  );
}

function SupportIcon() {
  return (
    <G translateX={24} translateY={18} scale={0.52}>
      <Circle cx={35} cy={40} r={14} fill="white" fillOpacity={0.15} />
      <Circle cx={65} cy={40} r={14} fill="white" fillOpacity={0.15} />
      <Path
        d="M42 35 L58 35 L55 50 L50 55 L45 50 Z"
        fill="white"
        fillOpacity={0.2}
      />
    </G>
  );
}

function TacticIcon() {
  return (
    <G translateX={24} translateY={16} scale={0.52}>
      <Polygon
        points="50,12 58,38 85,38 63,55 72,82 50,65 28,82 37,55 15,38 42,38"
        fill="white"
        fillOpacity={0.15}
      />
      <Polygon
        points="50,25 55,38 68,38 57,47 61,60 50,52 39,60 43,47 32,38 45,38"
        fill="white"
        fillOpacity={0.1}
      />
    </G>
  );
}

// ── Public ─────────────────────────────────────────────────────────────────

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
  const [from, to] = getGradient(card);
  const gradId = nextId();
  const glowId = nextId();
  const bitmap = artSource(card);

  // Fabric + react-native-svg 15 renders 0-width Svgs when width is passed as a
  // prop — a style object forces layout to pick it up correctly.
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
        {card.type === 'unit' && <UnitIcon card={card} />}
        {card.type === 'weapon' && <WeaponIcon card={card} />}
        {card.type === 'item' && <ItemIcon />}
        {card.type === 'support' && <SupportIcon />}
        {card.type === 'tactic' && <TacticIcon />}
        <Rect width={100} height={80} fill={`url(#${glowId})`} />
      </Svg>
      {bitmap && (
        <Image
          source={bitmap}
          style={StyleSheet.absoluteFill}
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
  const [from, to] = getGradient(card);
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
        <UnitIcon card={card} />
      </Svg>
      {bitmap && (
        <Image
          source={bitmap}
          style={StyleSheet.absoluteFill}
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
});
