'use client';

import { useState, useEffect, useCallback } from 'react';

export type SidebarMode = 'expanded' | 'collapsed' | 'hidden';

export function useSidebar() {
  const [mode, setModeState] = useState<SidebarMode>('expanded');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const isCollapsedSaved = localStorage.getItem('courseCoordinator_sidebar_collapsed');
      if (isCollapsedSaved !== null) {
        setModeState(isCollapsedSaved === 'true' ? 'collapsed' : 'expanded');
      } else {
        const legacy = localStorage.getItem('ppsu_sidebar_mode') as SidebarMode;
        if (legacy && ['expanded', 'collapsed', 'hidden'].includes(legacy)) {
          setModeState(legacy);
        }
      }
    } catch (e) {}
  }, []);

  const setMode = useCallback((newMode: SidebarMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('courseCoordinator_sidebar_collapsed', newMode === 'collapsed' ? 'true' : 'false');
      localStorage.setItem('ppsu_sidebar_mode', newMode);
    } catch (e) {}
  }, []);

  const toggleSidebar = useCallback(() => {
    setModeState((prev) => {
      const next: SidebarMode = prev === 'collapsed' ? 'expanded' : 'collapsed';
      try {
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
        // Prevent default browser bookmark shortcut if needed
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return {
    mode,
    isCollapsed: mode === 'collapsed',
    setMode,
    toggleSidebar,
    mobileOpen,
    setMobileOpen,
    mounted,
  };
}
