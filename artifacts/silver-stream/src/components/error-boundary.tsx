import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{ padding: 24, fontFamily: "monospace", direction: "ltr" }}>
          <h2 style={{ color: "red" }}>App Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
