/**
 * ============================================================================
 * Module: React DOM Entry Point (main.tsx)
 * ============================================================================
 */

import React, { ErrorInfo, Component, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

// Global Error Boundary
class GlobalErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, errorMsg: string}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Pipeline Fatal Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg border border-red-100 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Rendering Layout</h1>
            <p className="text-slate-600 mb-6">
              The historical project that attempted to load contains outdated data formats that are no longer supported by the current architecture.
              Please create a new project.
            </p>
            <div className="bg-slate-100 p-4 rounded text-xs text-left font-mono text-slate-500 overflow-auto mb-6 max-h-32">
              {this.state.errorMsg}
            </div>
            <button 
              onClick={() => window.location.href = '/pipeline'} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition"
            >
              Top Up Platform
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)