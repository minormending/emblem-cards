import { Component, type ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';

interface State {
  error: Error | null;
  errorInfo: { componentStack?: string | null } | null;
}

interface Props {
  children: ReactNode;
  /** Called when the user taps Reset — e.g. to wipe game state back to the menu. */
  onReset?: () => void;
}

/**
 * Root-level error boundary. Without this, any thrown render error leaves
 * the RN surface showing a permanent white screen with no way back. This
 * catches the throw, shows the user the message + stack, and offers a
 * Reset action that calls the optional onReset hook and remounts children.
 *
 * Class component because React only invokes componentDidCatch / static
 * getDerivedStateFromError on class components — there's no hook for it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ errorInfo: info });
    // Surface to whatever logging is wired up in dev; prod will capture via
    // native crash reporters when EAS builds are set up.
    if (typeof console !== 'undefined' && console.error) {
      console.error('ErrorBoundary caught', error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { error, errorInfo } = this.state;
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          The app hit an unrecoverable error. Tap Reset to return to the main menu.
        </Text>
        <ScrollView style={styles.detail} contentContainerStyle={{ padding: 12 }}>
          <Text style={styles.detailHeader}>{error.name}</Text>
          <Text style={styles.detailMessage}>{error.message}</Text>
          {errorInfo?.componentStack && (
            <Text style={styles.stack}>{errorInfo.componentStack}</Text>
          )}
        </ScrollView>
        <Pressable style={styles.btn} onPress={this.reset}>
          <Text style={styles.btnText}>Reset</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0d12',
    padding: 20,
    paddingTop: 60,
    gap: 12,
  },
  title: {
    color: '#fca5a5',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 18,
  },
  detail: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    maxHeight: 340,
  },
  detailHeader: {
    color: '#fbbf24',
    fontFamily: 'Menlo',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailMessage: {
    color: '#fca5a5',
    fontFamily: 'Menlo',
    fontSize: 12,
    marginBottom: 12,
  },
  stack: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Menlo',
    fontSize: 11,
    lineHeight: 15,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
