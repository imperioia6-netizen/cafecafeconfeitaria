import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 rounded-xl border border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <h3 className="font-semibold text-destructive mb-1">Algo deu errado nesta página</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            {this.state.error.message}
          </p>
          <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, error: null })}>
            Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
