import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLogStore, type LogEntryType } from '../store/logStore';

/**
 * One-line peek at the most recent log entry. Tapping it opens the full
 * battle log in a bottom-sheet modal — so players get both an ambient
 * sense of what just happened and a quick path to the full history.
 */

const typeColor: Record<LogEntryType, string> = {
  deploy: '#60a5fa',
  attack: '#f87171',
  item: '#34d399',
  'end-turn': '#fbbf24',
  ko: '#f87171',
  system: '#9ca3af',
};

export function MiniLog() {
  const [open, setOpen] = useState(false);
  const entries = useLogStore((s) => s.entries);
  const latest = entries[entries.length - 1];
  if (!latest) return null;
  return (
    <>
      <Pressable style={styles.wrap} onPress={() => setOpen(true)}>
        <Text style={styles.meta}>T{latest.turn}</Text>
        <Text
          style={[styles.text, { color: typeColor[latest.type] }]}
          numberOfLines={1}
        >
          {latest.text}
        </Text>
        <Text style={styles.count}>{entries.length}</Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <Text style={styles.title}>Battle Log</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {entries
                .slice()
                .reverse()
                .map((entry) => (
                  <View key={entry.id} style={styles.entry}>
                    <Text style={styles.entryMeta}>
                      T{entry.turn} · {entry.player}
                    </Text>
                    <Text
                      style={[styles.entryText, { color: typeColor[entry.type] }]}
                    >
                      {entry.text}
                    </Text>
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  meta: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  text: { flex: 1, fontSize: 11, fontWeight: '600' },
  count: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    height: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  close: { color: '#9ca3af', fontSize: 13 },
  entry: {
    paddingVertical: 6,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
  },
  entryMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  entryText: { fontSize: 13, marginTop: 2 },
});
