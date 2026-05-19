import React from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-[#080808]">
          <p className="text-white/20 text-xs uppercase tracking-widest">something crashed</p>
          <pre className="text-red-400 text-xs bg-white/[0.04] rounded-xl p-4 max-w-xl overflow-x-auto border border-white/[0.07]">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-xs text-white/40 hover:text-white border border-white/[0.1] rounded-xl px-4 py-2 transition-colors"
          >
            retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
