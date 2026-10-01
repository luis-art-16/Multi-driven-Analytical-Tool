/**
 * ============================================================================
 * Module: Pipeline State Management (pipelineStore.ts)
 * Description: 
 * The central nervous system of the Multi-Driven methodology. Uses Zustand 
 * to maintain the global state of the pipeline (steps locked/unlocked) and 
 * the persistent data models generated at each stage. Implements complex 
 * invalidation logic (`invalidateFrom`) to ensure that altering an upstream 
 * model correctly resets dependent downstream artifacts while preserving 
 * parallel independent pathways.
 * ============================================================================
 */

import { create } from 'zustand';

export interface PipelineState {
  steps: {
    ddcm: 'locked' | 'unlocked' | 'completed';
    rsr: 'locked' | 'unlocked' | 'completed';
    ddam: 'locked' | 'unlocked' | 'completed';
    rdam: 'locked' | 'unlocked' | 'completed';
    mdam: 'locked' | 'unlocked' | 'completed';
    av: 'locked' | 'unlocked' | 'completed';
    vo: 'locked' | 'unlocked' | 'completed';
  };
  sharedData: {
    derJson?: any;
    istarModel?: any;
    ddamDw?: any;
    rdamDw?: any;
    mdamDw?: any;
    avModel?: any;
    voModel?: any;
    // Temporary compatibility fallbacks in case the frontend uses the wrong naming convention:
    avData?: any;
    voData?: any;
  };
  completeStep: (stepId: string, data?: any) => void;
  invalidateFrom: (stepId: string) => void;
  resetPipeline: () => void;
  setFullState: (steps: any, sharedData: any) => void;
}

const initialSteps = {
  ddcm: 'unlocked' as const,
  rsr: 'unlocked' as const,
  ddam: 'locked' as const,
  rdam: 'locked' as const,
  mdam: 'locked' as const,
  av: 'locked' as const,
  vo: 'locked' as const,
};

export const usePipelineStore = create<PipelineState>((set) => ({
  steps: initialSteps,
  sharedData: {},

  completeStep: (stepId, data) => set((state) => {
    const newSteps = { ...state.steps };
    const newSharedData = { ...state.sharedData };

    // Marks the current step as completed
    newSteps[stepId as keyof typeof newSteps] = 'completed';

    if (stepId === 'ddcm') {
      newSharedData.derJson = data;
      if (newSteps.ddam !== 'completed') newSteps.ddam = 'unlocked';
    }
    if (stepId === 'rsr') {
      newSharedData.istarModel = data;
      if (newSteps.rdam !== 'completed') newSteps.rdam = 'unlocked';
    }
    if (stepId === 'ddam') {
      newSharedData.ddamDw = data;
      // The MDAM only opens if both lanes are green!
      if (newSteps.rdam === 'completed' && newSteps.mdam !== 'completed') newSteps.mdam = 'unlocked';
    }
    if (stepId === 'rdam') {
      newSharedData.rdamDw = data;
      if (newSteps.ddam === 'completed' && newSteps.mdam !== 'completed') newSteps.mdam = 'unlocked';
    }
    if (stepId === 'mdam') {
      newSharedData.mdamDw = data;
      if (newSteps.av !== 'completed') newSteps.av = 'unlocked';
    }
    if (stepId === 'av') {
      newSharedData.avModel = data;
      // Compatibility
      newSharedData.avData = data; 
      if (newSteps.vo !== 'completed') newSteps.vo = 'unlocked';
    }
    if (stepId === 'vo') {
      newSharedData.voModel = data;
      newSharedData.voData = data;
    }

    return { steps: newSteps, sharedData: newSharedData };
  }),

  // Invalidation logic: when a step is modified, all dependent downstream steps are reset to 'locked' and their data cleared. This ensures that the pipeline remains consistent and prevents the use of outdated or incompatible models.
  invalidateFrom: (stepId) => set((state) => {
    const newSteps = { ...state.steps };
    const newData = { ...state.sharedData };

    // Function that locks and deletes data ONLY for the specified steps
    const reset = (id: keyof typeof newSteps) => {
      newSteps[id] = 'locked';
      if (id === 'ddam') delete newData.ddamDw;
      if (id === 'rdam') delete newData.rdamDw;
      if (id === 'mdam') delete newData.mdamDw;
      if (id === 'av') { delete newData.avModel; delete newData.avData; }
      if (id === 'vo') { delete newData.voModel; delete newData.voData; }
    };

    if (stepId === 'ddcm') {
      // Modify the database and delete everything ahead
      reset('ddam'); reset('rdam'); reset('mdam'); reset('av'); reset('vo');
      newSteps.ddam = 'unlocked';
    } else if (stepId === 'rsr') {
      // Modify the requirements and affect the RDAM, BUT LEAVE THE DDAM INTACT!
      reset('rdam'); reset('mdam'); reset('av'); reset('vo');
      if (newSteps.ddcm === 'completed') newSteps.rdam = 'unlocked';
    } else if (stepId === 'ddam') {
      // Modify the DDAM and affect the fusion (MDAM), BUT LEAVE THE RDAM INTACT!
      reset('mdam'); reset('av'); reset('vo');
    } else if (stepId === 'rdam') {
      // Modify the RDAM and affect the fusion (MDAM), BUT LEAVE THE DDAM INTACT!
      reset('mdam'); reset('av'); reset('vo');
    } else if (stepId === 'mdam') {
      reset('av'); reset('vo');
    } else if (stepId === 'av') {
      reset('vo');
    }

    return { steps: newSteps, sharedData: newData };
  }),

  resetPipeline: () => set({ steps: initialSteps, sharedData: {} }),
  setFullState: (steps, sharedData) => set({ steps, sharedData })
}));