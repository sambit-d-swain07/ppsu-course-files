'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/lib/useSidebar';

export interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: boolean;
  badgeCount?: number;
  isLocked?: boolean;
  onClickLocked?: () => void;
}

export interface AppShellProps {
  children: React.ReactNode;
  pageTitle: string;
  portalBadgeText: string;
  portalBadgeColor?: string;
  portalBadgeBg?: string;
  navLinks: NavLinkItem[];
  user?: any;
  userRoleBadge?: string;
  userRoleBadgeClass?: string;
  userAvatarClass?: string;
  userDefaultInitials?: string;
  subHeaderContent?: React.ReactNode;
  profileMenuItems?: Array<{
    href?: string;
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
    isDanger?: boolean;
  }>;
}

export default function AppShell({
  children,
  pageTitle,
  portalBadgeText,
  portalBadgeColor = '#FFA07A',
  portalBadgeBg = 'rgba(232, 84, 30, 0.25)',
  navLinks,
  user,
  userRoleBadge = 'Faculty',
  userRoleBadgeClass = 'badge-custom-approved',
  userAvatarClass = 'user-avatar-faculty',
  userDefaultInitials = 'P',
  subHeaderContent,
  profileMenuItems = [],
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode: sidebarMode, toggleSidebar, mobileOpen, setMobileOpen } = useSidebar();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return userDefaultInitials;
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const isCollapsed = sidebarMode === 'collapsed';
  const isHidden = sidebarMode === 'hidden';

  const sidebarClass = [
    'sidebar',
    isCollapsed ? 'sidebar-collapsed' : '',
    isHidden ? 'sidebar-hidden' : '',
    mobileOpen ? 'sidebar-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const mainClass = [
    'main-content-wrapper',
    isCollapsed ? 'content-collapsed' : '',
    isHidden ? 'content-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const headerClass = [
    'top-header',
    isCollapsed ? 'header-collapsed' : '',
    isHidden ? 'header-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="layout-wrapper">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Global Sidebar */}
      <aside className={sidebarClass}>
        <div className="sidebar-brand">
          <div className="sidebar-logo-box bg-white p-2 rounded-3 shadow-sm mb-2 d-flex align-items-center justify-content-center">
            <img
              src="/PPSUNAACA+Logo.png"
              alt="PPSU Logo"
              style={{
                height: isCollapsed ? '28px' : '44px',
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain',
                transition: 'all 0.25s ease',
              }}
            />
          </div>
          {!isCollapsed && (
            <>
              <div
                className="fw-bold text-white text-center sidebar-brand-text"
                style={{ fontSize: '0.9rem', letterSpacing: '0.3px' }}
              >
                Course Files Portal
              </div>
              <div
                className="badge rounded-pill mt-1 sidebar-badge"
                style={{
                  background: portalBadgeBg,
                  color: portalBadgeColor,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                }}
              >
                {portalBadgeText}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Menu */}
        <nav className="sidebar-menu">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/faculty/dashboard' && link.href !== '/coordinator/dashboard' && link.href !== '/admin/dashboard' && pathname.startsWith(link.href));

            if (link.isLocked) {
              return (
                <button
                  key={link.href}
                  type="button"
                  className="sidebar-nav-link text-muted opacity-75 border-0 w-100 text-start"
                  style={{ background: 'transparent', cursor: 'pointer' }}
                  data-tooltip={`${link.label} (Locked)`}
                  onClick={() => {
                    setMobileOpen(false);
                    if (link.onClickLocked) link.onClickLocked();
                  }}
                >
                  <span className="sidebar-nav-icon text-secondary">{link.icon}</span>
                  <span className="flex-grow-1 text-secondary sidebar-nav-text">{link.label}</span>
                  <span className="ms-auto sidebar-nav-text" title="Locked">
                    🔒
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                data-tooltip={link.label}
                onClick={() => setMobileOpen(false)}
              >
                <span className="sidebar-nav-icon">{link.icon}</span>
                <span className="flex-grow-1 sidebar-nav-text">{link.label}</span>
                {link.badge && link.badgeCount ? (
                  <span
                    className="badge rounded-pill bg-danger px-2 sidebar-nav-text"
                    style={{ fontSize: '0.68rem' }}
                  >
                    {link.badgeCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-2 text-white border-0"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', fontSize: '0.825rem', fontWeight: 500 }}
            data-tooltip="Sign Out"
            title="Sign Out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="sidebar-footer-text">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Layout Container */}
      <div className={mainClass}>
        {/* Top Header */}
        <header className={headerClass}>
          <div className="d-flex align-items-center gap-3">
            {/* Desktop Sidebar Toggle Button */}
            <button
              type="button"
              className="d-none d-md-flex btn btn-sm align-items-center justify-content-center p-0 sidebar-toggle-btn"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '1px solid var(--ppsu-border)',
                background: '#ffffff',
                color: 'var(--ppsu-navy-900)',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              aria-label={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              aria-expanded={!isCollapsed}
              onClick={toggleSidebar}
            >
              {isCollapsed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>

            {/* Mobile Sidebar Toggle Button */}
            <button
              type="button"
              className="mobile-menu-toggle d-md-none"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>

            <div className="header-title-section">
              <h2 className="header-page-title mb-0">{pageTitle}</h2>
            </div>
          </div>

          {/* User Profile Dropdown */}
          <div className="profile-dropdown-wrapper" ref={dropdownRef}>
            {user && (
              <>
                <button
                  type="button"
                  className="profile-trigger-btn"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  aria-expanded={profileDropdownOpen}
                >
                  <div className={`user-avatar-badge ${userAvatarClass}`}>
                    {getInitials(user.name)}
                  </div>
                  <div className="user-info-text d-none d-md-flex text-start">
                    <span className="user-info-name">{user.name}</span>
                    <span className="user-info-role">{user.designation || userRoleBadge}</span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="text-secondary ms-1"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {profileDropdownOpen && (
                  <div className="profile-menu-popover shadow-lg">
                    <div className="px-3 py-2 border-bottom mb-1">
                      <div className="fw-bold text-navy-900 small">{user.name}</div>
                      <div className="text-muted font-mono-ppsu" style={{ fontSize: '0.725rem' }}>
                        {user.email}
                      </div>
                      <div className="mt-1 d-flex gap-1 flex-wrap">
                        <span className={`badge-custom ${userRoleBadgeClass}`} style={{ fontSize: '0.65rem' }}>
                          {userRoleBadge}
                        </span>
                      </div>
                    </div>

                    {profileMenuItems.map((item, idx) => {
                      if (item.href) {
                        return (
                          <Link
                            key={idx}
                            href={item.href}
                            prefetch={false}
                            className={`profile-menu-item ${item.isDanger ? 'logout text-danger' : ''}`}
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              if (item.onClick) item.onClick();
                            }}
                          >
                            {item.icon}
                            {item.label}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`profile-menu-item ${item.isDanger ? 'logout text-danger' : ''}`}
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            if (item.onClick) item.onClick();
                          }}
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      );
                    })}

                    <div className="border-top my-1" />

                    <button
                      type="button"
                      className="profile-menu-item logout text-danger"
                      onClick={handleLogout}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </header>

        {/* Optional Subheader (e.g., Active Role Switcher Tab Bar) */}
        {subHeaderContent}

        {/* Page Main Content */}
        <main className="page-container">{children}</main>
      </div>
    </div>
  );
}
