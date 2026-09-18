'use client';

import { useState, useEffect } from 'react';

export type SidebarMode = 'expanded' | 'collapsed' | 'hidden';

export function useSidebar() {
  const [mode, setMode] = useState<SidebarMode>('expanded');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('ppsu_sidebar_mode') as SidebarMode;
      if (saved && ['expanded', 'collapsed', 'hidden'].includes(saved)) {
        setMode(saved);
      }
    } catch (e) {}
  }, []);

  const changeMode = (newMode: SidebarMode) => {
    setMode(newMode);
    try {
      localStorage.setItem('ppsu_sidebar_mode', newMode);
    } catch (e) {}
  };

  const toggleSidebar = () => {
    let next: SidebarMode = 'expanded';
    if (mode === 'expanded') next = 'collapsed';
    else if (mode === 'collapsed') next = 'hidden';
    else if (mode === 'hidden') next = 'expanded';
    changeMode(next);
  };

  return {
    mode,
    setMode: changeMode,
    toggleSidebar,
    mobileOpen,
    setMobileOpen,
    mounted,
  };
}
