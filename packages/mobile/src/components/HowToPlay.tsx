import { useState, type ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';

interface Page {
  title: string;
  body: ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-use-before-define
const pagesRef = { current: null as Page[] | null };
function getPages(): Page[] {
  if (pagesRef.current) return pagesRef.current;
  pagesRef.current = buildPages();
  return pagesRef.current;
}

function buildPages(): Page[] {
  return [
  {
    title: 'How to Win',
    body: (
      <>
        <Text style={s.para}>
          Each player builds a 15-card deck with exactly one Lord — your
          commander.
        </Text>
        <Box tone="amber">
          <Text style={s.boxHeader}>You win when either:</Text>
          <Bullet>You defeat the enemy Lord</Bullet>
          <Bullet>Your opponent has no units left and no units in their deck</Bullet>
          <Bullet>Your opponent runs out of cards</Bullet>
        </Box>
        <Box tone="red">
          <Text style={[s.boxHeader, { color: '#fca5a5' }]}>You lose if:</Text>
          <Bullet>Your Lord is defeated</Bullet>
        </Box>
      </>
    ),
  },
  {
    title: 'The Battlefield',
    body: (
      <>
        <Text style={s.para}>
          Each side has two rows of three slots: a front row and a back row.
        </Text>
        <View style={s.fieldDiagram}>
          <Text style={s.diagramLabel}>Opponent</Text>
          <Row tone="dim" label="back" />
          <Row tone="red" label="front" />
          <View style={s.diagramSep} />
          <Row tone="red" label="front" />
          <Row tone="blue" label="back" />
          <Text style={s.diagramLabel}>You</Text>
        </View>
        <Bullet>Front-row units can attack the enemy front row.</Bullet>
        <Bullet>Back-row units cannot attack unless they are ranged or flying.</Bullet>
        <Bullet>Archers, mages, and flyers can hit the back row through gaps.</Bullet>
      </>
    ),
  },
  {
    title: 'Your Turn',
    body: (
      <>
        <Text style={s.para}>
          On your turn you can do as much as your energy allows.
        </Text>
        <Step num="1" color="#34d399" bold="Deploy cards">
          from your hand. Tap a card, then tap a field slot. Each card costs energy.
        </Step>
        <Step num="2" color="#f87171" bold="Attack">
          with your units. Tap one of your units on the field, then tap an enemy to fight.
        </Step>
        <Step num="3" color="#fbbf24" bold="End turn.">
          You draw a card and get more energy next turn.
        </Step>
        <Box tone="blue">
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            <Text style={{ color: '#93c5fd', fontWeight: '700' }}>Tip: </Text>
            Units you just deployed can't attack until next turn. Each unit can
            only attack once per turn.
          </Text>
        </Box>
      </>
    ),
  },
  {
    title: 'Combat Basics',
    body: (
      <>
        <Text style={s.para}>
          Physical attacks deal STR − DEF damage. Magic deals MAG − RES.
        </Text>
        <View style={s.triangleBox}>
          <Text style={s.triangleHeader}>Weapon Triangle</Text>
          <Text style={s.triangleLine}>
            <Text style={{ color: '#f87171' }}>Sword</Text>
            <Text style={s.triangleArrow}> → </Text>
            <Text style={{ color: '#34d399' }}>Axe</Text>
            <Text style={s.triangleArrow}> → </Text>
            <Text style={{ color: '#60a5fa' }}>Lance</Text>
            <Text style={s.triangleArrow}> → </Text>
            <Text style={{ color: '#f87171' }}>Sword</Text>
          </Text>
          <Text style={s.triangleNote}>Advantage gives +2 ATK in that fight.</Text>
        </View>
        <View style={s.triangleBox}>
          <Text style={s.triangleHeader}>Magic Triangle</Text>
          <Text style={s.triangleLine}>
            <Text style={{ color: '#fb923c' }}>Fire</Text>
            <Text style={s.triangleArrow}> → </Text>
            <Text style={{ color: '#34d399' }}>Wind</Text>
            <Text style={s.triangleArrow}> → </Text>
            <Text style={{ color: '#c084fc' }}>Thunder</Text>
            <Text style={s.triangleArrow}> → </Text>
            <Text style={{ color: '#fb923c' }}>Fire</Text>
          </Text>
        </View>
        <Text style={[s.para, { fontSize: 12 }]}>
          Archers deal <Text style={{ color: '#fcd34d', fontWeight: '700' }}>3× vs flying</Text>.
          Hammers deal <Text style={{ color: '#fcd34d', fontWeight: '700' }}>2× vs armored</Text>.
        </Text>
      </>
    ),
  },
  {
    title: 'Cards & Effects',
    body: (
      <>
        <Text style={s.para}>Your deck has five kinds of cards:</Text>
        <CardKind color="#9ca3af" label="Units">
          warriors you deploy to fight.
        </CardKind>
        <CardKind color="#10b981" label="Weapons">
          equip to a unit of matching type. Bows grant ranged.
        </CardKind>
        <CardKind color="#f59e0b" label="Items">
          potions, buffs, healing.
        </CardKind>
        <CardKind color="#0ea5e9" label="Supports">
          grant bonuses while any matching class is on your field.
        </CardKind>
        <CardKind color="#a855f7" label="Tactics">
          one-shot effects like damage, draws, and reposition.
        </CardKind>
        <Box tone="blue">
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            <Text style={{ color: '#93c5fd', fontWeight: '700' }}>Long-press </Text>
            any card to inspect it. Tap cards you can't afford to see their full text.
          </Text>
        </Box>
      </>
    ),
  },
  ];
}

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const pages = getPages();
  const [pageIndex, setPageIndex] = useState(0);
  const page = pages[pageIndex];
  const isLast = pageIndex === pages.length - 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          <View style={s.dots}>
            {pages.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setPageIndex(i)}
                style={[
                  s.dot,
                  i === pageIndex ? s.dotActive : s.dotIdle,
                ]}
              />
            ))}
          </View>

          <Text style={s.title}>{page.title}</Text>

          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10 }}>
            {page.body}
          </ScrollView>

          <View style={s.buttons}>
            {pageIndex > 0 && (
              <Pressable
                style={[s.btn, s.btnGhost]}
                onPress={() => setPageIndex((i) => i - 1)}
              >
                <Text style={s.btnText}>Back</Text>
              </Pressable>
            )}
            <Pressable
              style={[s.btn, isLast ? s.btnPrimary : s.btnBlue]}
              onPress={() => (isLast ? onClose() : setPageIndex((i) => i + 1))}
            >
              <Text style={[s.btnText, { color: '#fff', fontWeight: '800' }]}>
                {isLast ? "Let's Play" : 'Next'}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={onClose} style={{ marginTop: 6 }}>
            <Text style={s.skip}>Skip tutorial</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <Text style={s.bullet}>
      <Text style={{ color: 'rgba(255,255,255,0.4)' }}>•  </Text>
      <Text>{children}</Text>
    </Text>
  );
}

