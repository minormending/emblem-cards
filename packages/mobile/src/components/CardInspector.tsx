import { Modal, View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { CardView } from './CardView';

export function CardInspector() {
  const card = useGameStore((s) => s.inspectedCard);
  const close = () => useGameStore.getState().setInspectedCard(null);

  return (
    <Modal
      transparent
      visible={!!card}
      animationType="fade"
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View onStartShouldSetResponder={() => true}>
            {card && <CardView card={card} />}
          </View>
        </ScrollView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    // flexGrow:1 lets the contentContainer fill the full ScrollView so
    // justifyContent can actually center the card vertically. Without it
    // the container shrinks to the card's height and pins to the top.
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
