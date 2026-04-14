import { ScrollView, View, Text, StyleSheet } from 'react-native';
import type { Card } from '@cards/shared';
import { CardView } from './CardView';

interface HandViewProps {
  hand: Card[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  isActive: boolean;
  energy: number;
  /** Stack cards vertically (landscape sidebar) instead of horizontally. */
  vertical?: boolean;
}

export function HandView({
  hand,
  selectedIndex,
  onSelect,
  isActive,
  energy,
  vertical,
}: HandViewProps) {
  if (hand.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No cards in hand</Text>
      </View>
    );
  }
  const items = hand.map((card, i) => {
    const tooExpensive = card.cost > energy;
    return (
      <View
        key={`${card.id}-${i}`}
        style={vertical ? styles.vItem : styles.hItem}
      >
        <CardView
          card={card}
          small
          selected={selectedIndex === i}
          disabled={!isActive || tooExpensive}
          energyShort={
            isActive && tooExpensive ? card.cost - energy : undefined
          }
          onPress={() => onSelect(i)}
        />
      </View>
    );
  });
  if (vertical) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.vContent}
      >
        {items}
      </ScrollView>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hContent}
    >
      {items}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hContent: { paddingHorizontal: 8, paddingVertical: 4 },
  vContent: { paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  hItem: { marginRight: 6 },
  vItem: { marginBottom: 6 },
  empty: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
});
