import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
  errorInfo: { componentStack?: string | null } | null;
}

interface Props {
  children: ReactNode;
  /** Called when the user clicks Reset — e.g. to wipe transient game state. */
  onReset?: () => void;
}

/**
 * Root-level error boundary for the web client. Mirrors the mobile package's
 * ErrorBoundary so the two surfaces have parity: any thrown render error
 * lands in a panel with the message + stack and a Reset button instead of
 * leaving the user staring at a blank page.
 *
 * Class component because React only invokes componentDidCatch /
 * getDerivedStateFromError on class components — there's no hook for it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    this.setState({ errorInfo: info });
    // Surface to the browser console; production builds get this in any
    // crash-reporting tool the user wires up later.
    if (typeof console !== "undefined" && console.error) {
      console.error("ErrorBoundary caught", error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null });
    this.props.onReset?.();
  };

  reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { error, errorInfo } = this.state;
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex flex-col gap-4">
        <h1 className="text-red-300 text-2xl font-extrabold">Something went wrong</h1>
        <p className="text-white/60 text-sm leading-5">
          The app hit an unrecoverable error. Reset to clear the in-memory
          state, or Reload to fetch the latest code from the server.
        </p>
        <div className="bg-black/40 border border-white/10 rounded-lg max-h-[60vh] overflow-y-auto p-3 font-mono text-xs">
          <div className="text-amber-300 font-bold mb-1">{error.name}</div>
          <div className="text-red-300 mb-3 whitespace-pre-wrap">{error.message}</div>
          {errorInfo?.componentStack && (
            <pre className="text-white/45 leading-snug whitespace-pre-wrap">
              {errorInfo.componentStack}
            </pre>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={this.reset}
            className="self-start px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-sm transition-colors"
          >
            Reset
          </button>
          <button
            onClick={this.reload}
            className="self-start px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-sm transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
