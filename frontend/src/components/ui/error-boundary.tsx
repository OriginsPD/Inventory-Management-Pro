import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { ErrorScreen } from "../screens/errors/ErrorScreen";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.location.assign("/");
  };

  public render() {
    if (this.state.hasError) {
      const details = import.meta.env.DEV && this.state.error
        ? `${this.state.error.name}: ${this.state.error.message}\n${this.state.error.stack?.split("\n").slice(0, 4).join("\n") || ""}`
        : undefined;

      return (
        <ErrorScreen
          status="Runtime"
          title="Station System Interrupted"
          description="An unexpected frontend runtime exception occurred. Reload the station or return to the dashboard."
          icon="warning"
          primaryLabel="Reload Station"
          secondaryLabel="Dashboard"
          onPrimary={this.handleReset}
          onSecondary={this.handleDashboard}
          details={details}
        />
      );
    }

    return this.props.children;
  }
}

