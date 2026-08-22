'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Modal, Button } from 'react-bootstrap';

const TAB_STORAGE_KEY = 'ppsu_active_role_tab';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAlsoCoordinator, setIsAlsoCoordinator] = useState(false);
  const [isCoordinatorAssigned, setIsCoordinatorAssigned] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) { router.push('/login'); return; }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          if (data.user.role === 'COORDINATOR') {
            setIsAlsoCoordinator(true);
          }
        }
      })
      .catch(() => router.push('/login'));

    // Check if logged in faculty is a Course Coordinator on any subject
    fetch('/api/coordinator/shared-documents')
      .then((res) => (res.ok ? res.json() : { subjects: [] }))
      .then((data) => {
        if (Array.isArray(data.subjects) && data.subjects.length > 0) {
          setIsCoordinatorAssigned(true);
        }
      })
      .catch(() => {});
  }, [router, pathname]);

  const switchToCoordinator = () => {
    try { sessionStorage.setItem(TAB_STORAGE_KEY, 'coordinator'); } catch { /**/ }
    router.push('/coordinator/dashboard');
  };

  // Click outside to close profile dropdown
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

  let pageTitle = 'Faculty Dashboard';
  if (pathname.includes('/course-coordinator')) {
    pageTitle = 'Course Coordinator Hub';
  } else if (pathname.includes('/my-courses')) {
    pageTitle = 'My Courses';
  } else if (/\/faculty\/course-files\/[a-zA-Z0-9-]+/.test(pathname)) {
    pageTitle = 'Course File Checklist Detail';
  } else if (pathname.includes('/course-files')) {
    pageTitle = 'Course Files';
  } else if (pathname.includes('/submissions')) {
    pageTitle = 'Submissions';
  } else if (pathname.includes('/profile')) {
    pageTitle = 'My Profile';
  }

  const getInitials = (name: string) => {
    if (!name) return 'F';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const navLinks = [
    {
      href: '/faculty/dashboard',
      label: 'Dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      href: '/faculty/my-courses',
      label: 'My Courses',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      href: '/faculty/course-coordinator',
      label: 'Course Coordinator',
      isLocked: !isCoordinatorAssigned,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      href: '/faculty/course-files',
      label: 'Course Files',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    },
    {
      href: '/faculty/submissions',
      label: 'Submissions',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      href: '/faculty/profile',
      label: 'Profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <div className="layout-wrapper">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="bg-white p-2 rounded-3 shadow-sm mb-2 d-inline-block">
            <img src="/PPSUNAACA+Logo.png" alt="PPSU Logo" style={{ height: '44px', objectFit: 'contain' }} />
          </div>
          <div className="fw-bold text-white text-center" style={{ fontSize: '0.9rem', letterSpacing: '0.3px' }}>Course Files Portal</div>
          <div className="badge rounded-pill mt-1" style={{ background: 'rgba(232, 84, 30, 0.25)', color: '#FFA07A', fontSize: '0.68rem', fontWeight: 600 }}>
            Faculty Portal
          </div>
        </div>

        <nav className="sidebar-menu">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            if (link.isLocked) {
              return (
                <button
                  key={link.href}
                  type="button"
                  className="sidebar-nav-link text-muted opacity-75 border-0 w-100 text-start"
                  style={{ background: 'transparent', cursor: 'pointer' }}
                  onClick={() => { setSidebarOpen(false); setShowLockedModal(true); }}
                >
                  <span className="sidebar-nav-icon text-secondary">{link.icon}</span>
                  <span className="flex-grow-1 text-secondary">{link.label}</span>
                  <span className="ms-auto" title="Locked — Not assigned as Course Coordinator">🔒</span>
                </button>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sidebar-nav-icon">{link.icon}</span>
                <span className="flex-grow-1">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-2 text-white border-0"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', fontSize: '0.825rem', fontWeight: 500 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="main-content-wrapper">
        <header className="top-header">
          <div className="d-flex align-items-center gap-3">
            <button className="mobile-menu-toggle" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
              <span /><span /><span />
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
                  <div className="user-avatar-badge user-avatar-faculty">
                    {getInitials(user.name)}
                  </div>
                  <div className="user-info-text d-none d-md-flex text-start">
                    <span className="user-info-name">{user.name}</span>
                    <span className="user-info-role">{user.designation || 'Faculty'}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-secondary ms-1">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {profileDropdownOpen && (
                  <div className="profile-menu-popover shadow-lg">
                    <div className="px-3 py-2 border-bottom mb-1">
                      <div className="fw-bold text-navy-900 small">{user.name}</div>
                      <div className="text-muted font-mono-ppsu" style={{ fontSize: '0.725rem' }}>{user.email}</div>
                      <div className="mt-1 d-flex gap-1 flex-wrap">
                        <span className="badge-custom badge-custom-approved" style={{ fontSize: '0.65rem' }}>Faculty</span>
                        {isCoordinatorAssigned && (
                          <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>Course Coordinator</span>
                        )}
                      </div>
                    </div>

                    <Link href="/faculty/profile" prefetch={false} className="profile-menu-item" onClick={() => setProfileDropdownOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>
                    <Link href="/faculty/my-courses" prefetch={false} className="profile-menu-item" onClick={() => setProfileDropdownOpen(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      My Courses
                    </Link>

                    <div className="border-top my-1" />

                    <button type="button" className="profile-menu-item logout text-danger" onClick={handleLogout}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </header>

        {/* Tab bar for dual-role users coming from coordinator layout */}
        {isAlsoCoordinator && (
          <div
            style={{
              background: 'var(--ppsu-primary)',
              borderBottom: '2px solid rgba(255,255,255,0.08)',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Active Role:
            </span>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 4, gap: 4 }}>
              <button
                onClick={switchToCoordinator}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 18px', border: 'none', borderRadius: 7,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: 'transparent', color: 'rgba(255,255,255,0.55)',
                  transition: 'all 0.22s ease', whiteSpace: 'nowrap'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Course Coordinator
              </button>
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 18px', border: 'none', borderRadius: 7,
                  fontSize: 13, fontWeight: 700, cursor: 'default',
                  background: '#10b981', color: '#fff',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
                  whiteSpace: 'nowrap'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                My Courses
              </button>
            </div>
            <span style={{
              marginLeft: 'auto',
              background: 'rgba(16,185,129,0.15)', color: '#6EE7B7',
              borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600
            }}>
              📚 Managing your own teaching subjects
            </span>
          </div>
        )}

        <main className="page-container">
          {children}
        </main>
      </div>

      {/* Locked Access Modal for Faculty who are not Course Coordinators */}
      <Modal show={showLockedModal} onHide={() => setShowLockedModal(false)} centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title className="h6 fw-bold mb-0 text-navy-900">
            🔒 Course Coordinator Access Restricted
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4 px-4">
          <div className="mb-3" style={{ fontSize: 44 }}>🔒</div>
          <h6 className="fw-bold text-dark mb-2">Not Assigned as Course Coordinator</h6>
          <p className="text-secondary small mb-0 leading-normal" style={{ maxWidth: 360, margin: '0 auto' }}>
            You are not currently assigned as a Course Coordinator for any subject. Contact your Admin if you believe this is incorrect.
          </p>
        </Modal.Body>
        <Modal.Footer className="bg-light border-top justify-content-center py-2">
          <Button variant="primary" size="sm" className="px-4 fw-semibold" onClick={() => setShowLockedModal(false)}>
            Understood
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
