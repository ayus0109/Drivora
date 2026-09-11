import React from 'react';
import { AlertTriangle, RefreshCw, LogOut, HardDrive } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Drivora Caught an unhandled UI error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndLogin = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
            {/* Header Icon */}
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm">
                <AlertTriangle className="h-8 w-8 stroke-[2.2]" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <HardDrive className="h-5 w-5 text-blue-600" />
              <span className="font-extrabold text-gray-900 tracking-tight text-lg">Drivora</span>
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-6">
              An unexpected display issue occurred. Your files and cloud storage are completely safe and intact.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Drivora</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] text-gray-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-gray-500" />
                <span>Clear Cache & Sign In Again</span>
              </button>
            </div>

            {/* Collapsible Error Details for debugging */}
            {this.state.error && (
              <details className="mt-6 text-left border-t border-gray-100 pt-4">
                <summary className="text-[11px] font-bold text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                  Technical Diagnostics
                </summary>
                <div className="mt-2 p-3 bg-gray-900 rounded-xl text-gray-200 text-[11px] font-mono overflow-auto max-h-40 leading-tight">
                  <p className="font-bold text-red-400">{this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-1 text-[10px] text-gray-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
