import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 mx-auto max-w-lg bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_#000] text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FFCCD5] border-3 border-black shadow-[3px_3px_0px_#000] flex items-center justify-center mx-auto text-black">
            <AlertTriangle className="w-8 h-8 text-black" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-black">Component Recovered</h3>
            <p className="text-xs font-bold text-zinc-700 mt-1 leading-relaxed">
              A temporary interface issue occurred. Your lecture notes and data are safely saved.
            </p>
          </div>
          <div className="flex gap-3 pt-2 justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="py-2.5 px-5 rounded-xl border-2 border-black bg-[#C7E9DE] hover:bg-[#aee0d1] text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="py-2.5 px-5 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 text-xs font-black text-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