function Box({
  tone,
  children,
}: {
  tone: 'amber' | 'red' | 'blue';
  children: ReactNode;
}) {
  const bg =
    tone === 'amber'
      ? 'rgba(245,158,11,0.1)'
      : tone === 'red'
      ? 'rgba(239,68,68,0.1)'
      : 'rgba(59,130,246,0.1)';
  const border =
    tone === 'amber'
      ? 'rgba(245,158,11,0.3)'
      : tone === 'red'
      ? 'rgba(239,68,68,0.3)'
      : 'rgba(59,130,246,0.3)';
  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        gap: 4,
      }}
    >
      {children}
    </View>
  );
}

function Row({ tone, label }: { tone: 'dim' | 'red' | 'blue'; label: string }) {
  const border =
    tone === 'red'
      ? 'rgba(248,113,113,0.5)'
      : tone === 'blue'
      ? 'rgba(96,165,250,0.5)'
      : 'rgba(255,255,255,0.2)';
  const bg =
    tone === 'red'
      ? 'rgba(127,29,29,0.4)'
      : tone === 'blue'
      ? 'rgba(30,58,138,0.4)'
      : 'rgba(31,41,55,0.4)';
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 44,
            height: 28,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: bg,
            borderRadius: 4,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, opacity: 0.75 }}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Step({
  num,
  color,
  bold,
  children,
}: {
  num: string;
  color: string;
  bold: string;
  children: ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ color, fontWeight: '700', width: 16 }}>{num}.</Text>
      <Text style={{ color: 'rgba(255,255,255,0.8)', flex: 1, fontSize: 13 }}>
        <Text style={{ color, fontWeight: '700' }}>{bold} </Text>
        {children}
      </Text>
    </View>
  );
}

function CardKind({
  color,
  label,
  children,
}: {
  color: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderLeftWidth: 2,
        borderLeftColor: color,
        paddingHorizontal: 8,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 13 }}>
        <Text style={{ color, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)' }}> — {children}</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 12,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: '#fbbf24' },
  dotIdle: { width: 6, backgroundColor: 'rgba(255,255,255,0.2)' },
  title: {
    color: '#fcd34d',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
  },
  para: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 18 },
  bullet: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  boxHeader: { color: '#fcd34d', fontWeight: '700', fontSize: 13, marginBottom: 4 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnBlue: { backgroundColor: '#2563eb' },
  btnPrimary: { backgroundColor: '#dc2626' },
  btnText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' },
  skip: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
  },
  fieldDiagram: { alignItems: 'center', gap: 4, marginVertical: 8 },
  diagramLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  diagramSep: {
    width: 128,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 2,
  },
  triangleBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 10,
  },
  triangleHeader: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  triangleLine: { fontSize: 13, textAlign: 'center' },
  triangleArrow: { color: 'rgba(255,255,255,0.3)' },
  triangleNote: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
});
