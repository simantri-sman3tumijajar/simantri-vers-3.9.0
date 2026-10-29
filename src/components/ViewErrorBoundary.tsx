import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  viewName: string;
  onResetViewData?: () => void;
  onGoHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ViewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ViewErrorBoundary - ${this.props.viewName}]:`, error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-xl space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-black text-slate-900">
                Terjadi Kendala Memuat Menu {this.props.viewName}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                Sistem mengamankan tampilan agar tidak terjadi layar putih (blank). Seluruh data Anda tetap tersimpan aman di Cloud SMANTRI.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-mono text-slate-700 text-left overflow-x-auto max-h-32">
                <span className="font-bold text-rose-600 block mb-0.5">Detail Kendala:</span>
                {this.state.error.name}: {this.state.error.message}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Muat Ulang</span>
              </button>

              {this.props.onResetViewData && (
                <button
                  type="button"
                  onClick={() => {
                    this.props.onResetViewData?.();
                    this.handleReload();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Data Menu Ini</span>
                </button>
              )}

              {this.props.onGoHome && (
                <button
                  type="button"
                  onClick={this.props.onGoHome}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Kembali ke Beranda</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
