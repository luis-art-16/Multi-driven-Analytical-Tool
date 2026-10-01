/**
 * ============================================================================
 * Module: Authentication Store (authStore.ts)
 * Description: 
 * Manages the user session state using Zustand. In this prototype version, 
 * authentication constraints are bypassed, providing a default administrator 
 * context ("admin@Multi_drivenAnalyticalTool.pt") to facilitate uninterrupted evaluation 
 * of the main analytical pipeline methodology.
 * ============================================================================
 */

import { create } from 'zustand';

interface AuthState {
  user: { name: string; email: string } | null;
  isAuthenticated: boolean;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Sets the default user for prototyping and history purposes
  user: { name: "Multi-driven Analytical Tool Admin", email: "admin@Multi-drivenAnalyticalTool.pt" },
  isAuthenticated: true,

  logout: () => {
    // In a real login system, this would clear the LocalStorage and the state
    set({ user: null, isAuthenticated: false });
    // Since this is a prototype, we reinject the Admin after the page refresh
    window.location.reload(); 
  },

  restoreSession: async () => {
    // Ensures that the platform always has an active user
    set({ 
      user: { name: "Multi-driven Analytical Tool Admin", email: "admin@Multi-drivenAnalyticalTool.pt" }, 
      isAuthenticated: true 
    });
  }
}));