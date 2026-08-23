import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown instead of the default page when this subtree throws. */
  fallback?: (reset: () => void, error: Error) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence: a render error anywhere below this boundary shows a
 * readable recovery screen instead of a blank page. Route-level boundaries wrap
 * each page so a single bad page cannot take down the shell/navigation.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No telemetry backend in scope; keep one structured record for debugging.
    console.error('[shorebound] render error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset, error);

    return (
      <div className="errpage">
        <p className="lab lab-blue">Something broke</p>
        <h1 style={{ margin: '4px 0 12px' }}>This screen failed to load</h1>
        <p className="mut" style={{ marginBottom: 'var(--s4)' }}>
          The rest of the guide still works — the bundled location, species and
          handling content does not need a network connection.
        </p>
        <div className="row g2 wrap" style={{ marginBottom: 'var(--s5)' }}>
          <button type="button" className="btn btn-blue" onClick={this.reset}>
            Try again
          </button>
          <a className="btn btn-ghost" href={import.meta.env.BASE_URL}>
            Back to the guide
          </a>
        </div>
        <pre>{error.message}</pre>
      </div>
    );
  }
}
