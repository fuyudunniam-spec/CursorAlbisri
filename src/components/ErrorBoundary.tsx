import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-3">
                <p className="font-medium">Terjadi kesalahan</p>
                <p className="text-sm text-muted-foreground">
                  {this.state.error?.message || 'Something went wrong'}
                </p>
                <Button 
                  onClick={this.handleRetry}
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Coba Lagi
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;