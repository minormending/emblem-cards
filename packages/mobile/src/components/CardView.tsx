import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import type {
  Card,
  UnitCard,
  WeaponCard,
  ItemCard,
  SupportCard,
  TacticCard,
} from '@cards/shared';
import { attackTypeHex, attackTypeLabels, cardTypeColor } from '../lib/colors';
import { effectLabel } from '../lib/effects';
import { useGameStore } from '../store/gameStore';
import { CardArt } from './CardArt';

interface CardViewProps {
  card: Card;
  onPress?: () => void;
  selected?: boolean;
  small?: boolean;
  disabled?: boolean;
  energyShort?: number;
}

function getBorder(card: Card): string {
  if (card.type === 'unit' || card.type === 'weapon')
    return attackTypeHex[card.attackType];
  return cardTypeColor[card.type];
}

export function CardView({
  card,
  onPress,
  selected,
  small,
  disabled,
  energyShort,
}: CardViewProps) {
  const setInspectedCard = useGameStore((s) => s.setInspectedCard);
  const borderColor = getBorder(card);
  const width = small ? 112 : 152;

  const handlePress = disabled ? () => setInspectedCard(card) : onPress;
  const handleLongPress = () => setInspectedCard(card);

  const containerStyle: ViewStyle = {
    width,
    borderColor,
    borderWidth: 2,
    borderRadius: 12,
    padding: small ? 8 : 10,
    backgroundColor: '#1f2937',
    opacity: disabled ? 0.5 : 1,
  };
  if (selected) {
    containerStyle.borderColor = '#f59e0b';
    containerStyle.transform = [{ translateY: -4 }];
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={containerStyle}
    >
      <View style={styles.costBadge}>
        <Text style={styles.costText}>{card.cost}</Text>
      </View>

      <View style={styles.artWrap}>
        <CardArt
          card={card}
          height={small ? 48 : 64}
          width={small ? 96 : 132}
        />
        {energyShort != null && energyShort > 0 && (
          <View style={styles.energyOverlay}>
            <Text style={styles.energyShortText}>Need {energyShort} more</Text>
          </View>
        )}
      </View>

      {card.type === 'unit' && <UnitBody card={card} small={small} />}
      {card.type === 'weapon' && <WeaponBody card={card} small={small} />}
      {card.type === 'item' && <SimpleBody card={card} label="Item" small={small} />}
      {card.type === 'tactic' && (
        <SimpleBody card={card} label="Tactic" small={small} />
      )}
      {card.type === 'support' && <SupportBody card={card} small={small} />}
    </Pressable>
  );
}

function UnitBody({ card, small }: { card: UnitCard; small?: boolean }) {
  return (
    <>
      <View style={styles.rowBetween}>
        <Text style={styles.metaText}>{card.class.toUpperCase()}</Text>
        <Text style={styles.metaText}>{attackTypeLabels[card.attackType]}</Text>
      </View>
      <Text style={[styles.name, small && styles.nameSmall]}>{card.name}</Text>
      {card.isLord && (
        <View style={styles.lordBadge}>
          <Text style={styles.lordText}>LORD</Text>
        </View>
      )}
      <View style={styles.statsGrid}>
        <Stat label="HP" value={card.stats.hp} color="#f87171" />
        <Stat label="STR" value={card.stats.str} color="#fdba74" />
        <Stat label="MAG" value={card.stats.mag} color="#c4b5fd" />
        <Stat label="DEF" value={card.stats.def} color="#93c5fd" />
        <Stat label="RES" value={card.stats.res} color="#d8b4fe" />
        <Stat label="SPD" value={card.stats.spd} color="#86efac" />
      </View>
      <Effects effects={card.effects} />
    </>
  );
}

function WeaponBody({ card, small }: { card: WeaponCard; small?: boolean }) {
  const boosts = Object.entries(card.statBoost)
    .filter(([, v]) => v !== undefined && v !== 0)
    .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
    .join(', ');
  return (
    <>
      <View style={styles.rowBetween}>
        <Text style={styles.metaText}>WEAPON</Text>
        <Text style={styles.metaText}>{attackTypeLabels[card.attackType]}</Text>
      </View>
      <Text style={[styles.name, small && styles.nameSmall]}>{card.name}</Text>
      {boosts.length > 0 && <Text style={styles.boosts}>{boosts}</Text>}
      <Effects effects={card.effects} />
    </>
  );
}

function SimpleBody({
  card,
  label,
  small,
}: {
  card: ItemCard | TacticCard;
  label: string;
  small?: boolean;
}) {
  return (
    <>
      <Text style={styles.metaText}>{label.toUpperCase()}</Text>
      <Text style={[styles.name, small && styles.nameSmall]}>{card.name}</Text>
      <Effects effects={card.effects} />
    </>
  );
}

function SupportBody({ card, small }: { card: SupportCard; small?: boolean }) {
  return (
    <>
      <Text style={styles.metaText}>SUPPORT</Text>
      <Text style={[styles.name, small && styles.nameSmall]}>{card.name}</Text>
      <Text style={styles.support}>
        {card.pairRequirement.classA === card.pairRequirement.classB
          ? `2× ${card.pairRequirement.classA}`
          : `${card.pairRequirement.classA} or ${card.pairRequirement.classB}`}
      </Text>
      <Effects effects={card.effects} />
    </>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Text style={{ color, fontSize: 10, width: '33%' }}>
      {label} <Text style={{ fontWeight: 'bold' }}>{value}</Text>
    </Text>
  );
}

function Effects({ effects }: { effects: { kind: string }[] }) {
  if (effects.length === 0) return null;
  return (
    <View style={{ marginTop: 4, gap: 2 }}>
      {(effects as any).map((e: any, i: number) => (
        <Text key={i} style={styles.effect}>
          * {effectLabel(e)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  costBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  costText: { color: '#0b0d12', fontWeight: '900', fontSize: 12 },
  artWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metaText: { color: 'rgba(255,255,255,0.5)', fontSize: 9 },
  name: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  nameSmall: { fontSize: 12 },
  lordBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 4,
  },
  lordText: { color: '#fcd34d', fontSize: 9, fontWeight: '900' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 4,
    borderRadius: 4,
    rowGap: 2,
  },
  boosts: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  support: {
    color: '#7dd3fc',
    fontSize: 11,
    backgroundColor: 'rgba(14,165,233,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  effect: { color: '#fcd34d', fontSize: 10 },
  energyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  energyShortText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
