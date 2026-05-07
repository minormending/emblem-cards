import { View, Text, StyleSheet } from 'react-native';

export function EnergyBar({ current, max }: { current: number; max: number }) {
  const pips = Array.from({ length: max }, (_, i) => i < current);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>ENERGY</Text>
      <View style={styles.row}>
        {pips.map((filled, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              filled ? styles.pipFilled : styles.pipEmpty,
            ]}
          />
        ))}
        <Text style={styles.count}>
          {current}/{max}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pip: { width: 8, height: 14, borderRadius: 2 },
  pipFilled: { backgroundColor: '#fbbf24' },
  pipEmpty: { backgroundColor: 'rgba(255,255,255,0.1)' },
  count: { color: '#fff', fontSize: 11, marginLeft: 6, fontWeight: '700' },
});
