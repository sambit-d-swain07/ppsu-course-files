'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SidebarMode = 'expanded' | 'collapsed' | 'hidden';

interface SidebarContextType {
  mode: SidebarMode;
  isCollapsed: boolean;
  setMode: (mode: SidebarMode) => void;
  toggleSidebar: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  mounted: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'ppsu_sidebar_collapsed';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<SidebarMode>('expanded');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setModeState(saved === 'true' ? 'collapsed' : 'expanded');
      } else {
        const coordSaved = localStorage.getItem('courseCoordinator_sidebar_collapsed');
        if (coordSaved !== null) {
          setModeState(coordSaved === 'true' ? 'collapsed' : 'expanded');
        } else {
          const legacy = localStorage.getItem('ppsu_sidebar_mode') as SidebarMode;
          if (legacy && ['expanded', 'collapsed', 'hidden'].includes(legacy)) {
            setModeState(legacy);
          }
        }
      }
    } catch (e) {}
  }, []);

  const setMode = useCallback((newMode: SidebarMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode === 'collapsed' ? 'true' : 'false');
      localStorage.setItem('courseCoordinator_sidebar_collapsed', newMode === 'collapsed' ? 'true' : 'false');
      localStorage.setItem('ppsu_sidebar_mode', newMode);
    } catch (e) {}
  }, []);

  const toggleSidebar = useCallback(() => {
    setModeState((prev) => {
      const next: SidebarMode = prev === 'collapsed' ? 'expanded' : 'collapsed';
      try {
        localStorage.setItem(STORAGE_KEY, next === 'collapsed' ? 'true' : 'false');
        localStorage.setItem('courseCoordinator_sidebar_collapsed', next === 'collapsed' ? 'true' : 'false');
        localStorage.setItem('ppsu_sidebar_mode', next);
      } catch (e) {}
      return next;
    });
  }, []);

  // Keyboard shortcut listener for Ctrl+B / Cmd+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return (
    <SidebarContext.Provider
      value={{
        mode,
        isCollapsed: mode === 'collapsed',
        setMode,
        toggleSidebar,
        mobileOpen,
        setMobileOpen,
        mounted,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}
