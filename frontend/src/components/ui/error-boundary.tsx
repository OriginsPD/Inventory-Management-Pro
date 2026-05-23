import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "./button";

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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#081326] text-[#d8e2fd] p-6 font-sans">
          <div className="glass-panel p-8 rounded-2xl max-w-md w-full space-y-6 glow-accent border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 border border-destructive/25 flex items-center justify-center text-destructive">
                <span className="material-symbols-outlined text-lg select-none">warning</span>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Station System Interrupted</h1>
                <p className="text-xs text-muted-foreground mt-0.5">An unexpected frontend runtime exception occurred.</p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 overflow-auto max-h-40 scrollbar-custom">
                <p className="text-[11px] font-mono text-destructive break-words font-semibold">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-[9px] font-mono text-muted-foreground/80 mt-2 whitespace-pre-wrap leading-relaxed">
                    {this.state.error.stack.split("\n").slice(0, 4).join("\n")}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={this.handleReset}
                className="w-full bg-primary text-[#081326] font-bold hover:brightness-110 active:scale-95 transition-all rounded-lg h-9.5"
              >
                Reload Station
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
