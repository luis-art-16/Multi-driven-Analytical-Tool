/**
 * ============================================================================
 * Component: Navigation & Confirmation Modal (ConfirmModal.tsx)
 * Description: 
 * Intercepts backwards navigation within the methodology pipeline. 
 * Displays a warning modal to prevent accidental data loss, ensuring 
 * the user is aware that refining previous steps will invalidate 
 * subsequent AI-generated models to maintain pipeline consistency.
 * ============================================================================
 */

import React, { useState } from 'react';
import { usePipelineStore } from '../store/pipelineStore';

export function Navigation() {
  const { currentStep, navigateTo, steps } = usePipelineStore();
  const [pendingStep, setPendingStep] = useState<string | null>(null);

  const handleNavClick = (targetStep: string) => {
    const isGoingBack = steps.findIndex(s => s.id === targetStep) < steps.findIndex(s => s.id === currentStep);
    
    if (isGoingBack) {
      setPendingStep(targetStep); // Triggers the modal
    } else {
      navigateTo(targetStep);
    }
  };

  const confirmNavigation = () => {
    if (pendingStep) {
      // invalidateFrom(pendingStep) should be managed by the store or called here before navigating
      navigateTo(pendingStep);
      setPendingStep(null);
    }
  };

  return (
    <>
      {/* Navigation Buttons (Adjust CSS according to the parallel layout) */}
      
      {/* Confirmation Modal */}
      {pendingStep && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full">
            <h3 className="text-lg font-bold text-red-600 mb-2">Warning: Data Reset</h3>
            <p className="text-slate-600 text-sm mb-6">
              If you refine stage <strong>{pendingStep.toUpperCase()}</strong>, all subsequent stages will be updated and their current configurations will be reset. Do you wish to proceed?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPendingStep(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={confirmNavigation} className="px-4 py-2 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors">Proceed and Reset</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}