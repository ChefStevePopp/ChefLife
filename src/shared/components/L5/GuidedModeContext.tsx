import React, { createContext, useContext, useState, useEffect } from "react";
import { GraduationCap } from "lucide-react";

/**
 * =============================================================================
 * GUIDED MODE CONTEXT
 * =============================================================================
 * Provides guided mode state throughout the component tree.
 * Persists preference to localStorage.
 * 
 * Usage:
 *   <GuidedModeProvider>
 *     <YourComponent />
 *   </GuidedModeProvider>
 * 
 * Then in any child:
 *   const { isGuided, setIsGuided } = useGuidedMode();
 * =============================================================================
 */

const STORAGE_KEY = "cheflife-guided-mode";

interface GuidedModeContextType {
  isGuided: boolean;
  setIsGuided: (v: boolean) => void;
}

const GuidedModeContext = createContext<GuidedModeContextType>({
  isGuided: false,
  setIsGuided: () => {},
});

export const useGuidedMode = () => useContext(GuidedModeContext);

interface GuidedModeProviderProps {
  children: React.ReactNode;
  defaultEnabled?: boolean;
}

export const GuidedModeProvider: React.FC<GuidedModeProviderProps> = ({
  children,
  defaultEnabled = false,
}) => {
  const [isGuided, setIsGuided] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === "true" : defaultEnabled;
    } catch {
      return defaultEnabled;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, isGuided.toString());
    } catch (e) {
      console.warn("Failed to persist guided mode preference:", e);
    }
  }, [isGuided]);

  return (
    <GuidedModeContext.Provider value={{ isGuided, setIsGuided }}>
      {children}
    </GuidedModeContext.Provider>
  );
};

/**
 * =============================================================================
 * GUIDED MODE TOGGLE BUTTON
 * =============================================================================
 * A compact toggle for switching guided mode on/off.
 * Place this in headers or toolbars.
 * =============================================================================
 */

export const GuidedModeToggle: React.FC = () => {
  const { isGuided, setIsGuided } = useGuidedMode();

  return (
    <button
      onClick={() => setIsGuided(!isGuided)}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        isGuided
          ? "bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-lg shadow-primary-500/10"
          : "bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:text-gray-400 hover:border-gray-600"
      }`}
      title={isGuided ? "Guided mode: ON" : "Guided mode: OFF"}
    >
      <GraduationCap className="w-3.5 h-3.5" />
      <span>{isGuided ? "Guided" : "Guide"}</span>
    </button>
  );
};

export default GuidedModeContext;
