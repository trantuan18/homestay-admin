import { Component, ErrorInfo, ReactNode } from "react";
import { ErrorState } from "./ErrorState";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled UI error", error, errorInfo);
  }

  retry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return <ErrorState error={this.state.error} onRetry={this.retry} />;
    }
    return this.props.children;
  }
}
