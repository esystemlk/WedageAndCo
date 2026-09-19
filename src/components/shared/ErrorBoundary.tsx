import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** When this value changes (e.g. the route path), the boundary resets. */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render/runtime errors in the page tree so a single broken component
 * shows a recoverable message instead of white-screening the whole app. The
 * surrounding shell (sidebar, header) stays usable, and navigating to another
 * route resets the boundary (via resetKey).
 *
 * NOTE: this project ships no React type definitions, so the React.Component
 * base members aren't typed here — hence the small `this as any` casts.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  componentDidUpdate(prev: Props) {
    const self = this as any;
    if (this.state.hasError && prev.resetKey !== self.props.resetKey) {
      self.setState({ hasError: false, error: null });
    }
  }

  render() {
    const self = this as any;
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Something went wrong on this page</h2>
            <p className="text-sm text-gray-500 font-bold mt-1 max-w-md">
              The rest of the app is still working. Try reloading this page, or go back and open it again.
            </p>
          </div>
          {this.state.error?.message && (
            <pre className="max-w-xl overflow-x-auto text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded-xl p-3 text-left">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload Page
          </button>
        </div>
      );
    }
    return self.props.children;
  }
}

export default ErrorBoundary;
