/**
 * ============================================================================
 * Module: Application Entry Point & Router (App.tsx)
 * ============================================================================
 */

import React, { Component, ReactNode, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PipelinePage } from './pages/PipelinePage';
import { useAuthStore } from './store/authStore';

// Global Error Boundary
class GlobalErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, errorMsg: string, stack: string}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMsg: '', stack: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message, stack: error.stack || '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Pipeline Fatal Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-2xl border border-red-100 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
               <span className="text-red-500 text-2xl font-bold">!</span>
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Error Rendering Layout</h1>
            <p className="text-slate-600 mb-6 text-sm">
              The historical project that attempted to load contains outdated data formats that caused the screen to collapse.
            </p>
            
            <div className="bg-slate-100 p-4 rounded-lg text-xs text-left font-mono text-slate-500 overflow-auto w-full mb-6 max-h-48 whitespace-pre-wrap">
              <strong>Error:</strong> {this.state.errorMsg}<br/><br/>
              <strong>Stack Trace:</strong><br/>{this.state.stack}
            </div>

            <button 
              onClick={() => {
                localStorage.clear(); // Clear local storage to reset the application state
                window.location.href = '/pipeline';
              }} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg"
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

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { name: 'Multi-driven Analytical Tool Admin', email: 'admin@Multi_drivenAnalyticalTool.pt' },
    });
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  return (
    <GlobalErrorBoundary>
      <Routes>
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="*" element={<Navigate to="/pipeline" replace />} />
      </Routes>
    </GlobalErrorBoundary>
  );
}