'use client';

import { useSidebarContext, SidebarMode } from '@/context/SidebarContext';
import { useState, useEffect, useCallback } from 'react';

export type { SidebarMode };

export function useSidebar() {
  try {
    const context = useSidebarContext();
    return context;
  } catch (e) {
    // Fallback if rendered outside SidebarProvider
    const [mode, setModeState] = useState<SidebarMode>('expanded');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
      try {
        const isCollapsedSaved = localStorage.getItem('ppsu_sidebar_collapsed');
        if (isCollapsedSaved !== null) {
          setModeState(isCollapsedSaved === 'true' ? 'collapsed' : 'expanded');
        }
      } catch (err) {}
    }, []);

    const setMode = useCallback((newMode: SidebarMode) => {
      setModeState(newMode);
      try {
        localStorage.setItem('ppsu_sidebar_collapsed', newMode === 'collapsed' ? 'true' : 'false');
      } catch (err) {}
    }, []);

    const toggleSidebar = useCallback(() => {
      setModeState((prev) => {
        const next: SidebarMode = prev === 'collapsed' ? 'expanded' : 'collapsed';
        try {
          localStorage.setItem('ppsu_sidebar_collapsed', next === 'collapsed' ? 'true' : 'false');
        } catch (err) {}
        return next;
      });
    }, []);

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
}
