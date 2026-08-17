'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Get user details
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login'));
  }, [router, pathname]); // refresh on route changes

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Get active page title
  let pageTitle = 'Faculty Dashboard';
  if (pathname.includes('/my-courses')) {
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
    if (!name) return 'U';
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
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-grid-fill" viewBox="0 0 16 16">
          <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h-3A1.5 1.5 0 0 1 1 10.5v3A1.5 1.5 0 0 1 2.5 15h3A1.5 1.5 0 0 1 7 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
        </svg>
      )
    },
    {
      href: '/faculty/my-courses',
      label: 'My Courses',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-book-fill" viewBox="0 0 16 16">
          <path d="M8 1.783C7.015.746 5.617 0 4 0 2.361 0 1.28.875 1.28 2.22h2.72v11.56C4 13.78 4.985 14 6 14c1.617 0 3.015-.746 4-1.783c.985 1.037 2.383 1.783 4 1.783c1.015 0 2-.22 2.72-.72V2.22h-2.72c-.72-.495-1.705-.72-2.72-.72c-1.617 0-3.015.746-4 1.783z"/>
        </svg>
      )
    },
    {
      href: '/faculty/course-files',
      label: 'Course Files',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-folder-fill" viewBox="0 0 16 16">
          <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.542 5.084A1 1 0 0 0 0 6v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a1 1 0 0 0-.542-.894l-1.104-.55A2 2 0 0 0 12.828 4H9.828l-2-2H2a2 2 0 0 0-2 2v1h1.586l2-2h4.242z"/>
        </svg>
      )
    },
    {
      href: '/faculty/submissions',
      label: 'Submissions',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-send-fill" viewBox="0 0 16 16">
          <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"/>
        </svg>
      )
    },
    {
      href: '/faculty/profile',
      label: 'Profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-person-fill" viewBox="0 0 16 16">
          <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
        </svg>
      )
    }
  ];

  return (
    <div className="layout-wrapper">
      {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand text-center py-3 bg-white" style={{ borderBottom: '1px solid var(--ppsu-border)' }}>
          <img src="/PPSUNAACA+Logo.png" alt="PPSU Logo" style={{ height: '55px', objectFit: 'contain' }} />
          <div className="mt-1 fw-bold text-dark font-mono-ppsu" style={{ fontSize: '0.8rem' }}>Course Files Portal</div>
        </div>

        <nav className="sidebar-menu">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
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
          <div className="mb-2">
            <button
              onClick={handleLogout}
              className="btn btn-sm btn-outline-light border-0 w-100 d-flex align-items-center justify-content-center gap-2 py-2"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', fontSize: '0.8rem' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-box-arrow-right" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="main-content-wrapper">
        <header className="top-header">
          <div className="d-flex align-items-center gap-2">
            <button className="mobile-menu-toggle" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
              <span /><span /><span />
            </button>
            <div className="header-title-section">
            <h2 className="header-page-title">{pageTitle}</h2>
            </div>
          </div>

          <div className="header-user-profile">
            {user && (
              <div className="d-flex align-items-center gap-2">
                <div className="user-avatar-circle">
                  {getInitials(user.name)}
                </div>
                <div className="user-info-text d-none d-md-flex">
                  <span className="user-info-name">{user.name}</span>
                  <span className="user-info-role">{user.designation || 'Faculty'}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
