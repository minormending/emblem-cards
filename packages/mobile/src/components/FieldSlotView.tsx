import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { FieldSlot, FieldPosition } from '@cards/shared';
import type { CombatPreview } from '@cards/battle-engine';
import { attackTypeHex } from '../lib/colors';
import { useGameStore } from '../store/gameStore';
import { CombatFx } from './battle/CombatFx';
import { CardArtMini } from './CardArt';

interface FieldSlotViewProps {
  slot: FieldSlot;
  pos: FieldPosition;
  isOwn: boolean;
  isSelected: boolean;
  isDeployTarget: boolean;
  isAttackTarget: boolean;
  onPress: () => void;
  lastHit?: boolean;
  attackPreview?: CombatPreview | null;
  /** Optional width — lets parent size slots to fit the field on narrow screens. */
  size?: { width: number; height: number };
  /** Pulse ring + glow — shown while the related card-played overlay is up. */
  spotlight?: boolean;
}

export function FieldSlotView({
  slot,
  pos,
  isOwn,
  isSelected,
  isDeployTarget,
  isAttackTarget,
  onPress,
  lastHit,
  attackPreview,
  size,
  spotlight,
}: FieldSlotViewProps) {
  const { unit, weapon, hasActed } = slot;
  const setInspectedCard = useGameStore((s) => s.setInspectedCard);
  const borderColor = unit
    ? attackTypeHex[unit.attackType]
    : 'rgba(255,255,255,0.1)';

  const hpPercent =
    unit && unit.stats
      ? Math.max(0, Math.min(100, (unit.stats.hp / unit.maxHp) * 100))
      : 0;
  const hpColor =
    hpPercent > 60 ? '#10b981' : hpPercent > 30 ? '#f59e0b' : '#ef4444';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={unit ? () => setInspectedCard(unit) : undefined}
      style={[
        styles.slot,
        size && { width: size.width, height: size.height },
        { borderColor },
        !unit && styles.empty,
        isSelected && styles.selected,
        isDeployTarget && !unit && styles.deployTarget,
        isAttackTarget && unit && styles.attackTarget,
        lastHit && { borderColor: '#ef4444' },
        spotlight && styles.spotlit,
        isOwn && unit && hasActed && { opacity: 0.5 },
      ]}
    >
      {unit ? (
        <>
          <View style={styles.hpBar}>
            <View
              style={{
                height: '100%',
                width: `${hpPercent}%`,
                backgroundColor: hpColor,
              }}
            />
          </View>
          <View style={styles.artMiniWrap}>
            <CardArtMini card={unit} height={24} />
          </View>
          <Text style={styles.unitName} numberOfLines={1}>
            {unit.name}
          </Text>
          {unit.isLord && (
            <View style={styles.lordBadge}>
              <Text style={styles.lordText}>LORD</Text>
            </View>
          )}
          {(() => {
            const boost = weapon?.statBoost ?? {};
            const b = (k: keyof typeof boost) => boost[k] ?? 0;
            // Magical vs physical is decided by attackType, never by the
            // current stat values. A buff that pumps STR on a Mage must not
            // flip the display from MAG — the Mage still attacks magically.
            const isMage =
              unit.attackType === 'fire' ||
              unit.attackType === 'wind' ||
              unit.attackType === 'thunder';
            const atkBase = isMage ? unit.stats.mag : unit.stats.str;
            // STR/MAG are interchangeable attack-stat labels — a weapon
            // authored with +STR still powers a magical attacker, and
            // vice versa. Mirrors getWeaponBoost() in the damage engine.
            const rawAtkBoost = isMage ? b('mag') : b('str');
            const atkBoost = rawAtkBoost || (isMage ? b('str') : b('mag'));
            const def = unit.stats.def + b('def');
            const res = unit.stats.res + b('res');
            return (
              <>
                <Text style={styles.statsLine}>
                  <Text style={{ color: '#f87171' }}>{unit.stats.hp}</Text>
                  <Text style={styles.statLabel}> HP  </Text>
                  <Text style={{ color: atkBoost ? '#fbbf24' : '#fdba74' }}>
                    {atkBase + atkBoost}
                  </Text>
                  <Text style={styles.statLabel}> {isMage ? 'MAG' : 'STR'}</Text>
                </Text>
                <Text style={styles.statsLineSub}>
                  <Text style={{ color: '#93c5fd' }}>{def}</Text>
                  <Text style={styles.statLabel}> DEF  </Text>
                  <Text style={{ color: '#c4b5fd' }}>{res}</Text>
                  <Text style={styles.statLabel}> RES</Text>
                </Text>
              </>
            );
          })()}
          {weapon && (
            <View style={styles.weaponBadge}>
              <Text style={styles.weaponText} numberOfLines={1}>
                {weapon.name}
              </Text>
            </View>
          )}
          {isOwn && hasActed && (
            <View style={styles.doneBadge}>
              <Text style={styles.doneText}>Done</Text>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>+</Text>
      )}

      {attackPreview && <AttackPreview preview={attackPreview} />}

      <CombatFx side={isOwn ? 'own' : 'enemy'} pos={pos} />
    </Pressable>
  );
}

function AttackPreview({ preview }: { preview: CombatPreview }) {
  const { out, in: incoming, counters, attackerKOs, counterKOs } = preview;
  const outColor = attackerKOs ? '#fbbf24' : counterKOs ? '#fbbf24' : '#10b981';
  const inColor = counterKOs ? '#dc2626' : '#ef4444';
  return (
    <View style={styles.preview}>
      <View style={[styles.previewHalf, { backgroundColor: outColor }]}>
        <Text style={styles.previewText}>↑{out}</Text>
      </View>
      {counters && (
        <View style={[styles.previewHalf, { backgroundColor: inColor }]}>
          <Text style={styles.previewText}>↓{incoming}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: 92,
    height: 112,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 4,
  },
  empty: {
    backgroundColor: 'rgba(17,24,39,0.4)',
    borderStyle: 'dashed',
  },
  selected: { borderColor: '#f59e0b' },
  deployTarget: {
    borderColor: '#34d399',
    backgroundColor: 'rgba(6,78,59,0.4)',
    borderStyle: 'solid',
  },
  attackTarget: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(127,29,29,0.3)',
  },
  spotlit: {
    borderColor: '#fbbf24',
    borderWidth: 3,
    shadowColor: '#fbbf24',
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  hpBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  artMiniWrap: {
    width: '92%',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  unitName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  lordBadge: {
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderColor: '#f59e0b',
    borderWidth: 1,
    paddingHorizontal: 3,
    borderRadius: 2,
    marginTop: 2,
  },
  lordText: { color: '#fcd34d', fontSize: 8, fontWeight: '900' },
  statsLine: { fontSize: 10, marginTop: 2, fontWeight: '700' },
  statsLineSub: { fontSize: 9, marginTop: 1, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  weaponBadge: {
    marginTop: 3,
    backgroundColor: 'rgba(6,78,59,0.6)',
    borderColor: 'rgba(16,185,129,0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    maxWidth: '100%',
  },
  weaponText: { color: '#6ee7b7', fontSize: 9 },
  doneBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(55,65,81,0.8)',
    paddingHorizontal: 3,
    borderRadius: 3,
  },
  doneText: { color: '#9ca3af', fontSize: 8 },
  emptyText: { color: 'rgba(255,255,255,0.15)', fontSize: 22 },
  preview: {
    position: 'absolute',
    top: 4,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
  },
  previewHalf: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  previewText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});
